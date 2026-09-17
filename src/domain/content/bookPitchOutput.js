function clean(value) {
  return String(value || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

/** Đọc nguồn sách từ cả brief mới lẫn chuỗi syllabus cũ. */
export function extractBookPitchSource(scenario) {
  const text = String(scenario || '');
  const structured = text.match(/NGUỒN SÁCH:\s*([^\n—]+(?:\s+[^\n—]+)*?)\s+—\s+([^\n]+)/i);
  if (structured) {
    return { bookTitle: clean(structured[1]), author: clean(structured[2]) };
  }

  const legacy = text.match(/^\s*([^\n(]+?)\s*\(([^)]+)\)\s*—/);
  if (legacy) {
    return { bookTitle: clean(legacy[1]), author: clean(legacy[2]) };
  }

  return null;
}

/** Nhận diện cả input mới đúng registry lẫn manifest cũ có theme đã bị dịch sai. */
export function isBookPitchInput(input) {
  return isBookMoralTheme(input?.moralTheme) || Boolean(extractBookPitchSource(input?.scenario));
}

/** Trả theme hợp lệ để prompt chọn đúng voice book_pitch cho cả dữ liệu cũ. */
export function resolveMoralThemeForPrompt(input, fallback = 'self_help') {
  if (isBookMoralTheme(input?.moralTheme)) return input.moralTheme;
  if (extractBookPitchSource(input?.scenario)) return DEFAULT_BOOK_THEME;
  return input?.moralTheme || fallback;
}

/**
 * Lưới an toàn sau Gemini: book pitch phải giới thiệu sách trong hai nhịp đầu. Nếu model bỏ qua
 * dù prompt đã bắt buộc, thay nhịp 2 bằng một câu reveal ngắn thay vì trả về video không bán sách.
 */
export function ensureEarlyBookReveal(result, scenario) {
  const source = extractBookPitchSource(scenario);
  if (!source || !Array.isArray(result?.segments) || result.segments.length < 2) return result;

  const openingText = result.segments
    .slice(0, 2)
    .map(segment => clean(`${segment.dialogueOrNarration || ''} ${segment.subtitle || ''}`).toLocaleLowerCase('vi'))
    .join(' ');
  const titleNeedle = source.bookTitle.toLocaleLowerCase('vi');
  if (titleNeedle && openingText.includes(titleNeedle)) return result;

  const reveal = `${source.bookTitle} của ${source.author} chỉ ra điều ít ai để ý.`;
  const subtitle = `**${source.bookTitle}** — ${source.author}`;
  const segments = result.segments.map((segment, index) => (
    index === 1
      ? { ...segment, dialogueOrNarration: reveal, subtitle }
      : segment
  ));

  return { ...result, segments };
}
import { DEFAULT_BOOK_THEME, isBookMoralTheme } from './moralThemes.js';

