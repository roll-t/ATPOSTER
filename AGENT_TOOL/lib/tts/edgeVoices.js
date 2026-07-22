// Danh sách giọng đọc Microsoft Edge TTS (miễn phí, không cần API key, không giới hạn ký tự)
// được chọn lọc thủ công — phân loại rõ Nam 👨, Nữ 👩, Lão / Trung niên 👴👵, Trẻ em 👧👦
export const EDGE_TTS_VOICES = [
  { id: 'en-US-AriaNeural', label: '👩 Aria — Nữ, Mỹ (tự nhiên, rõ ràng)', name: 'Aria', genderText: 'Nữ', icon: '👩', desc: 'Mỹ (tự nhiên, rõ ràng)', category: 'female' },
  { id: 'en-US-JennyNeural', label: '👩 Jenny — Nữ, Mỹ (ấm áp, thân thiện)', name: 'Jenny', genderText: 'Nữ', icon: '👩', desc: 'Mỹ (ấm áp, thân thiện)', category: 'female' },
  { id: 'en-US-GuyNeural', label: '👨 Guy — Nam, Mỹ (trầm ấm, tự tin)', name: 'Guy', genderText: 'Nam', icon: '👨', desc: 'Mỹ (trầm ấm, tự tin)', category: 'male' },
  { id: 'en-US-DavisNeural', label: '👦 Davis — Nam trẻ / Trẻ trung, Mỹ', name: 'Davis', genderText: 'Nam trẻ', icon: '👦', desc: 'Mỹ (trẻ trung)', category: 'youth' },
  { id: 'en-US-AnaNeural', label: '👧 Ana — Bé gái / Trẻ em, Mỹ (dễ thương)', name: 'Ana', genderText: 'Bé gái', icon: '👧', desc: 'Mỹ (dễ thương)', category: 'child' },
  { id: 'en-US-ChristopherNeural', label: '👴 Christopher — Ông lão / Nam điềm đạm, Mỹ', name: 'Christopher', genderText: 'Ông lão', icon: '👴', desc: 'Mỹ (điềm đạm, trầm)', category: 'elderly' },
  { id: 'en-US-MichelleNeural', label: '👵 Michelle — Bà lão / Nữ trung niên, Mỹ', name: 'Michelle', genderText: 'Bà lão', icon: '👵', desc: 'Mỹ (trầm ấm, hiền hậu)', category: 'elderly' },
  { id: 'en-GB-SoniaNeural', label: '👩 Sonia — Nữ, Anh-Anh (sang trọng)', name: 'Sonia', genderText: 'Nữ', icon: '👩', desc: 'Anh-Anh (sang trọng)', category: 'female' },
  { id: 'en-GB-RyanNeural', label: '👨 Ryan — Nam, Anh-Anh (lịch lãm)', name: 'Ryan', genderText: 'Nam', icon: '👨', desc: 'Anh-Anh (lịch lãm)', category: 'male' },
  { id: 'en-AU-NatashaNeural', label: '👩 Natasha — Nữ, Úc', name: 'Natasha', genderText: 'Nữ', icon: '👩', desc: 'Úc', category: 'female' },
  { id: 'vi-VN-HoaiMyNeural', label: '🇻🇳 👩 Hoài My — Nữ, Việt Nam', name: 'Hoài My', genderText: 'Nữ', icon: '🇻🇳 👩', desc: 'Việt Nam', category: 'vi' },
  { id: 'vi-VN-NamMinhNeural', label: '🇻🇳 👨 Nam Minh — Nam, Việt Nam', name: 'Nam Minh', genderText: 'Nam', icon: '🇻🇳 👨', desc: 'Việt Nam', category: 'vi' },
];

export const DEFAULT_EDGE_FEMALE_VOICE = 'en-US-AriaNeural';
export const DEFAULT_EDGE_MALE_VOICE = 'en-US-GuyNeural';

export function isKnownEdgeVoice(id) {
  return EDGE_TTS_VOICES.some((v) => v.id === id);
}
