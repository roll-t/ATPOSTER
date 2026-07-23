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

// Default voice fallbacks for custom designed voices (free tier)
const DEFAULT_MALE_VOICE = 'wJSBXsvChUQrylZvDzav';
const DEFAULT_FEMALE_VOICE = '4IQqf6fVNeEFbqnSbVxb';

const DEPRECATED_IDS = {
  // Auto-translate old voice IDs to the user's new working custom voice IDs
  'uREKoCeM2xnPeGaH8ZFM': '4IQqf6fVNeEFbqnSbVxb', // Old Woman -> New Woman
  '60qpDkuGX2KEChynwVZJ': 'wJSBXsvChUQrylZvDzav', // Old Man -> New Man

  'pNInz6obpgdq5TgpW1G0': 'wJSBXsvChUQrylZvDzav', // Alex/Tom -> Man
  'jBpfuIE2acssx9937DdU': 'wJSBXsvChUQrylZvDzav', // Alex/Tom -> Man
  'pNInz6obpgDQGcFmaJgB': 'wJSBXsvChUQrylZvDzav', // Alex/Tom -> Man
  'ErXwobaYiN019PkySvjV': 'wJSBXsvChUQrylZvDzav', // Alex/Tom -> Man

  'EXAVITQu4vr4xnSDxMaL': '4IQqf6fVNeEFbqnSbVxb', // Mia/Zoe -> Woman
  'MF3m74ZOqHOe5425uF21': '4IQqf6fVNeEFbqnSbVxb', // Mia/Zoe -> Woman
  '21m00Tcm4TlvDq8ikWAM': '4IQqf6fVNeEFbqnSbVxb', // Zoe/Narrator -> Woman
  'AZnzlk1XvdvUeBnXmlld': '4IQqf6fVNeEFbqnSbVxb', // Narrator -> Woman

  'N2lVS1w75z5N15T21Crc': 'wJSBXsvChUQrylZvDzav', // Leo -> Old man
  'TxGEqnHWrfWFTfGW9XjX': 'wJSBXsvChUQrylZvDzav'  // Leo -> Old man
};

export function parseElevenlabsAccounts(settingsRecord) {
  let rawAccounts = [];
  if (Array.isArray(settingsRecord?.elevenlabsAccounts) && settingsRecord.elevenlabsAccounts.length > 0) {
    rawAccounts = settingsRecord.elevenlabsAccounts;
  }

  const result = [];
  for (const item of rawAccounts) {
    if (item && item.apiKey && item.apiKey.trim()) {
      let cleanKey = item.apiKey.trim();
      let male = (item.maleVoiceId || '').trim();
      let female = (item.femaleVoiceId || '').trim();

      if (cleanKey.includes('|')) {
        const parts = cleanKey.split('|').map(p => p.trim());
        cleanKey = parts[0];
        if (!male && parts[1]) male = parts[1];
        if (!female && parts[2]) female = parts[2];
      }

      result.push({
        apiKey: cleanKey,
        maleVoiceId: male || DEFAULT_MALE_VOICE,
        femaleVoiceId: female || DEFAULT_FEMALE_VOICE
      });
    }
  }

  if (result.length > 0) return result;

  // Fallback parsing from legacy string elevenlabsApiKey
  const legacyKeys = parseApiKeys(settingsRecord?.elevenlabsApiKey);
  const legacyMappings = settingsRecord?.voiceMappings || {};
  const defaultMale = legacyMappings.alex || legacyMappings.leo || DEFAULT_MALE_VOICE;
  const defaultFemale = legacyMappings.mia || legacyMappings.narrator || DEFAULT_FEMALE_VOICE;

  return legacyKeys.map(raw => {
    if (raw.includes('|')) {
      const parts = raw.split('|').map(p => p.trim());
      return {
        apiKey: parts[0],
        maleVoiceId: parts[1] || defaultMale,
        femaleVoiceId: parts[2] || defaultFemale
      };
    }
    return {
      apiKey: raw,
      maleVoiceId: defaultMale,
      femaleVoiceId: defaultFemale
    };
  });
}

// Cùng kiểu suy luận "Tên: lời thoại" -> giọng nam/nữ như getVoiceIdForAccount() bên dưới, nhưng
// tra trong edgeVoiceMappings (khoá theo TÊN NHÂN VẬT, cùng khuôn với voiceMappings của
// ElevenLabs — vd {alex, mia, leo, zoe, tom, narrator}) thay vì cặp Voice ID theo tài khoản, vì
// Edge TTS miễn phí/không giới hạn nên không cần khái niệm "tài khoản" hay xoay vòng quota.
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

