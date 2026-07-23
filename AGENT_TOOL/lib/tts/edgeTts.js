import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Offset/Duration mà Microsoft Edge TTS trả về trong metadata WordBoundary dùng đơn vị "tick"
// kiểu Windows/.NET (100 nano-giây/tick) — quy đổi sang giây bằng cách chia 10 triệu, giống hệt
// cách deriveWordTimings() ở voiceover/route.js quy đổi mốc thời gian ký tự của ElevenLabs.
const TICKS_PER_SECOND = 1e7;

// Tốc độ đọc -> tham số "rate" dạng phần trăm mà Edge TTS hiểu (vd "-20%", "+20%"). Cùng 3 mức
// slow/medium/fast đang dùng cho ElevenLabs (xem READING_SPEED_TO_ELEVENLABS ở voiceover/route.js)
// để 2 nhà cung cấp cho trải nghiệm tương đương khi đổi qua lại.
const READING_SPEED_TO_EDGE_RATE = { slow: '-20%', medium: '+0%', fast: '+20%' };

// Kết nối WebSocket tới dịch vụ Edge TTS của Microsoft (miễn phí, không chính thức) thỉnh thoảng
// bị đóng sớm trước khi nhận "turn.end" — lỗi thoáng qua phía server Microsoft (quá tải/giới hạn
// tốc độ ngầm), không liên quan tới nội dung text hay giọng đã chọn. Trước đây gặp 1 lần lỗi này
// giữa video nhiều slide (vd Bước 2 gọi tuần tự cho từng slide) sẽ làm hỏng NGAY TOÀN BỘ tiến
// trình lồng tiếng dù các slide trước/sau vẫn tổng hợp bình thường. Thử lại vài lần trước khi
// báo lỗi thật cho người dùng.
const MAX_ATTEMPTS = 3;
const TRANSIENT_ERROR_RE = /Stream closed before the synthesis completed|WebSocket error|ECONNRESET|ETIMEDOUT|EPIPE|EdgeTTS attempt timed out/i;

// Khi Microsoft đang giới hạn tốc độ ngầm (sau nhiều kết nối liên tiếp quá nhanh), 1 lần thử có
// thể "treo" — kết nối mở nhưng không bao giờ nhận thêm dữ liệu lẫn sự kiện đóng/lỗi nào — khiến
// synthesizeEdgeTtsOnce() chờ vô thời hạn, cả request lồng tiếng của người dùng bị treo theo mà
// không có thông báo lỗi rõ ràng nào cả. Đặt trần thời gian cho MỖI lần thử để luôn thất bại rõ
// ràng (rồi thử lại/báo lỗi) thay vì treo mãi.
const ATTEMPT_TIMEOUT_MS = 20000;

