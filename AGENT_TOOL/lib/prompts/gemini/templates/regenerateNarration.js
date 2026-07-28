import { getMoralTalkStyleReference } from './moralTalkVoiceStyle.js';
import { buildPunctuationRhythmGuidance, buildVietnamesePronunciationNote } from './narrationPacing.js';
import { buildHookGuidance, buildHumanVoiceGuidance } from './humanVoice.js';

/**
 * Xây dựng prompt gửi cho Gemini để VIẾT LẠI riêng phần lời kể/thoại (dialogueOrNarration +
 * subtitle) của một kịch bản slideshow ĐÃ CÓ SẴN ảnh (stick_figure_slideshow /
 * moral_talk_slideshow) — dùng khi người dùng đã ưng ý bộ ảnh (Google Flow) nhưng muốn thử
 * một lời kể khác (ví dụ để áp dụng hướng dẫn nhịp điệu/chiều sâu tâm lý mới) mà KHÔNG phải
 * tạo lại toàn bộ kịch bản (sẽ làm lệch visualDescription khỏi ảnh đã sinh).
 *
 * Khác với buildMoralTalkSlideshowScriptPrompt/buildImageSlideshowScriptPrompt (tự do sáng
 * tác cả visualDescription lẫn narration), prompt này CỐ ĐỊNH visualDescription của từng slide
 * (gửi kèm làm ngữ cảnh bắt buộc phải khớp) và chỉ yêu cầu Gemini sáng tác lại phần lời kể.
 *
 * QUAN TRỌNG: với category moral_talk_slideshow, dùng CHUNG getMoralTalkStyleReference() với
 * buildMoralTalkSlideshowScriptPrompt (theo đúng input.moralTheme) — trước đây file này tự có
 * 1 bản "psychological resonance" riêng, không biết gì về moralTheme, nên bấm "Viết lại lời kể"
 * trên 1 project top_lists lại ra văn phong tự sự chung chung (kiểu self_help) thay vì đúng
 * khuôn liệt kê "Một, Hai, Ba..." của top_lists — khiến kết quả trông như bị viết lại "từ đầu
 * dựa trên tiêu đề" thay vì tiếp nối đúng cấu trúc nội dung đã có.
 */
