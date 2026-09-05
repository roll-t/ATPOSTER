import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import path from 'path';
import fs from 'fs';
import { resolveProjectDir } from '@/lib/remotionPaths';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';
import { synthesizeEdgeTts } from '@/lib/tts/edgeTts.js';
import { DEFAULT_EDGE_MALE_VOICE, DEFAULT_EDGE_FEMALE_VOICE } from '@/lib/tts/edgeVoices.js';
import { synthesizeGeminiTts } from '@/lib/tts/geminiTts.js';
import { DEFAULT_GEMINI_MALE_VOICE, DEFAULT_GEMINI_FEMALE_VOICE } from '@/lib/tts/geminiVoices.js';
import { synthesizeCapcutTts, isCapcutVoice } from '@/lib/tts/capcutTts.js';
import { transliterateEnglishForVietnameseTts, prewarmTransliterationCache } from '@/lib/tts/englishPhoneticVi.js';

// Default voice fallbacks for VieNeu-TTS (local python server)
const DEFAULT_VIENEU_MALE_VOICE = 'Phạm Tuyên';
const DEFAULT_VIENEU_FEMALE_VOICE = 'Trúc Ly';

// Suy luận giọng nam/nữ từ tiền tố "Tên: lời thoại" ở đầu câu, tra trong edgeVoiceMappings (khoá
// theo TÊN NHÂN VẬT, vd {alex, mia, leo, zoe, tom, narrator}); nếu tên không khớp mapping nào thì
// đoán theo nhóm tên nam/nữ quen thuộc, cuối cùng rơi về giọng narrator hoặc mặc định.
function getEdgeVoiceForText(dialogueText, edgeVoiceMappings) {
  const mappings = edgeVoiceMappings || {};
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  if (match) {
    const name = match[1].trim().toLowerCase();
    if (mappings[name]) return mappings[name];
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return mappings.alex || mappings.leo || mappings.tom || DEFAULT_EDGE_MALE_VOICE;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady'].includes(name)) {
      return mappings.mia || mappings.zoe || DEFAULT_EDGE_FEMALE_VOICE;
    }
  }
  return mappings.narrator || DEFAULT_EDGE_FEMALE_VOICE;
}

/**
 * Tạo buffer MP3 tĩnh lặng (silence) chuẩn MPEG-1 Layer 3, 128kbps, 44.1kHz.
 * Dùng cho các slide không có lời thoại (ví dụ Slide Tiêu đề Hồi 2-3s).
 */
function createSilentMp3Buffer(durationSeconds = 3) {
  const header = Buffer.from([0xFF, 0xFB, 0x90, 0x64]);
  const frame = Buffer.alloc(417, 0);
  header.copy(frame, 0);
  const frameDuration = 1152 / 44100;
  const numFrames = Math.max(1, Math.round(durationSeconds / frameDuration));
  return Buffer.concat(Array(numFrames).fill(frame));
}

// Bản tương đương cho VieNeu-TTS — cùng cách suy luận, chỉ khác bảng mapping và giọng mặc định.
function getVieneuVoiceForText(dialogueText, vieneuVoiceMappings) {
  const mappings = vieneuVoiceMappings || {};
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  if (match) {
    const name = match[1].trim().toLowerCase();
    if (mappings[name]) return mappings[name];
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return mappings.alex || mappings.leo || mappings.tom || DEFAULT_VIENEU_MALE_VOICE;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady'].includes(name)) {
      return mappings.mia || mappings.zoe || DEFAULT_VIENEU_FEMALE_VOICE;
    }
  }
  return mappings.narrator || DEFAULT_VIENEU_FEMALE_VOICE;
}