// Escape các ký tự đặc biệt XML trong phần lời đọc thật trước khi chèn vào SSML tự dựng bên dưới.
function escapeSsmlText(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// [tag] mở đầu narration (do Gemini tự chèn, xem imageSlideshow.js/moralTalkSlideshow.js) trước
// đây bị XOÁ HOÀN TOÀN trước khi gửi tới Edge TTS (chỉ dùng để tránh ElevenLabs đọc ra thành lời)
// — nghĩa là mọi gợi ý cảm xúc Gemini đã cẩn thận viết ra đều bị bỏ phí, giọng đọc miễn phí luôn
// đọc đều đều 1 tông từ đầu tới cuối. Giờ chuyển tag sắc thái thành điều chỉnh cao độ/âm lượng
// <prosody> cho cả câu đó.
//
// QUAN TRỌNG — đã kiểm chứng thực tế bằng debug logger: dịch vụ Read Aloud miễn phí này (khác
// endpoint Azure Cognitive Services trả phí đầy đủ) đóng kết nối ngay khi nhận SSML chứa thẻ
// <break> (mọi biến thể: tự đóng, không tự đóng, dùng time hay strength đều bị) HOẶC <prosody>
// lồng trong <prosody> — cả 2 đều khiến toàn bộ synthesis thất bại ngay lập tức (không phải lỗi
// tạm thời, lặp lại 100% mỗi lần). Vì vậy: (1) không dùng <break> ở đây — tag ngắt hơi ([pause]/
// [sighs]/[gasp]) chỉ có thể mô phỏng bằng dấu "..." ở đầu câu (khiến giọng đọc tự ngắt lâu hơn
// một chút theo ngữ điệu tự nhiên, không phải ngắt SSML thật); (2) không nested — rate (theo tốc
// độ đọc đã chọn) và pitch/volume (theo tag sắc thái) phải gộp chung vào ĐÚNG 1 thẻ <prosody>
// duy nhất, dựng thủ công cả khối SSML rồi gửi qua rawToStream() thay vì toStream() (vốn luôn tự
// bọc thêm 1 lớp <prosody> ngoài, gây nested ngoài ý muốn).
const PAUSE_TAGS = new Set(['pause', 'sighs', 'gasp']);
const MOOD_TAG_PROSODY = {
  softly: { pitch: '-4%', volume: 'soft' },
  gently: { pitch: '-2%', volume: 'soft' },
  warmly: { pitch: '+3%' },
  whispering: { pitch: '-6%', volume: 'x-soft' },
};

function splitLeadingTag(rawText) {
  const leadingTagMatch = /^\s*\[([^\]]+)\]\s*/.exec(rawText);
  if (!leadingTagMatch) {
    return { body: rawText, pausePrefix: '', moodAttrs: null };
  }
  const tag = leadingTagMatch[1].toLowerCase().trim();
  const body = rawText.slice(leadingTagMatch[0].length);
  if (PAUSE_TAGS.has(tag)) {
    return { body, pausePrefix: '... ', moodAttrs: null };
  }
  // Tag không nhận diện được (Gemini đôi khi tự sáng tạo tag lạ) -> chỉ bỏ tag, đọc bình
  // thường, không áp prosody gì thêm — an toàn hơn là đoán sai.
  return { body, pausePrefix: '', moodAttrs: MOOD_TAG_PROSODY[tag] || null };
}