function getGeminiVoiceForText(dialogueText, geminiVoiceMappings) {
  const mappings = geminiVoiceMappings || {};
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  if (match) {
    const name = match[1].trim().toLowerCase();
    if (mappings[name]) return mappings[name];
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return mappings.alex || mappings.leo || mappings.tom || DEFAULT_GEMINI_MALE_VOICE;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady'].includes(name)) {
      return mappings.mia || mappings.zoe || DEFAULT_GEMINI_FEMALE_VOICE;
    }
  }
  return mappings.narrator || DEFAULT_GEMINI_FEMALE_VOICE;
}

function getVoiceIdForAccount(dialogueText, account) {
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  let rawMale = account.maleVoiceId || DEFAULT_MALE_VOICE;
  let rawFemale = account.femaleVoiceId || DEFAULT_FEMALE_VOICE;

  if (DEPRECATED_IDS[rawMale]) rawMale = DEPRECATED_IDS[rawMale];
  if (DEPRECATED_IDS[rawFemale]) rawFemale = DEPRECATED_IDS[rawFemale];

  if (match) {
    const name = match[1].trim().toLowerCase();
    if (['alex', 'leo', 'tom', 'man', 'male', 'boy', 'guy'].includes(name)) {
      return rawMale;
    }
    if (['mia', 'zoe', 'woman', 'female', 'girl', 'lady', 'narrator'].includes(name)) {
      return rawFemale;
    }
  }

  return rawFemale;
}

/**
  * Lấy thông tin subscription của danh sách Tài Khoản, tự động nhảy sang Tài Khoản tiếp theo nếu trước đó đã hết Quota (remaining <= 0)
  */
async function getActiveSubscription(accounts) {
  let firstOkResult = null;
  let lastErrorText = '';
  let lastStatus = 500;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        method: 'GET',
        headers: { 'xi-api-key': acc.apiKey }
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastErrorText = errorText;
        lastStatus = response.status;
        console.warn(`[ElevenLabs Key Check] Tài khoản #${i + 1}/${accounts.length} bị lỗi HTTP ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const remaining = data.character_limit - data.character_count;

      if (!firstOkResult) {
        firstOkResult = { data, account: acc, accountIndex: i, remaining };
      }

      // Chỉ chọn tài khoản nếu còn dư ít nhất 500 ký tự (đủ cho 1 phân cảnh câu chuyện).
      // Nếu tài khoản chỉ còn dư lẻ cặn (như 403/10000), tự động nhảy sang Tài khoản tiếp theo còn full quota!
      if (remaining >= 500) {
        console.log(`[ElevenLabs Selected] Tự động chọn Tài khoản #${i + 1}/${accounts.length} (Còn ${remaining.toLocaleString()} / ${data.character_limit.toLocaleString()} ký tự). Voice Nam: ${acc.maleVoiceId}, Voice Nữ: ${acc.femaleVoiceId}`);
        return { ok: true, data, account: acc, accountIndex: i, remaining };
      }

      console.warn(`[ElevenLabs Auto-Switch] Tài khoản #${i + 1}/${accounts.length} hết hoặc sắp hết QUOTA (còn ${remaining}/${data.character_limit} ký tự < 500). Đang chuyển sang Tài khoản tiếp theo...`);
    } catch (err) {
      lastErrorText = err.message;
      console.warn(`[ElevenLabs Key Check] Tài khoản #${i + 1}/${accounts.length} bị lỗi kết nối: ${err.message}`);
    }
  }

  if (firstOkResult) {
    return { ok: true, data: firstOkResult.data, account: firstOkResult.account, accountIndex: firstOkResult.accountIndex, remaining: firstOkResult.remaining };
  }

  return { ok: false, errorText: lastErrorText, status: lastStatus };
}

/**
 * Hàm gọi API ElevenLabs có tự động xoay vòng switch API Key + Cặp Voice ID khi hết quota hoặc bị lỗi
 */
