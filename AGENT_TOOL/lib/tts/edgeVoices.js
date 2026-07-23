import { isCapcutVoice } from './capcutTts.js';

// Danh sách giọng đọc Microsoft Edge & CapCut TTS (miễn phí, không cần API key)
// được chọn lọc thủ công — phân loại rõ Nam 👨, Nữ 👩, Lão / Trung niên 👴👵, Trẻ em 👧👦
export const EDGE_TTS_VOICES = [
  // CapCut Voices (Ưu tiên lên đầu)
  { id: 'multi_male_felipe_uranus_bigtts', label: '🇻🇳 👨 Nam Trầm (CapCut) — Trầm, ấm áp (Đạo lý)', name: 'Nam Trầm (CapCut)', genderText: 'Nam', icon: '🇻🇳 👨', desc: 'CapCut (Bắc trầm, ấm áp)', category: 'vi' },
  { id: 'BV560_streaming', label: '🇻🇳 👨 Alex Đại Đế (CapCut) — Nam tự nhiên', name: 'Alex Đại Đế (CapCut)', genderText: 'Nam', icon: '🇻🇳 👨', desc: 'CapCut (Nam Bắc tự nhiên)', category: 'vi' },
  { id: 'BV075_streaming', label: '🇻🇳 👨 Thanh Niên Tự Tin (CapCut) — Nam năng động', name: 'Thanh Niên Tự Tin (CapCut)', genderText: 'Nam', icon: '🇻🇳 👨', desc: 'CapCut (Nam Bắc năng động)', category: 'vi' },
  { id: 'multi_female_xinwenjieshuo_uranus_bigtts', label: '🇻🇳 👨 Nam Bản Tin (CapCut) — Nam tin tức', name: 'Nam Bản Tin (CapCut)', genderText: 'Nam', icon: '🇻🇳 👨', desc: 'CapCut (Nam Bắc tin tức)', category: 'vi' },
  { id: 'vi_female_huong', label: '🇻🇳 👩 Nữ Phổ Thông (CapCut) — Nữ Bắc chuẩn', name: 'Nữ Phổ Thông (CapCut)', genderText: 'Nữ', icon: '🇻🇳 👩', desc: 'CapCut (Nữ Bắc chuẩn)', category: 'vi' },
  { id: 'multi_female_richgirl_uranus_bigtts', label: '🇻🇳 👩 Review Phim (CapCut) — Nữ review phim', name: 'Review Phim (CapCut)', genderText: 'Nữ', icon: '🇻🇳 👩', desc: 'CapCut (Nữ review phim)', category: 'vi' },
  { id: 'multi_female_yangguangnv_uranus_bigtts', label: '🇻🇳 👩 Ban Mai (CapCut) — Nữ Bắc truyền cảm', name: 'Ban Mai (CapCut)', genderText: 'Nữ', icon: '🇻🇳 👩', desc: 'CapCut (Nữ Bắc truyền cảm)', category: 'vi' },
  
  // Edge TTS Voices
  { id: 'vi-VN-NamMinhNeural', label: '🇻🇳 👨 Nam Minh (Edge) — Nam, Việt Nam (Giọng Miền Nam)', name: 'Nam Minh (Edge)', genderText: 'Nam', icon: '🇻🇳 👨', desc: 'Edge (Giọng Miền Nam)', category: 'vi' },
  { id: 'vi-VN-HoaiMyNeural', label: '🇻🇳 👩 Hoài My (Edge) — Nữ, Việt Nam (Giọng Miền Nam)', name: 'Hoài My (Edge)', genderText: 'Nữ', icon: '🇻🇳 👩', desc: 'Edge (Giọng Miền Nam)', category: 'vi' },
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
];

export const DEFAULT_EDGE_FEMALE_VOICE = 'vi_female_huong';
export const DEFAULT_EDGE_MALE_VOICE = 'multi_male_felipe_uranus_bigtts';

export function isKnownEdgeVoice(id) {
  return EDGE_TTS_VOICES.some((v) => v.id === id) || isCapcutVoice(id);
}
