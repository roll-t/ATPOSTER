import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import path from 'path';
import fs from 'fs';
import { getRemotionPublicDir } from '@/lib/remotionPaths';

// ElevenLabs voice mapping for custom designed voices (free tier)
const CHARACTER_VOICES = {
  alex: '60qpDkuGX2KEChynwVZJ', // Man
  mia: 'uREKoCeM2xnPeGaH8ZFM',  // Woman
  leo: 'bCz2PEZUgf9cMsRPOLHg',  // Old man
  zoe: 'uREKoCeM2xnPeGaH8ZFM',  // Woman
  tom: '60qpDkuGX2KEChynwVZJ',  // Man
};

const DEPRECATED_IDS = {
  // Translate old library/premade voice IDs to the user's custom designed working voice IDs
  'pNInz6obpgdq5TgpW1G0': '60qpDkuGX2KEChynwVZJ', // Alex/Tom -> Man
  'jBpfuIE2acssx9937DdU': '60qpDkuGX2KEChynwVZJ', // Alex/Tom -> Man
  'pNInz6obpgDQGcFmaJgB': '60qpDkuGX2KEChynwVZJ', // Alex/Tom -> Man
  'ErXwobaYiN019PkySvjV': '60qpDkuGX2KEChynwVZJ', // Alex/Tom -> Man

  'EXAVITQu4vr4xnSDxMaL': 'uREKoCeM2xnPeGaH8ZFM', // Mia/Zoe -> Woman
  'MF3m74ZOqHOe5425uF21': 'uREKoCeM2xnPeGaH8ZFM', // Mia/Zoe -> Woman
  '21m00Tcm4TlvDq8ikWAM': 'uREKoCeM2xnPeGaH8ZFM', // Zoe/Narrator -> Woman
  'AZnzlk1XvdvUeBnXmlld': 'uREKoCeM2xnPeGaH8ZFM', // Narrator -> Woman

  'N2lVS1w75z5N15T21Crc': 'bCz2PEZUgf9cMsRPOLHg', // Leo -> Old man
  'TxGEqnHWrfWFTfGW9XjX': 'bCz2PEZUgf9cMsRPOLHg'  // Leo -> Old man
};

function getVoiceId(dialogueText, customMappings = {}) {
  const match = dialogueText.match(/^([A-Za-z0-9\s]+):/);
  let voiceId = 'uREKoCeM2xnPeGaH8ZFM'; // Default narrator fallback

  if (match) {
    const name = match[1].trim().toLowerCase();
    if (customMappings[name]) {
      voiceId = customMappings[name];
    } else if (CHARACTER_VOICES[name]) {
      voiceId = CHARACTER_VOICES[name];
    }
  } else {
    voiceId = customMappings.narrator || 'uREKoCeM2xnPeGaH8ZFM';
  }

  // Tự động chuyển đổi các voice ID bị chặn sang voice ID thiết kế riêng hoạt động được
  if (DEPRECATED_IDS[voiceId]) {
    return DEPRECATED_IDS[voiceId];
  }
  return voiceId;
}

export async function POST(request) {
  try {
    const { folderPath, imageExt = 'jpg', audioExt = 'mp3', scenes } = await request.json();

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy danh sách phân cảnh.' }, { status: 400 });
    }

    if (!folderPath || !folderPath.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đường dẫn thư mục lưu trữ tài nguyên.' }, { status: 400 });
    }

    // Lấy API Key và Custom Voice Mappings từ DB settings
    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const apiKey = (settingsRecord?.elevenlabsApiKey || '').trim();
    const customMappings = settingsRecord?.voiceMappings || {};

    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình ElevenLabs API Key. Vui lòng thiết lập khóa API ở góc cài đặt của Sidebar.' }, { status: 400 });
    }

    // Xác định thư mục đích để ghi file âm thanh
    let targetDir;
    const cleanFolder = folderPath.trim();
    if (path.isAbsolute(cleanFolder) || cleanFolder.includes('\\') || cleanFolder.includes('/')) {
      targetDir = path.resolve(cleanFolder);
    } else {
      targetDir = path.join(getRemotionPublicDir(), cleanFolder);
    }

    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`[API Voiceover] Thư mục lưu audio: ${targetDir}`);

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

      // Gọi API ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
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
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API Voiceover Error] Slide ${segmentNumber}:`, errorText);
        return NextResponse.json({ 
          error: `Lỗi gọi ElevenLabs cho Slide ${segmentNumber}: ${response.statusText}. Chi tiết: ${errorText}` 
        }, { status: 500 });
      }

      // Đọc buffer và ghi ra file
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);

      results.push({
        segmentNumber,
        filename,
        size: buffer.length,
        filePath
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã lồng tiếng thành công cho ${results.length} slide!`,
      targetDirectory: targetDir,
      files: results
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
    const apiKey = (settingsRecord?.elevenlabsApiKey || '').trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình API Key' }, { status: 400 });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': apiKey,
      }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('[API Voiceover Quota Error] ElevenLabs trả về:', response.status, errorBody);

      // ElevenLabs trả lỗi có cấu trúc { detail: { status, message } } -> bóc ra để báo đúng nguyên nhân
      let elevenStatus = '';
      let elevenMessage = '';
      try {
        const parsed = JSON.parse(errorBody);
        elevenStatus = parsed?.detail?.status || '';
        elevenMessage = parsed?.detail?.message || '';
      } catch (_) {}

      let hint;
      if (elevenStatus === 'missing_permissions') {
        hint = 'API Key ElevenLabs đang dùng bị giới hạn quyền, thiếu quyền "user_read" nên không đọc được quota (vẫn có thể tạo giọng nói bình thường). Vào ElevenLabs > API Keys, cấp thêm quyền "User" (read) cho key này, hoặc tạo key mới với đầy đủ quyền rồi cập nhật lại ở Cài đặt AI & DB Settings.';
      } else if (response.status === 401) {
        hint = 'API Key ElevenLabs không hợp lệ hoặc đã hết hạn/bị thu hồi. Vui lòng cập nhật lại API Key ở Cài đặt AI & DB Settings.';
      } else {
        hint = `Không thể lấy thông tin gói từ ElevenLabs (HTTP ${response.status})${elevenMessage ? ': ' + elevenMessage : ''}.`;
      }
      return NextResponse.json({ error: hint, detail: errorBody }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      characterCount: data.character_count,
      characterLimit: data.character_limit,
      remaining: data.character_limit - data.character_count
    });
  } catch (error) {
    console.error('[API Voiceover Quota Error]:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
