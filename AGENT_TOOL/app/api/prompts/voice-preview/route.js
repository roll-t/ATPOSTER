import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMongoClientDb, getUploadsDir } from '@/lib/db.js';
import { synthesizeEdgeTts } from '@/lib/tts/edgeTts.js';
import { parseElevenlabsAccounts } from '@/app/api/prompts/voiceover/route.js';
import { parseApiKeys } from '@/lib/prompts/gemini/apiKeys.js';
import { synthesizeCapcutTts, isCapcutVoice } from '@/lib/tts/capcutTts.js';
import { transliterateEnglishForVietnameseTts } from '@/lib/tts/englishPhoneticVi.js';

// Câu mẫu ngắn để "nghe thử" 1 giọng trước khi dùng thật cho cả video — không ghi ra đĩa,
// không đụng tới project/manifest nào, chỉ trả thẳng audio base64 để phát ngay trên trình duyệt.
const DEFAULT_PREVIEW_TEXT = {
  en: 'Hello, this is a quick preview of this voice.',
  vi: 'Kẻ yếu chạy theo hào quang của người khác, kẻ mạnh tự thắp lửa trong tâm.',
};

function guessPreviewLang(voiceId) {
  const vid = String(voiceId || '').toLowerCase();
  return vid.startsWith('vi-') || vid.startsWith('vi_') || vid.startsWith('multi_') || vid.startsWith('bv') ? 'vi' : 'en';
}

export async function POST(request) {
  try {
    const { provider, voiceId, text, apiKey, appId, token } = await request.json();

    if (!provider || (provider !== 'edge' && provider !== 'elevenlabs' && provider !== 'vieneu')) {
      return NextResponse.json({ error: 'Nhà cung cấp không hợp lệ.' }, { status: 400 });
    }
    if (!voiceId || !String(voiceId).trim()) {
      return NextResponse.json({ error: 'Thiếu ID giọng đọc cần nghe thử.' }, { status: 400 });
    }

    // Set up file-system cache variables
    const sanitize = (str) => String(str).replace(/[^A-Za-z0-9_-]/g, '_');
    const cacheFileName = `${sanitize(provider)}_${sanitize(voiceId)}.bin`;
    const cacheDir = path.join(getUploadsDir(), 'voice_previews');
    const cacheFilePath = path.join(cacheDir, cacheFileName);

    // Serve from cache if exists
    if (fs.existsSync(cacheFilePath)) {
      try {
        const cachedBuffer = fs.readFileSync(cacheFilePath);
        return NextResponse.json({
          success: true,
          audioBase64: cachedBuffer.toString('base64'),
          mime: provider === 'vieneu' ? 'audio/wav' : 'audio/mpeg',
        });
      } catch (err) {
        console.warn(`[Voice Preview Cache] Lỗi đọc file cache: ${err.message}`);
      }
    }

    if (provider === 'vieneu') {
      const db = await getMongoClientDb();
      const settingsRecord = await db.collection('settings').findOne({});
      const serverUrl = settingsRecord?.vieneuServerUrl || 'http://127.0.0.1:8001';
      const rawSampleText = (text && text.trim()) || DEFAULT_PREVIEW_TEXT.vi;
      // Giữ nguyên các thẻ cảm xúc như [cười] cho VieNeu-TTS, chỉ loại bỏ tên nhân vật ở đầu câu thoại
      const sampleText = rawSampleText
        .replace(/^[A-Za-z0-9\s]+:\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();

      try {
        const res = await fetch(`${serverUrl}/synthesize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sampleText,
            voice: voiceId,
            style: 'tu_nhien'
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Lỗi phản hồi từ VieNeu-TTS Server');
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Save to cache directory
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(cacheFilePath, buffer);

        return NextResponse.json({
          success: true,
          audioBase64: buffer.toString('base64'),
          mime: 'audio/wav',
        });
      } catch (err) {
        return NextResponse.json({ error: `Lỗi VieNeu-TTS: ${err.message}. Đảm bảo máy chủ VieNeu-TTS đang hoạt động tại ${serverUrl}` }, { status: 500 });
      }
    }

    if (provider === 'edge') {
      const rawSampleText = (text && text.trim()) || DEFAULT_PREVIEW_TEXT[guessPreviewLang(voiceId)];
      const sampleText = rawSampleText
        .replace(/^[A-Za-z0-9\s]+:\s*/, '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      let buffer;
      if (isCapcutVoice(voiceId)) {
        // CapCut là giọng CHỈ tiếng Việt — phiên âm lại từ tiếng Anh lẫn trong câu mẫu trước khi
        // đọc thử, để "Nghe thử" phản ánh đúng âm thanh sẽ nghe được lúc tạo video thật.
        const db = await getMongoClientDb();
        const settingsRecord = await db.collection('settings').findOne({});
        const geminiApiKeys = parseApiKeys(settingsRecord?.geminiApiKey || '');
        const capcutSampleText = await transliterateEnglishForVietnameseTts(sampleText, geminiApiKeys);
        try {
          const result = await synthesizeCapcutTts({ text: capcutSampleText, voice: voiceId, readingSpeed: 'medium' });
          buffer = result.buffer;
        } catch (capcutErr) {
          console.warn(`[CapCut Preview Fallback] CapCut bị lỗi (${capcutErr.message}), tự động chuyển sang Edge TTS...`);
          const fallbackVoice = (voiceId.includes('female') || voiceId.includes('huong') || voiceId.includes('peiqi') || voiceId.includes('yangguang') || voiceId.includes('richgirl')) ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
          const result = await synthesizeEdgeTts({ text: capcutSampleText, voice: fallbackVoice, readingSpeed: 'medium' });
          buffer = result.buffer;
        }
      } else {
        const result = await synthesizeEdgeTts({ text: sampleText, voice: voiceId, readingSpeed: 'medium' });
        buffer = result.buffer;
      }
      // Save to cache directory
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(cacheFilePath, buffer);

      return NextResponse.json({
        success: true,
        audioBase64: buffer.toString('base64'),
        mime: 'audio/mpeg',
      });
    }

    // ElevenLabs: gọi thẳng endpoint TTS thường (không cần mốc thời gian cho 1 đoạn nghe thử
    // ngắn) bằng API key đầu tiên đang cấu hình — không cần xoay vòng nhiều tài khoản/kiểm tra
    // quota chỉ để phát thử vài giây.
    const db = await getMongoClientDb();
    const settingsRecord = await db.collection('settings').findOne({});
    const accounts = parseElevenlabsAccounts(settingsRecord);
    if (accounts.length === 0) {
      return NextResponse.json({ error: 'Chưa cấu hình ElevenLabs API Key.' }, { status: 400 });
    }
    const sampleText = (text && text.trim()) || DEFAULT_PREVIEW_TEXT.en;

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': accounts[0].apiKey,
      },
      body: JSON.stringify({
        text: sampleText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Lỗi ElevenLabs: ${errorText}` }, { status: 500 });
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to cache directory
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cacheFilePath, buffer);

    return NextResponse.json({
      success: true,
      audioBase64: buffer.toString('base64'),
      mime: 'audio/mpeg',
    });
  } catch (error) {
    console.error('[API Voice Preview Exception]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tạo giọng mẫu.' }, { status: 500 });
  }
}
