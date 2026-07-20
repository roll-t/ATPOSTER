import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import path from 'path';
import fs from 'fs';
import { resolveProjectDir } from '@/lib/remotionPaths';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';

// ElevenLabs voice mapping for custom designed voices (free tier)
const CHARACTER_VOICES = {
  alex: 'wJSBXsvChUQrylZvDzav', // Man
  mia: '4IQqf6fVNeEFbqnSbVxb',  // Woman
  leo: 'wJSBXsvChUQrylZvDzav',  // Old man
  zoe: '4IQqf6fVNeEFbqnSbVxb',  // Woman
  tom: 'wJSBXsvChUQrylZvDzav',  // Man
};

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

function getVoiceId(dialogueText, customMappings = {}) {
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  let voiceId = '4IQqf6fVNeEFbqnSbVxb'; // Default narrator fallback (Woman)

  if (match) {
    const name = match[1].trim().toLowerCase();
    if (customMappings[name]) {
      voiceId = customMappings[name];
    } else if (CHARACTER_VOICES[name]) {
      voiceId = CHARACTER_VOICES[name];
    }
  } else {
    voiceId = customMappings.narrator || '4IQqf6fVNeEFbqnSbVxb';
  }

  // Tự động chuyển đổi các voice ID bị chặn/hết hạn sang voice ID mới hoạt động được
  if (DEPRECATED_IDS[voiceId]) {
    return DEPRECATED_IDS[voiceId];
  }
  return voiceId;
}

/**
  * Lấy thông tin subscription của danh sách API Key, tự động nhảy sang Key tiếp theo nếu Key trước đã hết Quota (remaining <= 0)
  */
async function getActiveSubscription(apiKeys) {
  let firstOkResult = null;
  let lastErrorText = '';
  let lastStatus = 500;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        method: 'GET',
        headers: { 'xi-api-key': apiKey }
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastErrorText = errorText;
        lastStatus = response.status;
        console.warn(`[ElevenLabs Key Check] Key #${i + 1}/${apiKeys.length} bị lỗi HTTP ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const remaining = data.character_limit - data.character_count;

      if (!firstOkResult) {
        firstOkResult = { data, apiKey, keyIndex: i, remaining };
      }

      // Nếu Key này còn token (remaining > 0), chọn làm Key hoạt động chính ngay lập tức!
      if (remaining > 0) {
        console.log(`[ElevenLabs Key Selected] Tự động chọn Key #${i + 1}/${apiKeys.length} (Còn lại ${remaining.toLocaleString()} / ${data.character_limit.toLocaleString()} ký tự).`);
        return { ok: true, data, apiKey, keyIndex: i, remaining };
      }

      console.warn(`[ElevenLabs Key Auto-Switch] Key #${i + 1}/${apiKeys.length} đã HẾT QUOTA (0/${data.character_limit}). Đang tự động chuyển sang Key tiếp theo...`);
    } catch (err) {
      lastErrorText = err.message;
      console.warn(`[ElevenLabs Key Check] Key #${i + 1}/${apiKeys.length} bị lỗi kết nối: ${err.message}`);
    }
  }

  // Nếu tất cả các Key đều sống nhưng đều hết Quota (remaining <= 0), trả về thông tin Key đầu tiên
  if (firstOkResult) {
    return { ok: true, data: firstOkResult.data, apiKey: firstOkResult.apiKey, keyIndex: firstOkResult.keyIndex, remaining: firstOkResult.remaining };
  }

  return { ok: false, errorText: lastErrorText, status: lastStatus };
}

/**
 * Hàm gọi API ElevenLabs có tự động xoay vòng switch API Key khi hết quota hoặc bị lỗi
 */
async function fetchElevenLabsWithFallback(url, options, apiKeys) {
  let lastErrorText = '';
  let lastStatus = 500;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'xi-api-key': apiKey
        }
      });

      if (response.ok) {
        return { ok: true, response, apiKey, keyIndex: i };
      }

      const errorText = await response.text();
      lastErrorText = errorText;
      lastStatus = response.status;
      console.warn(`[ElevenLabs Key Auto-Switch] Key #${i + 1}/${apiKeys.length} bị lỗi (HTTP ${response.status}): ${errorText}. Đang tự động chuyển sang Key tiếp theo...`);
    } catch (err) {
      lastErrorText = err.message;
      console.warn(`[ElevenLabs Key Auto-Switch] Key #${i + 1}/${apiKeys.length} bị lỗi kết nối: ${err.message}. Đang tự động chuyển sang Key tiếp theo...`);
    }
  }

  return { ok: false, errorText: lastErrorText, status: lastStatus };
}

/**
 * Gộp danh sách ký tự + mốc thời gian bắt đầu/kết thúc (giây) mà ElevenLabs trả về
 * (endpoint /with-timestamps) thành danh sách mốc thời gian THẬT theo từng từ, để
 * kiểu phụ đề "karaoke" nhấn đúng từ đang được đọc thay vì chỉ ước lượng theo độ dài
 * ký tự. Trả về null nếu ElevenLabs không kèm alignment (vd endpoint không hỗ trợ).
 */
function deriveWordTimings(alignment) {
  if (!alignment?.characters?.length) return null;
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  if (!starts || !ends) return null;

  const words = [];
  let current = null;
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (current) {
        words.push(current);
        current = null;
      }
      continue;
    }
    if (!current) {
      current = { word: ch, start: starts[i], end: ends[i] };
    } else {
      current.word += ch;
      current.end = ends[i];
    }
  }
  if (current) words.push(current);
  return words.length > 0 ? words : null;
}