export function buildRegenerateNarrationPrompt(category, input, segments) {
  const isMoralTalk = category === 'moral_talk_slideshow';
  const isVietnamesePrimary = isMoralTalk ? (input.narrationLanguage || 'vi') !== 'en' : false;
  const theme = input.moralTheme || 'self_help';
  const moralStyle = isMoralTalk ? getMoralTalkStyleReference(theme) : null;

  const languageAndToneBlock = isMoralTalk
    ? (isVietnamesePrimary
      ? `- The narration (dialogueOrNarration) MUST be written in natural, warm, spoken VIETNAMESE — it will be sent directly to a Vietnamese voice narrator. Use simple, everyday Vietnamese.
- Subtitle language: for EVERY segment, the "subtitle" field must contain the Vietnamese line FIRST, then a literal "\\n", then a natural, accurate simple-English translation of that same line.
- On-screen emphasis markup: in the "subtitle" field's PRIMARY (Vietnamese) line only, wrap 1 to 3 short key words/phrases in double asterisks so they render in a highlight color on screen — e.g. "Một. Tôn trọng **ranh giới**, không phải **điều tra gia cảnh**." Never mark the translation line or "dialogueOrNarration". Keep it sparse.
- ${buildVietnamesePronunciationNote()}`
      : `- The narration (dialogueOrNarration) MUST be written in simple, natural, spoken ENGLISH (CEFR A2-B1 level) — it will be sent directly to an English voice narrator.
- Subtitle language: for EVERY segment, the "subtitle" field must contain the English line FIRST, then a literal "\\n", then a natural, accurate Vietnamese translation of that same line.`)
    : `- The narration (dialogueOrNarration) MUST be written in simple, basic English (suitable for high school level, TOEIC 300+ level). Short, clear sentences, no advanced expressions.
- Subtitle language: for EVERY segment, the "subtitle" field must contain the English line FIRST, then a literal "\\n", then a natural, accurate Vietnamese translation of that same line.`;

  const narrationModeLine = isMoralTalk
    ? moralStyle.narrationModeLine
    : `- Write it as ONE narrator's voiceover (third-person, documentary/storytelling tone).`;

  const styleReferenceBlock = isMoralTalk ? `\n${moralStyle.styleReferenceBlock}\n` : '';

  // top_lists thường có 1 slide mở đầu nêu số lượng điểm ("5 nguyên tắc..."/"Top 5 nguyên
  // tắc...") — vì số slide giữ NGUYÊN như kịch bản cũ (không được đổi count khi viết lại), chỉ
  // cần nhắc Gemini giữ số đó khớp với số slide liệt kê thực tế bên dưới, không tự ý đổi số mà
  // không đổi số lượng slide — đồng thời sửa luôn nếu bản cũ lỡ mở đầu bằng "Có" (không dùng nữa).
  const listCountNote = isMoralTalk && !moralStyle.isReflectiveTheme
    ? `\nNOTE: if the first slide's narration states a count of points (e.g. "5 nguyên tắc..." or "Top 5 nguyên tắc..."), keep that number accurate to how many list-point slides actually follow below (do not change the total slide count, only the wording) — and if the current wording opens with "Có" (e.g. "Có 5 nguyên tắc..."), drop that "Có" and start directly with the number/"Top" instead.\n`
    : '';

  const segmentsList = segments
    .map((seg) => {
      const oldText = String(seg.dialogueOrNarration || seg.subtitle || '').replace(/"/g, "'").replace(/\s+/g, ' ').trim();
      return `Slide ${seg.segmentNumber}:
- Visual (already generated as an image — do NOT change what it depicts, the new narration must still make sense next to it): ${seg.visualDescription || '(no description available)'}
- Current narration (REPLACE this with new wording, do not reuse it): "${oldText}"`;
    })
    .join('\n\n');

  return `
You are a professional scriptwriter, rewriting ONLY the spoken narration of an already-illustrated short video — the images for every slide below are FINAL and will not change, so the new narration for each slide must still make sense next to its (unchanged) image, in the same order, telling one continuous story.

USER'S ORIGINAL TOPIC / LIFE LESSON:
"${input.scenario || 'No specific topic given'}"

NARRATION STYLE REQUIREMENTS (IMPORTANT):
- This is NOT a conversation/dialogue between characters. Do NOT write back-and-forth lines.
${narrationModeLine}
- Write GENUINELY DIFFERENT wording from the "Current narration" shown for each slide below — do not just lightly rephrase it, actually rewrite it — while still matching what that slide's image depicts.
${languageAndToneBlock}
- Do NOT include bracketed tags like "[pause]", "[softly]", "[warmly]", "[gently]" anywhere in the new narration — the voice engine does not read them and does not act on them, they have zero effect on the spoken audio and only show up as clutter in the text (drop any such tags you see in the "Current narration" below too — do not carry them over). Express emotion/pacing through word choice and punctuation instead.
- ${buildPunctuationRhythmGuidance()}

${buildHumanVoiceGuidance({ isVietnamese: isVietnamesePrimary })}

${buildHookGuidance({ isVietnamese: isVietnamesePrimary })}
- Applied to this rewrite: slide 1's new narration must open with that hook sentence. If the current slide-1 narration warms up before getting to the point, that warm-up is exactly what you must delete.
${styleReferenceBlock}${listCountNote}
EXISTING SLIDES (in order — write new narration for each, keep the same segmentNumber, same count, same order):
${segmentsList}

Return the result as a JSON object matching exactly this schema, with EXACTLY ${segments.length} items in "segments", one per slide above, in the same order:
{
  "segments": [
    { "segmentNumber": ${segments[0]?.segmentNumber ?? 1}, "dialogueOrNarration": "New full narration line for this slide, in the primary language specified above.", "subtitle": "Bilingual subtitle for this slide following the convention above." }
  ]
}
`;
}