async function fetchElevenLabsWithFallback(getParams, options, accounts) {
  let lastErrorText = '';
  let lastStatus = 500;

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    const { url, voiceId } = getParams(acc);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'xi-api-key': acc.apiKey
        }
      });

      if (response.ok) {
        return { ok: true, response, account: acc, accountIndex: i, voiceId };
      }

      const errorText = await response.text();
      lastErrorText = errorText;
      lastStatus = response.status;
      console.warn(`[ElevenLabs Key Auto-Switch] Tài khoản #${i + 1}/${accounts.length} bị lỗi (HTTP ${response.status}): ${errorText}. Đang chuyển sang Tài khoản tiếp theo...`);
    } catch (err) {
      lastErrorText = err.message;
      console.warn(`[ElevenLabs Key Auto-Switch] Tài khoản #${i + 1}/${accounts.length} bị lỗi kết nối: ${err.message}. Đang chuyển sang Tài khoản tiếp theo...`);
    }
  }

  return { ok: false, errorText: lastErrorText, status: lastStatus };
}

/**
 * Gộp danh sách ký tự + mốc thời gian bắt đầu/kết thúc (giây) mà ElevenLabs trả về
 * (endpoint /with-timestamps) thành danh sách mốc thời gian THẬT theo từng từ
 */
function deriveWordTimings(alignment) {
  if (!alignment || !Array.isArray(alignment.characters) || !Array.isArray(alignment.character_start_times_seconds)) {
    return null;
  }
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds || [];

  const words = [];
  let curWord = '';
  let curStart = null;
  let curEnd = 0;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const s = starts[i];
    const e = ends[i] !== undefined ? ends[i] : s;

    if (/\s/.test(c)) {
      if (curWord.trim()) {
        words.push({ word: curWord.trim(), start: curStart, end: curEnd });
        curWord = '';
        curStart = null;
      }
    } else {
      if (curStart === null) curStart = s;
      curEnd = e;
      curWord += c;
    }
  }
  if (curWord.trim()) {
    words.push({ word: curWord.trim(), start: curStart, end: curEnd });
  }
  return words.length > 0 ? words : null;
}

// Tốc độ đọc do người dùng chọn (reading_practice) -> tham số "speed" của ElevenLabs
// (chỉ eleven_multilingual_v2/turbo/flash hỗ trợ, hợp lệ trong khoảng 0.7-1.2).
// Không set nếu là 'medium' để giữ hành vi mặc định y hệt trước khi có tính năng này.
const READING_SPEED_TO_ELEVENLABS = { slow: 0.85, medium: 1.0, fast: 1.15 };

