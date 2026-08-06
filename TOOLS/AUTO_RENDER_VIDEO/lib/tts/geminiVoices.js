// Danh sách giọng đọc Gemini Flash TTS (Miễn phí qua Gemini API Key)
export const GEMINI_TTS_VOICES = [
  { id: 'Puck', label: 'Puck — Nam, Mỹ (trầm ấm, tự nhiên)', gender: 'male', lang: 'en' },
  { id: 'Charon', label: 'Charon — Nam, Mỹ (rõ ràng, tự tin)', gender: 'male', lang: 'en' },
  { id: 'Fenrir', label: 'Fenrir — Nam, Mỹ (mạnh mẽ, cuốn hút)', gender: 'male', lang: 'en' },
  { id: 'Kore', label: 'Kore — Nữ, Mỹ (nhẹ nhàng, truyền cảm)', gender: 'female', lang: 'en' },
  { id: 'Aoede', label: 'Aoede — Nữ, Mỹ (ấm áp, thân thiện)', gender: 'female', lang: 'en' },
  { id: 'Achernar', label: 'Achernar — Nữ, Mỹ (tự nhiên, sang trọng)', gender: 'female', lang: 'en' },
  { id: 'Ursa', label: 'Ursa — Nữ, Mỹ (rõ ràng, sống động)', gender: 'female', lang: 'en' },
];

export const DEFAULT_GEMINI_FEMALE_VOICE = 'Achernar';
export const DEFAULT_GEMINI_MALE_VOICE = 'Puck';

export function isKnownGeminiVoice(id) {
  return GEMINI_TTS_VOICES.some((v) => v.id === id);
}
