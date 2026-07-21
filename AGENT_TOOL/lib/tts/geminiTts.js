import { DEFAULT_GEMINI_FEMALE_VOICE } from './geminiVoices.js';

function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function deriveWordTimings(text, totalDurationSec = 3.5) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const durationPerWord = totalDurationSec / words.length;
  return words.map((w, i) => ({
    word: w,
    start: Number((i * durationPerWord).toFixed(2)),
    end: Number(((i + 1) * durationPerWord).toFixed(2))
  }));
}

export async function synthesizeGeminiTts({ text, apiKey, voice = DEFAULT_GEMINI_FEMALE_VOICE }) {
  if (!text || !text.trim()) {
    throw new Error('Thiếu văn bản cần đọc.');
  }
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chưa cấu hình Gemini API Key.');
  }

  const keys = Array.isArray(apiKey) ? apiKey : String(apiKey).split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
  const modelsToTry = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.0-flash'];
  let response = null;
  let lastError = null;

  for (const key of keys) {
    for (const modelName of modelsToTry) {
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Read aloud the following text with clear, natural pronunciation:\n\n${text.trim()}`
                    }
                  ]
                }
              ],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voice || DEFAULT_GEMINI_FEMALE_VOICE
                    }
                  }
                }
              }
            })
          });

          if (res.ok) {
            response = res;
            console.log(`[Gemini TTS Success] Dùng mô hình: ${modelName}`);
            break;
          }

          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;

          if (res.status === 429) {
            if (attempts < maxAttempts) {
              console.log(`[Gemini TTS Rate-Limit 429] Mô hình ${modelName} chạm giới hạn. Tự động chờ 2.5s rồi thử lại (Lần ${attempts}/${maxAttempts})...`);
              await new Promise(r => setTimeout(r, 2500));
              continue;
            } else {
              console.log(`[Gemini TTS Auto-Switch] Mô hình ${modelName} đã hết lượt (429). Chuyển sang mô hình/Key tiếp theo...`);
            }
          } else {
            console.warn(`[Gemini TTS Warning] Mô hình ${modelName}: ${errMsg}`);
          }

          lastError = new Error(`[${modelName}] ${errMsg}`);
          break;
        } catch (err) {
          console.error(`[Gemini TTS Exception] Model: ${modelName} ->`, err.message);
          lastError = err;
          break;
        }
      }

      if (response) break;
    }
    if (response) break;
  }

  if (!response) {
    throw new Error(lastError ? lastError.message : 'Lỗi gọi Gemini TTS API.');
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  let audioPart = parts.find(p => p.inlineData && p.inlineData.data);
  if (!audioPart) {
    throw new Error('Gemini API không trả về dữ liệu âm thanh (inlineData audio).');
  }

  const base64Data = audioPart.inlineData.data;
  const mimeType = audioPart.inlineData.mimeType || 'audio/mp3';
  let buffer = Buffer.from(base64Data, 'base64');

  // Nếu Gemini trả về dạng raw PCM / L16 (chưa có RIFF WAV header), tự động bổ sung WAV header 44-byte chuẩn
  if (!mimeType.includes('mp3') && !mimeType.includes('wav') && !buffer.slice(0, 4).toString('utf8').includes('RIFF')) {
    buffer = pcmToWav(buffer, 24000, 1, 16);
  }

  const estimatedDuration = Math.max(1.5, (text.split(/\s+/).length * 0.35));
  const wordTimings = deriveWordTimings(text.trim(), estimatedDuration);

  return {
    buffer,
    wordTimings
  };
}
