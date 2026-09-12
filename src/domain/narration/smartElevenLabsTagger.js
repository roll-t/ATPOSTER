/**
 * Tự động phân tích ngữ cảnh và chèn tag cảm xúc cho ElevenLabs v3.
 *
 * Bộ quy tắc dựa trên cấu trúc kịch bản video:
 *  - Slide 1 (Hook/Mở đầu): dùng [curious] nếu có câu hỏi hoặc [thoughtful] để mở đầu trầm ấm.
 *  - Câu hỏi (?): chèn [curious] trước câu và [pause] sau dấu hỏi.
 *  - Câu kịch tính/cao trào (biến mất, đột ngột, thảm họa, sụp đổ, đóng băng, chết...): [dramatic] hoặc [solemn].
 *  - Câu tĩnh lặng/bí ẩn/lạnh lẽo (tối đen, dưới đáy sâu, vô định, cô độc, lặng lẽ...): [whispers] hoặc [sighs].
 *  - Điểm chuyển ý/bước ngoặt (nhưng, tuy nhiên, sự thật là, hóa ra...): [pause].
 *  - Slide kết thúc: [thoughtful] hoặc [sighs] để tạo dư âm.
 */

const QUESTION_STARTERS = /^(nếu|tại sao|vì sao|liệu|điều gì|bạn có biết|ai|thế nào|làm sao|how|why|what|if)\b/iu;

const DRAMATIC_WORDS = /\b(đột ngột|biến mất|mất lực hấp dẫn|văng thẳng|chết sạch|đóng băng|hóa lỏng|cực hạn|nguội lạnh|bùng nổ|thảm họa|kinh hoàng|kinh ngạc|phá hủy|sụp đổ|hủy diệt|nguy hiểm|chết chóc|tận thế)\b/iu;

const QUIET_WORDS = /\b(tối đen|đáy sâu|vô định|cô độc|lặng lẽ|âm thầm|cô đơn|lạnh lẽo|chìm vào|dưới lòng đất|xa xôi|vĩnh viễn)\b/iu;

const TURNING_WORDS = /\b(nhưng|tuy nhiên|thực ra|sự thật là|hóa ra|song|mặc dù|dù vậy)\b/iu;

/**
 * Gắn tag cho một câu hoặc một slide đơn lẻ.
 */
export function tagSingleSentence(text, { isFirst = false, isLast = false } = {}) {
  let s = String(text || '').trim();
  if (!s) return '';

  // Nếu câu này đã có sẵn tag [tag] thì giữ nguyên
  if (/\[[^\]]+\]/.test(s)) return s;

  const tagsBefore = [];

  // Mở đầu kịch bản
  if (isFirst) {
    if (QUESTION_STARTERS.test(s) || s.includes('?')) {
      tagsBefore.push('[curious]');
    } else {
      tagsBefore.push('[thoughtful]');
    }
  } else if (isLast) {
    if (QUIET_WORDS.test(s)) {
      tagsBefore.push('[solemn]');
    } else {
      tagsBefore.push('[thoughtful]');
    }
  } else {
    // Các slide ở giữa
    if (DRAMATIC_WORDS.test(s)) {
      tagsBefore.push('[dramatic]');
    } else if (QUIET_WORDS.test(s)) {
      tagsBefore.push('[whispers]');
    } else if (QUESTION_STARTERS.test(s)) {
      tagsBefore.push('[curious]');
    }
  }

  // Xử lý các dấu ngắt nhịp bên trong câu
  // Thêm [pause] sau dấu hỏi nếu chưa có
  s = s.replace(/\?(\s+)(?!\[pause\])/g, '? [pause]$1');

  // Thêm [pause] sau các từ chuyển ý mạnh ("Nhưng,", "Tuy nhiên,")
  s = s.replace(/(?<=\b(?:nhưng|tuy nhiên|thực ra|sự thật là)\b,?\s+)(?!\[pause\])/giu, '[pause] ');

  // Câu kết thúc nếu là slide cuối và mang tính dư âm
  if (isLast && QUIET_WORDS.test(s) && !s.includes('[sighs]')) {
    s = s.replace(/(\.|\!)$/, '... [sighs]');
  }

  const prefix = tagsBefore.length > 0 ? `${tagsBefore.join(' ')} ` : '';
  return `${prefix}${s}`.replace(/\s+/g, ' ').trim();
}

/**
 * Tự động gắn tag cảm xúc ElevenLabs cho danh sách segments.
 */
export function tagSegmentsForElevenLabs(segments = []) {
  const valid = (segments || []).filter((s) => !s.isThumbnail && !s.dialogueOrNarration?.includes('Thumbnail'));
  const total = valid.length;

  return (segments || []).map((seg) => {
    if (seg.isThumbnail || seg.dialogueOrNarration?.includes('Thumbnail')) {
      return seg;
    }
    const idx = valid.findIndex((v) => v.segmentNumber === seg.segmentNumber);
    const isFirst = idx === 0;
    const isLast = idx === total - 1;

    const taggedText = tagSingleSentence(seg.dialogueOrNarration, { isFirst, isLast });
    return {
      ...seg,
      dialogueWithTags: taggedText
    };
  });
}