export async function POST(request) {
  try {
    const { folderPath, imageExt = 'jpg', audioExt = 'mp3', scenes, category, readingSpeed, ttsProvider: requestedProvider } = await request.json();
    const speedValue = READING_SPEED_TO_ELEVENLABS[String(readingSpeed || '').toLowerCase()] || null;

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    if (!folderPath || !folderPath.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đường dẫn thư mục lưu trữ tài nguyên.' }, { status: 400 });
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    // Nhà cung cấp lồng tiếng: 'elevenlabs' (mặc định, trả phí theo ký tự) hoặc 'edge' (Microsoft
    // Edge TTS — miễn phí, không giới hạn ký tự, không cần API key). Ưu tiên giá trị gửi thẳng
    // trong request (đổi nhanh lúc lồng tiếng), fallback về lựa chọn đã lưu trong Cài đặt.
    const provider = requestedProvider || settingsRecord?.ttsProvider || 'edge';
    const isElevenLabs = provider === 'elevenlabs';

    let prioritizedAccounts = [];
    if (isElevenLabs) {
      const accounts = parseElevenlabsAccounts(settingsRecord);
      if (accounts.length === 0) {
        return NextResponse.json({ error: 'Chưa cấu hình ElevenLabs API Key. Vui lòng thiết lập khóa API ở góc cài đặt của Sidebar, hoặc đổi sang nhà cung cấp "Edge TTS (miễn phí)" ở Cấu hình Giọng đọc.' }, { status: 400 });
      }

      // Tự động phát hiện và đưa Tài Khoản còn token (remaining > 0) lên đầu danh sách ưu tiên
      const subCheck = await getActiveSubscription(accounts);
      prioritizedAccounts = [...accounts];
      if (subCheck.ok && subCheck.accountIndex > 0) {
        const activeAcc = prioritizedAccounts.splice(subCheck.accountIndex, 1)[0];
        prioritizedAccounts.unshift(activeAcc);
      }
    }

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

    console.log(`[API Voiceover] Thư mục lưu audio: ${targetDir} (Nhà cung cấp: ${isElevenLabs ? `ElevenLabs, ${prioritizedAccounts.length} tài khoản` : 'Edge TTS (miễn phí)'})`);

    const results = [];
    // Giãn cách nhẹ giữa các lần gọi Edge TTS liên tiếp — dịch vụ miễn phí này thỉnh thoảng bắt
    // đầu treo/đóng kết nối sớm (xem synthesizeEdgeTts) sau một loạt request bắn liên tục không
    // nghỉ (project nhiều slide, vd 6+ slide). Không phải cấu hình chính thức từ Microsoft, chỉ
    // là giảm khả năng bị coi là spam theo kinh nghiệm thực tế.
    let isFirstEdgeCall = true;

    for (const scene of scenes) {
      const { segmentNumber, dialogueOrNarration } = scene;
      const text = (dialogueOrNarration || '').trim();

      if (!text) {
        continue;
      }

      const textToSend = text
        .replace(/^[A-Za-z0-9\s]+:\s*/, '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Edge & CapCut TTS: Xoá hoàn toàn các [thẻ cảm xúc] trong ngoặc vuông
      // để tránh việc các công cụ đọc to chúng lên hoặc gây lỗi định dạng âm thanh.
      const textForEdge = text
        .replace(/^[A-Za-z0-9\s]+:\s*/, '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const paddedNum = String(segmentNumber).padStart(2, '0');
      const filename = `scene-${paddedNum}.${audioExt}`;
      const audioDir = path.join(targetDir, 'audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      const filePath = path.join(audioDir, filename);

      const outputFormat = audioExt === 'wav' ? 'wav_44100_16' : 'mp3_44100_128';

      let buffer;
      let wordTimings = null;

      if (!isElevenLabs) {
        // Edge TTS: mỗi lần gọi trả về audio + mốc thời gian THẬT theo từng từ luôn kèm sẵn
        if (!isFirstEdgeCall) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        isFirstEdgeCall = false;
        const edgeVoice = getEdgeVoiceForText(text, settingsRecord?.edgeVoiceMappings);
        try {
          if (isCapcutVoice(edgeVoice)) {
            try {
              const capcutResult = await synthesizeCapcutTts({ text: textForEdge, voice: edgeVoice, readingSpeed });
              buffer = capcutResult.buffer;
              wordTimings = null; // CapCut TTS doesn't return wordTimings
              console.log(`[API Voiceover CapCut] Slide ${segmentNumber} -> Voice: ${edgeVoice}`);
            } catch (capcutErr) {
              console.warn(`[API Voiceover CapCut Fallback] Slide ${segmentNumber}: CapCut bị lỗi (${capcutErr.message}), chuyển tự động sang Edge TTS...`);
              const fallbackVoice = (edgeVoice.includes('female') || edgeVoice.includes('huong') || edgeVoice.includes('peiqi') || edgeVoice.includes('yangguang') || edgeVoice.includes('richgirl')) ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
              const edgeResult = await synthesizeEdgeTts({ text: textForEdge, voice: fallbackVoice, readingSpeed });
              buffer = edgeResult.buffer;
              wordTimings = edgeResult.wordTimings;
              console.log(`[API Voiceover CapCut Fallback] Slide ${segmentNumber} -> Edge Fallback Voice: ${fallbackVoice}`);
            }
          } else {
            const edgeResult = await synthesizeEdgeTts({ text: textForEdge, voice: edgeVoice, readingSpeed });
            buffer = edgeResult.buffer;
            wordTimings = edgeResult.wordTimings;
            console.log(`[API Voiceover Edge] Slide ${segmentNumber} -> Voice: ${edgeVoice}`);
          }
        } catch (err) {
          console.error(`[API Voiceover TTS Error] Slide ${segmentNumber}:`, err.message);
          return NextResponse.json({
            error: `Lỗi gọi TTS cho Slide ${segmentNumber}: ${err.message}`
          }, { status: 500 });
        }
      } else {
        const requestBody = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToSend,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              ...(speedValue ? { speed: speedValue } : {}),
            },
          }),
        };

        const timestampsResult = await fetchElevenLabsWithFallback(
          (acc) => {
            const vId = getVoiceIdForAccount(text, acc);
            return {
              url: `https://api.elevenlabs.io/v1/text-to-speech/${vId}/with-timestamps?output_format=${outputFormat}`,
              voiceId: vId
            };
          },
          requestBody,
          prioritizedAccounts
        );

        if (timestampsResult.ok) {
          try {
            const data = await timestampsResult.response.json();
            buffer = Buffer.from(data.audio_base64, 'base64');
            wordTimings = deriveWordTimings(data.alignment);
            console.log(`[API Voiceover] Slide ${segmentNumber} -> Key: ${timestampsResult.account.apiKey.slice(0, 8)}..., Voice ID: ${timestampsResult.voiceId}`);
          } catch (err) {
            console.warn(`[API Voiceover] Slide ${segmentNumber}: không đọc được JSON /with-timestamps (${err.message}), thử lại endpoint audio thường.`);
          }
        }

        if (!buffer) {
          // Rớt về endpoint audio thường (không có mốc thời gian từng từ)
          const plainResult = await fetchElevenLabsWithFallback(
            (acc) => {
              const vId = getVoiceIdForAccount(text, acc);
              return {
                url: `https://api.elevenlabs.io/v1/text-to-speech/${vId}?output_format=${outputFormat}`,
                voiceId: vId
              };
            },
            requestBody,
            prioritizedAccounts
          );

          if (!plainResult.ok) {
            console.error(`[API Voiceover Error] Slide ${segmentNumber}:`, plainResult.errorText);
            return NextResponse.json({
              error: `Lỗi gọi ElevenLabs cho Slide ${segmentNumber}: Tất cả ${prioritizedAccounts.length} Tài khoản ElevenLabs đều bị lỗi hoặc hết quota. Chi tiết: ${plainResult.errorText}`
            }, { status: 500 });
          }

          const arrayBuffer = await plainResult.response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          console.log(`[API Voiceover Plain] Slide ${segmentNumber} -> Key: ${plainResult.account.apiKey.slice(0, 8)}..., Voice ID: ${plainResult.voiceId}`);
        }
      }

      fs.writeFileSync(filePath, buffer);

      results.push({
        segmentNumber,
        filename,
        size: buffer.length,
        filePath,
        wordTimings
      });
    }

    // Ghi mốc thời gian từng từ (nếu lấy được) vào manifest.json của project — để
    // render-project.mjs của skill đọc và đưa vào config cho kiểu phụ đề "karaoke"
    // nhấn đúng từ đang đọc, thay vì chỉ ước lượng theo độ dài chữ.
    const manifestPath = path.join(targetDir, 'manifest.json');
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

    quotaCache = null;
    quotaCacheTime = 0;

    return NextResponse.json({
      success: true,
      message: `Đã lồng tiếng thành công cho ${results.length} slide!`,
      targetDirectory: targetDir,
      files: results.map(({ wordTimings, ...rest }) => rest)
    });

  } catch (error) {
    console.error('[API Voiceover Exception]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tạo âm thanh.' }, { status: 500 });
  }
}

