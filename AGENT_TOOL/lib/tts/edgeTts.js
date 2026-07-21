import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Offset/Duration mà Microsoft Edge TTS trả về trong metadata WordBoundary dùng đơn vị "tick"
// kiểu Windows/.NET (100 nano-giây/tick) — quy đổi sang giây bằng cách chia 10 triệu, giống hệt
// cách deriveWordTimings() ở voiceover/route.js quy đổi mốc thời gian ký tự của ElevenLabs.
const TICKS_PER_SECOND = 1e7;

// Tốc độ đọc -> tham số "rate" dạng phần trăm mà Edge TTS hiểu (vd "-20%", "+20%"). Cùng 3 mức
// slow/medium/fast đang dùng cho ElevenLabs (xem READING_SPEED_TO_ELEVENLABS ở voiceover/route.js)
// để 2 nhà cung cấp cho trải nghiệm tương đương khi đổi qua lại.
const READING_SPEED_TO_EDGE_RATE = { slow: '-20%', medium: '+0%', fast: '+20%' };

/**
 * Tổng hợp giọng nói bằng Microsoft Edge TTS (miễn phí, không cần API key, không giới hạn ký tự
 * — dùng lại đúng dịch vụ đằng sau tính năng "Đọc to" (Read Aloud) của trình duyệt Edge). Trả về
 * buffer audio (mp3) CÙNG mốc thời gian thật theo từng từ (wordTimings) lấy trực tiếp từ metadata
 * WordBoundary của dịch vụ — không cần ước lượng như hướng fallback của ElevenLabs khi thiếu
 * /with-timestamps, nên karaoke của reading-page-video luôn đồng bộ chính xác với giọng Edge.
 *
 * @param {{ text: string, voice: string, readingSpeed?: 'slow'|'medium'|'fast' }} params
 * @returns {Promise<{ buffer: Buffer, wordTimings: {word:string,start:number,end:number}[] | null }>}
 */
export async function synthesizeEdgeTts({ text, voice, readingSpeed }) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
    wordBoundaryEnabled: true,
  });

  const rate = READING_SPEED_TO_EDGE_RATE[readingSpeed] || READING_SPEED_TO_EDGE_RATE.medium;
  const { audioStream, metadataStream } = tts.toStream(text, { rate });

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
