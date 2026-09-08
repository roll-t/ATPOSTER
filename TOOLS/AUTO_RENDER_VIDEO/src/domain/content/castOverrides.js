import { STICK_FIGURE_CHARACTERS } from './characters.js';

/**
 * Lấy mô tả tính cách/ngoại hình/vai trò + giọng nói của dàn nhân vật người que đã chọn,
 * dùng chung cho CẢ luồng tạo prompt thủ công (buildPrompt) LẪN luồng phân đoạn qua Gemini
 * (buildSegmentedPrompts) — đảm bảo tính đồng nhất nhân vật áp dụng ở mọi nơi, không chỉ
 * riêng luồng thủ công.
 */
export function getStickFigureCastOverrides(input) {
  const selectedIds = Array.isArray(input?.characterIds) ? input.characterIds : [];
  const selectedCharacters = STICK_FIGURE_CHARACTERS.filter(c => selectedIds.includes(c.id));
  if (!selectedCharacters.length) {
    return { selectedCharacters, charactersOverride: null, voiceOverride: null };
  }
  const charactersOverride = selectedCharacters
    .map(c => `${c.name} — ${c.en.personality}; distinguishing look: ${c.en.trait}; role: ${c.en.role}`)
    .join(' || ');
  const voiceOverride = selectedCharacters.map(c => `${c.name}: ${c.en.voiceHint}`).join(' || ');
  return { selectedCharacters, charactersOverride, voiceOverride };
}