let quotaCache = null;
let quotaCacheTime = 0;
const QUOTA_CACHE_TTL_MS = 60 * 1000; // 60s cache server-side

export function clearQuotaCache() {
  quotaCache = null;
  quotaCacheTime = 0;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url || 'http://localhost');
    const force = searchParams.get('force') === 'true';

    if (!force && quotaCache && (Date.now() - quotaCacheTime) < QUOTA_CACHE_TTL_MS) {
      return NextResponse.json(quotaCache);
    }

    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const accounts = parseElevenlabsAccounts(settingsRecord);

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình API Key' }, { status: 400 });
    }

    const result = await getActiveSubscription(accounts);

    if (!result.ok) {
      const errorBody = result.errorText || '';
      console.error('[API Voiceover Quota Error] Tất cả ElevenLabs API Key đều thất bại:', result.status, errorBody);

      let elevenStatus = '';
      let elevenMessage = '';
      try {
        const parsed = JSON.parse(errorBody);
        elevenStatus = parsed?.detail?.status || '';
        elevenMessage = parsed?.detail?.message || '';
      } catch (_) { }

      let hint;
      if (elevenStatus === 'missing_permissions') {
        hint = 'API Key ElevenLabs đang dùng bị giới hạn quyền, thiếu quyền "user_read" nên không đọc được quota (vẫn có thể tạo giọng nói bình thường).';
      } else if (result.status === 401) {
        hint = 'Tất cả API Key ElevenLabs không hợp lệ hoặc đã hết hạn/bị thu hồi. Vui lòng cập nhật lại API Key ở Cài đặt AI & DB Settings.';
      } else {
        hint = `Không thể lấy thông tin gói từ ElevenLabs (HTTP ${result.status})${elevenMessage ? ': ' + elevenMessage : ''}.`;
      }
      return NextResponse.json({ error: hint, detail: errorBody }, { status: result.status });
    }

    const data = result.data;
    const responsePayload = {
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      remaining: data.character_limit - data.character_count,
      activeKeyIndex: result.accountIndex
    };

    quotaCache = responsePayload;
    quotaCacheTime = Date.now();

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[API Voiceover Quota Error]:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
