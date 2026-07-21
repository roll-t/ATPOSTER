// Danh sách giọng đọc Microsoft Edge TTS (miễn phí, không cần API key, không giới hạn ký tự)
// được chọn lọc thủ công — dịch vụ thật có ~400+ giọng, nhưng chỉ liệt kê ở đây những giọng
// neural chất lượng cao, ổn định, quen thuộc cho tiếng Anh + tiếng Việt, để UI không bị rối.
// Tên giọng (id) phải khớp CHÍNH XÁC "ShortName" mà Microsoft đặt — xem MsEdgeTTS.getVoices()
// nếu cần đối chiếu hoặc bổ sung thêm giọng khác.
export const EDGE_TTS_VOICES = [
  { id: 'en-US-AriaNeural', label: 'Aria — Nữ, Mỹ (tự nhiên, rõ ràng)', gender: 'female', lang: 'en' },
  { id: 'en-US-JennyNeural', label: 'Jenny — Nữ, Mỹ (ấm áp, thân thiện)', gender: 'female', lang: 'en' },
  { id: 'en-US-GuyNeural', label: 'Guy — Nam, Mỹ (trầm, tự tin)', gender: 'male', lang: 'en' },
  { id: 'en-US-DavisNeural', label: 'Davis — Nam, Mỹ (trẻ trung)', gender: 'male', lang: 'en' },
  { id: 'en-US-AnaNeural', label: 'Ana — Nữ, Mỹ (giọng trẻ em, dễ thương)', gender: 'female', lang: 'en' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia — Nữ, Anh-Anh', gender: 'female', lang: 'en' },
  { id: 'en-GB-RyanNeural', label: 'Ryan — Nam, Anh-Anh', gender: 'male', lang: 'en' },
  { id: 'en-AU-NatashaNeural', label: 'Natasha — Nữ, Úc', gender: 'female', lang: 'en' },
  { id: 'vi-VN-HoaiMyNeural', label: 'Hoài My — Nữ, Việt Nam', gender: 'female', lang: 'vi' },
  { id: 'vi-VN-NamMinhNeural', label: 'Nam Minh — Nam, Việt Nam', gender: 'male', lang: 'vi' },
];

export const DEFAULT_EDGE_FEMALE_VOICE = 'en-US-AriaNeural';
export const DEFAULT_EDGE_MALE_VOICE = 'en-US-GuyNeural';

export function isKnownEdgeVoice(id) {
  return EDGE_TTS_VOICES.some((v) => v.id === id);
}