// Chuẩn hoá lời thoại trước khi gửi cho công cụ đọc: bỏ tên nhân vật ở đầu câu ("Nam: ...") và
// xoá hẳn các [thẻ cảm xúc] trong ngoặc vuông, tránh việc chúng bị đọc to lên thành lời.
function normalizeTtsText(rawText) {
  return (rawText || '')
    .replace(/^[A-Za-z0-9\s]+:\s*/, '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Các đuôi file audio có thể đã được tạo trước đó cho 1 slide — dùng để biết slide nào ĐÃ có
// giọng đọc (chế độ chỉ-đọc-lại-slide-đã-có-audio bên dưới), kể cả khi lần tạo trước dùng đuôi
// khác với lần này.
const KNOWN_AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'ogg'];

function findExistingSceneAudio(audioDir, segmentNumber, preferredExt) {
  const padded = String(segmentNumber).padStart(2, '0');
  const exts = [preferredExt, ...KNOWN_AUDIO_EXTS.filter((e) => e !== preferredExt)];
  for (const ext of exts) {
    const p = path.join(audioDir, `scene-${padded}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function POST(request) {
  try {
    const {
      folderPath,
      // Tiêu đề THẬT của kịch bản (result.title phía client) — chỉ dùng để đặt tên cho manifest.json
      // TỰ TẠO khi file này chưa tồn tại (xem bên dưới). Không bắt buộc: các lần gọi cũ hơn không
      // gửi field này vẫn chạy bình thường, chỉ là bootstrap manifest sẽ phải rơi về tên thư mục.
      title,
      imageExt = 'jpg',
      audioExt = 'mp3',
      scenes,
      category,
      readingSpeed,
      ttsProvider: requestedProvider,
      narrationLanguage,
      // Chỉ đọc lại những slide ĐÃ có sẵn file audio, bỏ qua slide chưa từng được lồng tiếng.
      // Dùng khi người dùng sửa tay lời kể rồi bấm Lưu: chỉ slide nào từng có giọng mới đọc lại.
      onlyExistingAudio = false,
      // Đọc lại bằng ĐÚNG giọng đã dùng lần trước (đọc từ manifest.json) thay vì suy ra lại từ
      // Cấu hình Giọng đọc hiện tại — để bản sửa 1 slide không bị lệch giọng với các slide còn lại
      // nếu người dùng đã đổi cấu hình giọng sau lần lồng tiếng đầu.
      reuseExistingVoice = false
    } = await request.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    if (!folderPath || !folderPath.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đường dẫn thư mục lưu trữ tài nguyên.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    // Nhà cung cấp lồng tiếng: 'edge' (Microsoft Edge TTS/CapCut — miễn phí) hoặc 'vieneu' (server
    // Python cục bộ). Ưu tiên giá trị gửi thẳng trong request (đổi nhanh lúc lồng tiếng), fallback
    // về lựa chọn đã lưu trong Cài đặt. Cấu hình cũ còn lưu 'elevenlabs' (đã gỡ bỏ) thì coi như 'edge'.
    const rawProvider = requestedProvider || settingsRecord?.ttsProvider || 'edge';
    let provider = rawProvider === 'elevenlabs' ? 'edge' : rawProvider;
    if ((category === 'reading_practice' || narrationLanguage === 'en') && provider === 'vieneu') {
      provider = 'edge';
    }
    const isVieneu = provider === 'vieneu';
    const vieneuServerUrl = settingsRecord?.vieneuServerUrl || 'http://127.0.0.1:8001';
    // CapCut & VieNeu-TTS là giọng đọc CHỈ tiếng Việt — dùng để phiên âm lại các từ tiếng Anh lẫn
    // trong lời kể sang cách viết gần đúng âm tiếng Việt trước khi đọc (xem englishPhoneticVi.js),
    // tránh bị đọc lắp bắp sai khi gặp nguyên văn tiếng Anh. Bỏ qua nếu chưa cấu hình Gemini API Key.
    const geminiApiKeys = parseApiKeys(settingsRecord?.geminiApiKey || '');

    // Xác định thư mục đích
    let targetDir;
    const cleanFolder = folderPath.trim();
    if (path.isAbsolute(cleanFolder) || cleanFolder.includes('\\') || cleanFolder.includes('/')) {
      targetDir = path.resolve(cleanFolder);
    } else {
      targetDir = resolveProjectDir(cleanFolder, category);
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const manifestPath = path.join(targetDir, 'manifest.json');
    const audioDir = path.join(targetDir, 'audio');

    // Giọng đã dùng cho từng slide được lưu ở FILE RIÊNG audio/voices.json, KHÔNG nhét vào
    // manifest.json.
    //
    // Lý do: manifest.json là nguồn dữ liệu để RENDER (render-project.mjs lấy caption theo công
    // thức `seg.subtitle || seg.dialogueOrNarration`), và nó chỉ được Chrome Extension tạo đầy đủ
    // ở Bước 2. Bản trước từng tự tạo manifest tạm ngay ở Bước 1 để có chỗ ghi giọng — nhưng bản
    // tạm đó chỉ có dialogueOrNarration, THIẾU subtitle. Project nào mà Bước 2 không ghi đè lại
    // (đã xảy ra thật với 2 project) sẽ render ra phụ đề là nguyên đoạn lời kể dài thay vì câu
    // phụ đề ngắn có tô màu — hỏng hẳn hình thức video.
    //
    // File sidecar tách biệt hoàn toàn: luôn ghi được kể cả khi chưa có manifest, và không bao giờ
    // đụng tới dữ liệu render.
    const voicesSidecarPath = path.join(audioDir, 'voices.json');

    const storedVoiceByNumber = new Map();
    if (reuseExistingVoice) {
      // Ưu tiên sidecar; nếu chưa có thì đọc từ manifest.json — các project lồng tiếng bằng bản
      // code cũ đã ghi giọng thẳng vào manifest, vẫn phải tra cứu được để không mất giọng cũ.
      if (fs.existsSync(voicesSidecarPath)) {
        try {
          const sidecar = JSON.parse(fs.readFileSync(voicesSidecarPath, 'utf8'));
          for (const [num, voice] of Object.entries(sidecar.voices || {})) {
            if (voice?.provider && voice?.voiceId) storedVoiceByNumber.set(Number(num), voice);
          }
        } catch (err) {
          console.warn('[API Voiceover] Không đọc được audio/voices.json:', err.message);
        }
      }
      if (storedVoiceByNumber.size === 0 && fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          for (const seg of manifest.segments || []) {
            if (seg?.voice?.provider && seg?.voice?.voiceId) {
              storedVoiceByNumber.set(seg.segmentNumber, seg.voice);
            }
          }
        } catch (err) {
          console.warn('[API Voiceover] Không đọc được giọng cũ trong manifest.json:', err.message);
        }
      }
    }

    // Chỉ giữ lại slide ĐÃ từng có file audio (chế độ đọc lại sau khi sửa lời kể).
    const skippedNoAudio = [];
    const scenesToProcess = onlyExistingAudio
      ? scenes.filter((scene) => {
        const has = findExistingSceneAudio(audioDir, scene.segmentNumber, audioExt);
        if (!has) skippedNoAudio.push(scene.segmentNumber);
        return Boolean(has);
      })
      : scenes;

    // Giọng của từng slide được CHỐT TRƯỚC vòng lặp: mỗi slide có thể dùng nhà cung cấp khác nhau
    // khi đọc lại theo giọng cũ, nên không thể dựa vào một biến provider chung như trước.
    const resolveVoiceForScene = (scene) => {
      const text = (scene.dialogueOrNarration || '').trim();
      const stored = storedVoiceByNumber.get(scene.segmentNumber);
      if (stored) {
        return {
          // manifest.json cũ (trước khi gỡ ElevenLabs) có thể còn lưu provider 'elevenlabs' — coi như 'edge'.
          provider: stored.provider === 'elevenlabs' ? 'edge' : stored.provider,
          voiceId: stored.voiceId,
          readingSpeed: stored.readingSpeed || readingSpeed,
          fromStored: true
        };
      }
      if (isVieneu) {
        return { provider: 'vieneu', voiceId: getVieneuVoiceForText(text, settingsRecord?.vieneuVoiceMappings), readingSpeed, fromStored: false };
      }
      return { provider: 'edge', voiceId: getEdgeVoiceForText(text, settingsRecord?.edgeVoiceMappings), readingSpeed, fromStored: false };
    };

    const voiceByNumber = new Map(scenesToProcess.map((scene) => [scene.segmentNumber, resolveVoiceForScene(scene)]));

    console.log(`[API Voiceover] Thư mục lưu audio: ${targetDir} (Nhà cung cấp: ${provider}${onlyExistingAudio ? `, chỉ đọc lại ${scenesToProcess.length}/${scenes.length} slide đã có audio` : ''})`);

    // Từ đây trở đi là phần xử lý từng slide, tốn thời gian nhất — trả về dạng STREAM (NDJSON:
    // mỗi dòng 1 sự kiện JSON) thay vì đợi xử lý xong hết mới trả lời 1 lần, để thanh tiến độ
    // "Bước 1: Tạo giọng lồng tiếng" ở frontend cập nhật đúng theo tiến độ THẬT sau mỗi slide,
    // thay vì đếm giả lập theo thời gian ước tính như trước.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

        try {
          const results = [];
          // Giãn cách nhẹ giữa các lần gọi Edge TTS liên tiếp — dịch vụ miễn phí này thỉnh thoảng bắt
          // đầu treo/đóng kết nối sớm (xem synthesizeEdgeTts) sau một loạt request bắn liên tục không
          // nghỉ (project nhiều slide, vd 6+ slide). Không phải cấu hình chính thức từ Microsoft, chỉ
          // là giảm khả năng bị coi là spam theo kinh nghiệm thực tế.
          let isFirstEdgeCall = true;
          // Slide nào phải rơi xuống Edge TTS vì CapCut lỗi hẳn sau khi đã thử lại — báo cho người
          // dùng biết đúng những slide này sẽ nghe khác giọng với các slide còn lại, thay vì im lặng.
          const capcutFallbackSlides = [];

          // Phiên âm tiếng Anh sang cách viết đọc được bằng giọng Việt là việc CHUNG cho mọi slide,
          // nên gom hết vào 1 lệnh gọi Gemini duy nhất TRƯỚC vòng lặp. Trước đây nó được gọi lẻ bên
          // trong vòng lặp, nên một project 25 slide bắn ra 25 request liên tiếp trong vài giây —
          // vượt thẳng hạn mức free tier (20 request/phút) ngay giữa chừng, khiến cả mẻ lồng tiếng
          // phải ngồi chờ retry. Các lệnh gọi lẻ bên dưới giữ nguyên: sau bước này chúng chỉ còn là
          // tra cache, và nếu bước gộp thất bại thì chúng vẫn tự xoay xở đúng như cũ.
          if (geminiApiKeys.length > 0) {
            const textsNeedingPhonetics = scenesToProcess
              .filter((scene) => {
                const raw = (scene?.dialogueOrNarration || '').trim();
                if (!raw) return false;
                // Chỉ giọng CHỈ-tiếng-Việt mới cần phiên âm; Edge Neural thường tự đọc được tiếng Anh.
                const v = voiceByNumber.get(scene.segmentNumber);
                return v?.provider === 'vieneu' || (v?.provider === 'edge' && isCapcutVoice(v.voiceId));
              })
              .map((scene) => normalizeTtsText((scene.dialogueOrNarration || '').trim()));

            if (textsNeedingPhonetics.length > 0) {
              await prewarmTransliterationCache(textsNeedingPhonetics, geminiApiKeys);
            }
          }

          for (const scene of scenesToProcess) {
            const { segmentNumber, dialogueOrNarration } = scene;
            const text = (dialogueOrNarration || '').trim();

            const paddedNum = String(segmentNumber).padStart(2, '0');
            const filename = `scene-${paddedNum}.${audioExt}`;
            if (!fs.existsSync(audioDir)) {
              fs.mkdirSync(audioDir, { recursive: true });
            }
            const filePath = path.join(audioDir, filename);

            if (!text) {
              // Slide không có lời thoại (ví dụ Slide Tiêu đề Hồi 2-3s tĩnh lặng)
              const silenceSeconds = Number(scene.durationSeconds) || (scene.layout === 'chapter-title' ? 3 : 3);
              const silentBuffer = createSilentMp3Buffer(silenceSeconds);
              fs.writeFileSync(filePath, silentBuffer);
              send({
                type: 'slide_done',
                segmentNumber,
                usedVoice: { provider: 'silence', voiceId: 'none', readingSpeed: null },
                isFallback: false
              });
              results.push({ segmentNumber, audioFile: filename, usedVoice: { provider: 'silence', voiceId: 'none' } });
              continue;
            }

            let buffer;
            let wordTimings = null;
            // Giọng THẬT SỰ đã dùng cho slide này (có thể khác giọng dự kiến khi CapCut lỗi và
            // rơi xuống Edge) — ghi vào manifest.json để lần sửa lời sau đọc lại đúng giọng đó.
            let usedVoice = { provider: sceneProvider, voiceId: sceneVoice?.voiceId || null, readingSpeed: sceneReadingSpeed || null };

            if (sceneProvider === 'vieneu') {
              const vieneuVoice = sceneVoice?.voiceId || getVieneuVoiceForText(text, settingsRecord?.vieneuVoiceMappings);
              try {
                const vieneuText = await transliterateEnglishForVietnameseTts(textForEdge, geminiApiKeys);
                const response = await fetch(`${vieneuServerUrl}/synthesize`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: vieneuText,
                    voice: vieneuVoice,
                    style: 'tu_nhien'
                  })
                });

                if (!response.ok) {
                  const errText = await response.text();
                  throw new Error(errText || 'Lỗi phản hồi từ máy chủ VieNeu-TTS');
                }

                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
                wordTimings = null;
                usedVoice = { provider: 'vieneu', voiceId: vieneuVoice, readingSpeed: sceneReadingSpeed || null };
                console.log(`[API Voiceover VieNeu-TTS] Slide ${segmentNumber} -> Voice: ${vieneuVoice}${sceneVoice?.fromStored ? ' (giữ giọng cũ)' : ''}`);
              } catch (err) {
                console.error(`[API Voiceover VieNeu-TTS Error] Slide ${segmentNumber}:`, err.message);
                // Không thể đổi HTTP status giữa chừng stream đã bắt đầu (đã trả 200) — báo lỗi
                // qua 1 sự kiện "error" trong stream thay vì NextResponse.json({status:500}) như
                // bản blocking cũ, rồi throw để nhảy thẳng xuống catch ngoài cùng đóng stream lại.
                throw new Error(`Lỗi gọi VieNeu-TTS cho Slide ${segmentNumber}: ${err.message}. Đảm bảo máy chủ VieNeu-TTS đã được chạy tại ${vieneuServerUrl}`);
              }
            } else {
              // Edge TTS: mỗi lần gọi trả về audio + mốc thời gian THẬT theo từng từ luôn kèm sẵn
              if (!isFirstEdgeCall) {
                await new Promise((resolve) => setTimeout(resolve, 400));
              }
              isFirstEdgeCall = false;
              const edgeVoice = sceneVoice?.voiceId || getEdgeVoiceForText(text, settingsRecord?.edgeVoiceMappings);
              try {
                if (isCapcutVoice(edgeVoice)) {
                  // CapCut TTS là API reverse-engineered không chính thức, thỉnh thoảng lỗi tạm thời
                  // (task timeout/failed trên server CapCut) — thử lại vài lần TRƯỚC KHI rơi xuống
                  // Edge TTS. Trước đây rơi thẳng xuống Edge ngay lần lỗi đầu tiên khiến những slide
                  // xui gặp lỗi thoáng qua bị đổi sang hẳn 1 giọng Edge Neural khác hoàn toàn với các
                  // slide còn lại (vẫn dùng đúng giọng CapCut người dùng chọn) — nghe như "mỗi câu 1
                  // giọng khác nhau" dù cấu hình chỉ chọn đúng 1 giọng duy nhất.
                  // CapCut là giọng CHỈ tiếng Việt — phiên âm lại từ tiếng Anh lẫn trong câu trước
                  // khi gửi đọc, tránh bị đọc lắp bắp sai (xem transliterateEnglishForVietnameseTts).
                  const capcutText = await transliterateEnglishForVietnameseTts(textForEdge, geminiApiKeys);
                  const CAPCUT_MAX_ATTEMPTS = 3;
                  let capcutResult = null;
                  let lastCapcutErr = null;
                  for (let attempt = 1; attempt <= CAPCUT_MAX_ATTEMPTS; attempt++) {
                    try {
                      capcutResult = await synthesizeCapcutTts({ text: capcutText, voice: edgeVoice, readingSpeed: sceneReadingSpeed });
                      break;
                    } catch (capcutErr) {
                      lastCapcutErr = capcutErr;
                      if (attempt < CAPCUT_MAX_ATTEMPTS) {
                        console.warn(`[API Voiceover CapCut] Slide ${segmentNumber}: lần thử ${attempt}/${CAPCUT_MAX_ATTEMPTS} lỗi (${capcutErr.message}), thử lại...`);
                        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
                      }
                    }
                  }

                  if (capcutResult) {
                    buffer = capcutResult.buffer;
                    wordTimings = null; // CapCut TTS doesn't return wordTimings
                    usedVoice = { provider: 'edge', voiceId: edgeVoice, readingSpeed: sceneReadingSpeed || null };
                    console.log(`[API Voiceover CapCut] Slide ${segmentNumber} -> Voice: ${edgeVoice}${sceneVoice?.fromStored ? ' (giữ giọng cũ)' : ''}`);
                  } else {
                    console.warn(`[API Voiceover CapCut Fallback] Slide ${segmentNumber}: CapCut bị lỗi sau ${CAPCUT_MAX_ATTEMPTS} lần thử (${lastCapcutErr?.message}), chuyển tự động sang Edge TTS...`);
                    const fallbackVoice = (edgeVoice.includes('female') || edgeVoice.includes('huong') || edgeVoice.includes('peiqi') || edgeVoice.includes('yangguang') || edgeVoice.includes('richgirl')) ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
                    const edgeResult = await synthesizeEdgeTts({ text: capcutText, voice: fallbackVoice, readingSpeed: sceneReadingSpeed });
                    buffer = edgeResult.buffer;
                    wordTimings = edgeResult.wordTimings;
                    capcutFallbackSlides.push(segmentNumber);
                    // KHÔNG ghi giọng dự phòng vào manifest: giọng CapCut người dùng chọn mới là
                    // giọng "chính thức" của slide này, lần đọc lại sau vẫn phải thử lại CapCut.
                    usedVoice = { provider: 'edge', voiceId: edgeVoice, readingSpeed: sceneReadingSpeed || null };
                    console.log(`[API Voiceover CapCut Fallback] Slide ${segmentNumber} -> Edge Fallback Voice: ${fallbackVoice}`);
                  }
                } else {
                  const edgeResult = await synthesizeEdgeTts({ text: textForEdge, voice: edgeVoice, readingSpeed: sceneReadingSpeed });
                  buffer = edgeResult.buffer;
                  wordTimings = edgeResult.wordTimings;
                  usedVoice = { provider: 'edge', voiceId: edgeVoice, readingSpeed: sceneReadingSpeed || null };
                  console.log(`[API Voiceover Edge] Slide ${segmentNumber} -> Voice: ${edgeVoice}${sceneVoice?.fromStored ? ' (giữ giọng cũ)' : ''}`);
                }
              } catch (err) {
                console.error(`[API Voiceover TTS Error] Slide ${segmentNumber}:`, err.message);
                throw new Error(`Lỗi gọi TTS cho Slide ${segmentNumber}: ${err.message}`);
              }
            }

            fs.writeFileSync(filePath, buffer);

            results.push({
              segmentNumber,
              filename,
              size: buffer.length,
              filePath,
              wordTimings,
              voice: usedVoice
            });

            send({ type: 'progress', segmentNumber, completed: results.length, total: scenesToProcess.length });
          }

          // Giọng đã dùng cho từng slide -> ghi vào audio/voices.json (file sidecar riêng, xem
          // chú thích ở phần đọc phía trên). Ghi ĐƯỢC kể cả khi chưa có manifest.json, nên giọng
          // luôn được nhớ dù người dùng chạy Bước 1 trước Bước 2 như UI hướng dẫn.
          try {
            let sidecar = { voices: {} };
            if (fs.existsSync(voicesSidecarPath)) {
              try {
                const parsed = JSON.parse(fs.readFileSync(voicesSidecarPath, 'utf8'));
                if (parsed && typeof parsed.voices === 'object') sidecar = parsed;
              } catch (_) { /* file hỏng -> ghi đè bằng bản mới */ }
            }
            for (const r of results) {
              if (r.voice?.voiceId) sidecar.voices[r.segmentNumber] = r.voice;
            }
            sidecar.updatedAt = Date.now();
            if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
            fs.writeFileSync(voicesSidecarPath, JSON.stringify(sidecar, null, 2));
          } catch (err) {
            console.warn('[API Voiceover] Không ghi được audio/voices.json:', err.message);
          }

          // Mốc thời gian từng từ (nếu lấy được) -> manifest.json, để render-project.mjs đưa vào
          // config cho kiểu phụ đề "karaoke" nhấn đúng từ đang đọc thay vì ước lượng theo độ dài
          // chữ. Chỉ ghi khi manifest ĐÃ tồn tại — tuyệt đối không tự tạo manifest thiếu dữ liệu ở
          // đây, vì file này quyết định phụ đề lúc render (xem chú thích ở đầu hàm).
          // Chỉ đụng vào các slide vừa đọc trong lượt này; slide khác giữ nguyên timings cũ.
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              const timingsByNumber = new Map(results.filter(r => r.wordTimings).map(r => [r.segmentNumber, r.wordTimings]));
              manifest.segments = (manifest.segments || []).map((seg) => (
                timingsByNumber.has(seg.segmentNumber)
                  ? { ...seg, wordTimings: timingsByNumber.get(seg.segmentNumber) }
                  : seg
              ));
              manifest.updatedAt = Date.now();
              fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
            } catch (err) {
              console.warn('[API Voiceover] Không ghi được wordTimings vào manifest.json:', err.message);
            }
          }

          const fallbackWarning = capcutFallbackSlides.length > 0
            ? ` (Lưu ý: Slide ${capcutFallbackSlides.join(', ')} bị lỗi giọng CapCut đã chọn, tự động chuyển tạm sang giọng Edge dự phòng nên có thể nghe khác giọng — bạn có thể tạo lại giọng đọc để thử CapCut lại cho các slide này.)`
            : '';

          send({
            type: 'done',
            success: true,
            message: `Đã lồng tiếng thành công cho ${results.length} slide!${fallbackWarning}`,
            targetDirectory: targetDir,
            files: results.map(({ wordTimings, ...rest }) => rest),
            capcutFallbackSlides,
            // Slide được đọc lại trong lượt này & slide bị bỏ qua vì chưa từng có giọng đọc
            // (chỉ khác rỗng ở chế độ onlyExistingAudio).
            generatedSlides: results.map((r) => r.segmentNumber),
            skippedNoAudio
          });
        } catch (err) {
          console.error('[API Voiceover Exception]:', err);
          send({ type: 'error', error: err.message || 'Lỗi không xác định khi tạo âm thanh.' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[API Voiceover Exception]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tạo âm thanh.' }, { status: 500 });
  }
}

export async function GET(request) {
  return NextResponse.json({ error: 'Phương thức không được hỗ trợ.' }, { status: 400 });
}