export async function POST(request) {
  try {
    const { folderPath, imageExt = 'jpg', audioExt = 'mp3', scenes, category } = await request.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    if (!folderPath || !folderPath.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đường dẫn thư mục lưu trữ tài nguyên.' }, { status: 400 });
    }

    // Lấy danh sách ElevenLabs API Key và Custom Voice Mappings từ DB settings
    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = parseApiKeys(settingsRecord?.elevenlabsApiKey);
    const customMappings = settingsRecord?.voiceMappings || {};

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình ElevenLabs API Key. Vui lòng thiết lập khóa API ở góc cài đặt của Sidebar.' }, { status: 400 });
    }

    // Tự động phát hiện và đưa Key còn token (remaining > 0) lên đầu danh sách ưu tiên
    const subCheck = await getActiveSubscription(apiKeys);
    let prioritizedKeys = [...apiKeys];
    if (subCheck.ok && subCheck.keyIndex > 0) {
      const activeKey = prioritizedKeys.splice(subCheck.keyIndex, 1)[0];
      prioritizedKeys.unshift(activeKey);
    }

    // Xác định thư mục đích để ghi file âm thanh — dùng resolveProjectDir (thử qua mọi skill)
    // vì thư mục có thể đã tồn tại từ bước sinh ảnh Google Flow trước đó ở SKILL nào đó; nếu
    // là project hoàn toàn mới (chưa có ảnh) thì dùng `category` làm gợi ý đúng skill sẽ chứa nó.
    let targetDir;
    const cleanFolder = folderPath.trim();
    if (path.isAbsolute(cleanFolder) || cleanFolder.includes('\\') || cleanFolder.includes('/')) {
      targetDir = path.resolve(cleanFolder);
    } else {
      targetDir = resolveProjectDir(cleanFolder, category);
    }

    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`[API Voiceover] Thư mục lưu audio: ${targetDir} (Sử dụng ${prioritizedKeys.length} API Key)`);

    const results = [];

    // Gọi lần lượt ElevenLabs cho từng phân cảnh để lồng tiếng
    for (const scene of scenes) {
      const { segmentNumber, dialogueOrNarration } = scene;
      const text = (dialogueOrNarration || '').trim();
      
      if (!text) {
        continue;
      }

      const voiceId = getVoiceId(text, customMappings);
      // Loại bỏ tiền tố tên nhân vật (như Alex:, Mia:) để ElevenLabs chỉ đọc lời thoại
      const textToSend = text.replace(/^[A-Za-z0-9\s]+:\s*/, '').trim();

      const paddedNum = String(segmentNumber).padStart(2, '0');
      const filename = `scene-${paddedNum}.${audioExt}`;
      const audioDir = path.join(targetDir, 'audio');
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }
      const filePath = path.join(audioDir, filename);

      console.log(`[API Voiceover] Slide ${segmentNumber} -> Voice ID: ${voiceId}, File: ${filename}`);

      // Xác định định dạng đầu ra cho ElevenLabs
      const outputFormat = audioExt === 'wav' ? 'wav_44100_16' : 'mp3_44100_128';

      const requestBody = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSend,
          model_id: 'eleven_multilingual_v2', // Standard multilingual model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      };

      // Ưu tiên endpoint /with-timestamps — trả về cùng file audio kèm mốc thời gian
      // từng ký tự (không tốn thêm quota so với endpoint thường), để suy ra mốc thời
      // gian THẬT theo từng từ cho kiểu phụ đề "karaoke" nhấn đúng nhịp đọc. Nếu vì lý do
      // gì đó không lấy được (gói cước không hỗ trợ, lỗi mạng...), tự động rớt về endpoint
      // audio thường để việc lồng tiếng vẫn luôn thành công dù không có mốc thời gian.
      let buffer;
      let wordTimings = null;
      const timestampsResult = await fetchElevenLabsWithFallback(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=${outputFormat}`,
        requestBody,
        prioritizedKeys
      );

      if (timestampsResult.ok) {
        try {
          const data = await timestampsResult.response.json();
          buffer = Buffer.from(data.audio_base64, 'base64');
          wordTimings = deriveWordTimings(data.alignment);
        } catch (err) {
          console.warn(`[API Voiceover] Slide ${segmentNumber}: không đọc được JSON /with-timestamps (${err.message}), thử lại endpoint audio thường.`);
        }
      }

      if (!buffer) {
        // Rớt về endpoint audio thường (không có mốc thời gian từng từ)
        const plainResult = await fetchElevenLabsWithFallback(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
          requestBody,
          prioritizedKeys
        );

        if (!plainResult.ok) {
          console.error(`[API Voiceover Error] Slide ${segmentNumber}:`, plainResult.errorText);
          return NextResponse.json({
            error: `Lỗi gọi ElevenLabs cho Slide ${segmentNumber}: Tất cả ${prioritizedKeys.length} ElevenLabs API Key đều bị lỗi hoặc hết quota. Chi tiết: ${plainResult.errorText}`
          }, { status: 500 });
        }

        const arrayBuffer = await plainResult.response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
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

export async function GET(request) {
  try {
    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKeys = parseApiKeys(settingsRecord?.elevenlabsApiKey);

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình API Key' }, { status: 400 });
    }

    const result = await getActiveSubscription(apiKeys);

    if (!result.ok) {
      const errorBody = result.errorText || '';
      console.error('[API Voiceover Quota Error] Tất cả ElevenLabs API Key đều thất bại:', result.status, errorBody);

      let elevenStatus = '';
      let elevenMessage = '';
      try {
        const parsed = JSON.parse(errorBody);
        elevenStatus = parsed?.detail?.status || '';
        elevenMessage = parsed?.detail?.message || '';
      } catch (_) {}

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
    return NextResponse.json({
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      remaining: data.character_limit - data.character_count,
      activeKeyIndex: result.keyIndex
    });
  } catch (error) {
    console.error('[API Voiceover Quota Error]:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
