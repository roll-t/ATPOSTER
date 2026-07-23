import { NextResponse } from 'next/server';
import { getMongoClientDb } from '@/lib/db.js';
import { synthesizeEdgeTts } from '@/lib/tts/edgeTts.js';
import { parseElevenlabsAccounts } from '@/app/api/prompts/voiceover/route.js';
import { synthesizeCapcutTts, isCapcutVoice } from '@/lib/tts/capcutTts.js';

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
    const { provider, voiceId, text } = await request.json();

    if (!provider || (provider !== 'edge' && provider !== 'elevenlabs')) {
      return NextResponse.json({ error: 'Nhà cung cấp không hợp lệ.' }, { status: 400 });
    }
    if (!voiceId || !String(voiceId).trim()) {
      return NextResponse.json({ error: 'Thiếu ID giọng đọc cần nghe thử.' }, { status: 400 });
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
        try {
          const result = await synthesizeCapcutTts({ text: sampleText, voice: voiceId, readingSpeed: 'medium' });
          buffer = result.buffer;
        } catch (capcutErr) {
          console.warn(`[CapCut Preview Fallback] CapCut bị lỗi (${capcutErr.message}), tự động chuyển sang Edge TTS...`);
          const fallbackVoice = (voiceId.includes('female') || voiceId.includes('huong') || voiceId.includes('peiqi') || voiceId.includes('yangguang') || voiceId.includes('richgirl')) ? 'vi-VN-HoaiMyNeural' : 'vi-VN-NamMinhNeural';
          const result = await synthesizeEdgeTts({ text: sampleText, voice: fallbackVoice, readingSpeed: 'medium' });
          buffer = result.buffer;
        }
      } else {
        const result = await synthesizeEdgeTts({ text: sampleText, voice: voiceId, readingSpeed: 'medium' });
        buffer = result.buffer;
      }
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
    return NextResponse.json({
      success: true,
      audioBase64: Buffer.from(arrayBuffer).toString('base64'),
      mime: 'audio/mpeg',
    });
  } catch (error) {
    console.error('[API Voice Preview Exception]:', error);
    return NextResponse.json({ error: error.message || 'Lỗi không xác định khi tạo giọng mẫu.' }, { status: 500 });
  }
}