// Dựng nguyên khối SSML <speak>/<voice>/<prosody> thủ công (không dùng toStream() của thư viện,
// vì nó luôn tự bọc thêm 1 lớp <prosody> ngoài — xem lý do nested ở trên) — gộp rate (tốc độ đọc)
// và pitch/volume (sắc thái theo tag) vào ĐÚNG 1 thẻ <prosody> duy nhất.
function buildSsml({ text, voice, rate }) {
  const localeMatch = /\w{2}-\w{2}/.exec(voice);
  const locale = localeMatch ? localeMatch[0] : 'en-US';
  const { body, pausePrefix, moodAttrs } = splitLeadingTag(text);
  const escapedBody = pausePrefix + escapeSsmlText(body);

  const prosodyAttrs = { rate, ...(moodAttrs || {}) };
  const attrStr = Object.entries(prosodyAttrs).map(([k, v]) => `${k}="${v}"`).join(' ');

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">
    <voice name="${voice}">
      <prosody ${attrStr}>${escapedBody}</prosody>
    </voice>
  </speak>`;
}

async function synthesizeEdgeTtsOnce({ text, voice, rate }) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });

  const { audioStream, metadataStream } = tts.rawToStream(buildSsml({ text, voice, rate }));

  const audioChunks = [];
  const wordTimings = [];

  // Đăng ký listener 'data' của metadataStream ĐỘC LẬP, không chờ nó phát 'end' — thư viện
  // msedge-tts chỉ push(null) (kết thúc bình thường) lên audioStream khi nhận được turn.end;
  // metadataStream không bao giờ tự kết thúc kiểu đó, nó chỉ bị .destroy() NGAY SAU KHI
  // audioStream đóng (xem _rawSSMLRequest trong thư viện: audioStream.once("close", () =>
  // metadataStream?.destroy())) — nên sự kiện 'end' của metadataStream KHÔNG BAO GIỜ xảy ra.
  // Chờ nó (như phiên bản trước) khiến Promise.all treo vĩnh viễn. Vì mọi WordBoundary luôn về
  // trước audio.metadata cuối cùng/turn.end theo đúng thứ tự giao thức, chỉ cần chờ audioStream
  // hoàn tất là đủ để tin toàn bộ wordTimings đã được gom xong.
  metadataStream.on('data', (chunk) => {
    try {
      const parsed = JSON.parse(chunk.toString());
      for (const item of parsed.Metadata || []) {
        if (item.Type === 'WordBoundary') {
          const startSec = item.Data.Offset / TICKS_PER_SECOND;
          const durationSec = item.Data.Duration / TICKS_PER_SECOND;
          wordTimings.push({
            word: item.Data.text.Text,
            start: startSec,
            end: startSec + durationSec,
          });
        }
      }
    } catch (e) {
      // Bỏ qua 1 chunk metadata lỗi định dạng, không làm hỏng cả audio đã tổng hợp được
    }
  });

  try {
    await new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => audioChunks.push(chunk));
      audioStream.once('end', resolve);
      audioStream.once('error', reject);
    });
  } finally {
    tts.close();
  }

  return {
    buffer: Buffer.concat(audioChunks),
    wordTimings: wordTimings.length > 0 ? wordTimings : null,
  };
}

/**
 * Tổng hợp giọng nói bằng Microsoft Edge TTS (miễn phí, không cần API key, không giới hạn ký tự
 * — dùng lại đúng dịch vụ đằng sau tính năng "Đọc to" (Read Aloud) của trình duyệt Edge). Trả về
 * buffer audio (mp3) CÙNG mốc thời gian thật theo từng từ (wordTimings) lấy trực tiếp từ metadata
 * WordBoundary của dịch vụ — không cần ước lượng như hướng fallback của ElevenLabs khi thiếu
 * /with-timestamps, nên karaoke của reading-page-video luôn đồng bộ chính xác với giọng Edge.
 *
 * Tự động thử lại (không sleep dài, không cần key khác — dịch vụ miễn phí) khi gặp lỗi kết nối
 * WebSocket thoáng qua (xem TRANSIENT_ERROR_RE) trước khi bung lỗi thật ra ngoài.
 *
 * `text` được diễn giải qua buildSsml()/splitLeadingTag(): [emotion tag] mở đầu (nếu có) chuyển
 * thành điều chỉnh cao độ/âm lượng <prosody> thật (tag ngắt hơi mô phỏng bằng dấu "...") — giúp
 * giọng đọc miễn phí bớt đều đều hơn so với đọc thẳng text gốc không lên xuống.
 *
 * @param {{ text: string, voice: string, readingSpeed?: 'slow'|'medium'|'fast' }} params
 * @returns {Promise<{ buffer: Buffer, wordTimings: {word:string,start:number,end:number}[] | null }>}
 */
export async function synthesizeEdgeTts({ text, voice, readingSpeed }) {
  const rate = READING_SPEED_TO_EDGE_RATE[readingSpeed] || READING_SPEED_TO_EDGE_RATE.medium;

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await Promise.race([
        synthesizeEdgeTtsOnce({ text, voice, rate }),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error(`EdgeTTS attempt timed out after ${ATTEMPT_TIMEOUT_MS}ms (no response from Microsoft's service — likely rate-limited)`)),
          ATTEMPT_TIMEOUT_MS
        )),
      ]);
    } catch (err) {
      lastError = err;
      const isTransient = TRANSIENT_ERROR_RE.test(err.message || '');
      if (!isTransient || attempt === MAX_ATTEMPTS) {
        throw err;
      }
      console.warn(`[EdgeTTS] Lần thử ${attempt}/${MAX_ATTEMPTS} thất bại (${err.message}), thử lại...`);
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
    }
  }
  throw lastError;
}
