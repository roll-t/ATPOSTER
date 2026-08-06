/**
 * Prompt Gemini cho skill "Video Tâm Sự Đạo Lý" (pexels_talk_video).
 *
 * Khác moral_talk_slideshow ở chỗ:
 * - Không có trường visualDescription / pictogram (không sinh ảnh AI)
 * - Mỗi segment dài hơn nhiều (20–60 giây), ít segment hơn, chiều sâu cảm xúc cao hơn
 * - Nền là video Pexels do người dùng chọn → Gemini không cần lo phần hình ảnh
 * - Vẫn dùng getMoralTalkStyleReference() để đảm bảo giọng văn nhất quán với moral_talk
 */
import { getMoralTalkStyleReference } from './moralTalkVoiceStyle.js';
import { getMoralTheme } from '../../moralThemes.js';
import { buildPunctuationRhythmGuidance, buildVietnamesePronunciationNote } from './narrationPacing.js';
import { buildHookGuidance, buildHumanVoiceGuidance } from './humanVoice.js';
import { WORDS_PER_SECOND_VI, WORDS_PER_SECOND_EN } from '../../../speechRate.js';

// Số từ mỗi đoạn kể. ~86 từ ≈ 20 giây đọc ở tốc độ TTS tiếng Việt thật (4.3 từ/giây) — đủ dài để
// phát triển trọn một ý (2-4 câu) mà chưa khiến người nghe mất mạch.
const WORDS_PER_SEGMENT = 86;

/**
 * Tính ngân sách chữ + số đoạn TỪ thời lượng mục tiêu.
 *
 * TRƯỚC ĐÂY số đoạn và độ dài mỗi đoạn được gõ cứng, và tích của hai cận dưới KHÔNG hề bằng thời
 * lượng mục tiêu — vd mốc "3-4 phút" (210 giây) chỉ yêu cầu "10 đoạn × 15 giây" = 150 giây, còn
 * mốc "8-10 phút" (540 giây) chỉ yêu cầu "22 đoạn × 15 giây" = 330 giây. Gemini luôn viết bám cận
 * dưới nên video ra ngắn hơn hẳn mốc đã chọn (đặt 4 phút, dựng xong còn ~2 phút).
 *
 * Giờ mọi con số đều suy ra từ targetSeconds, và cận dưới được đặt sao cho viết đúng cận dưới VẪN
 * đạt thời lượng mục tiêu.
 */
function buildDurationBudget(targetSeconds, isVietnamese) {
  const wps = isVietnamese ? WORDS_PER_SECOND_VI : WORDS_PER_SECOND_EN;
  const totalWords = Math.round(targetSeconds * wps);

  // Cho phép vượt tối đa 20%: thà dài hơn mục tiêu một chút còn hơn hụt, vì khâu dựng luôn cắt
  // được phần thừa nhưng không tự sinh thêm nội dung khi thiếu.
  const minWords = totalWords;
  const maxWords = Math.round(totalWords * 1.2);

  // Đoạn ngắn hơn cho video ngắn (giữ nhịp nhanh, hợp short dọc), đoạn dài dần cho video dài.
  // 48 từ ≈ 11 giây đọc ở tốc độ tiếng Việt thật.
  const wordsPerSegment = targetSeconds <= 60 ? 48 : WORDS_PER_SEGMENT;
  const segments = Math.max(3, Math.round(totalWords / wordsPerSegment));
  const minSegments = Math.max(3, Math.round(segments * 0.95));
  const maxSegments = Math.round(segments * 1.15);

  // Cận dưới số từ mỗi đoạn phải thoả: minSegments × minWordsPerSegment >= minWords.
  const minWordsPerSegment = Math.ceil(minWords / minSegments);
  const maxWordsPerSegment = Math.round(minWordsPerSegment * 1.25);
  const secondsPerSegment = Math.round(minWordsPerSegment / wps);

  return {
    totalWords, minWords, maxWords,
    minSegments, maxSegments,
    minWordsPerSegment, maxWordsPerSegment,
    secondsPerSegment,
  };
}

export function buildPexelsTalkVideoScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isVietnamesePrimary = (input.narrationLanguage || 'vi') !== 'en';
  const theme = input.moralTheme || 'self_help';
  const { isReflectiveTheme, narrationModeLine, styleReferenceBlock } = getMoralTalkStyleReference(theme);

  const budget = buildDurationBudget(durationInfo.targetSeconds, isVietnamesePrimary);
  const isLongForm = durationInfo.targetSeconds >= 240;

  const narrationLanguageBlock = isVietnamesePrimary
    ? `- dialogueOrNarration PHẢI viết bằng tiếng Việt tự nhiên, ấm áp, khẩu ngữ — đây là lời được đọc trực tiếp bởi giọng TTS tiếng Việt. Câu ngắn, nhịp thở tự nhiên. KHÔNG văn viết hàn lâm.
- subtitle: dòng TIẾNG VIỆT trước, rồi "\\n", rồi bản dịch tiếng Anh tự nhiên. Ví dụ: "Bạn có thể **thay đổi** bất cứ lúc nào.\\nYou can change at any time."
- KHÔNG đưa emotion tag "[warmly]" vào subtitle — chỉ được dùng trong dialogueOrNarration.
- ${buildVietnamesePronunciationNote()}`
    : `- dialogueOrNarration MUST be in simple, warm, natural spoken ENGLISH (A2–B1 level), suitable for a calm voiceover. Short sentences with natural phrasing.
- subtitle: English line FIRST, then "\\n", then accurate Vietnamese translation. Example: "You can **change** at any time.\\nBạn có thể thay đổi bất cứ lúc nào."
- NEVER put emotion tags "[warmly]" in subtitle — they belong only inside dialogueOrNarration.`;

  return `You are a professional scriptwriter for "life philosophy / moral wisdom" spoken-word videos — the genre where a calm, warm voice speaks directly to the listener about how to live, feel, and grow.

This is NOT a slideshow with images. The video has a single cinematic background video (nature/atmosphere from Pexels) with animated glass text overlays. Your ONLY task is to write the NARRATION SCRIPT — no image descriptions needed.

NARRATION STYLE REQUIREMENTS:
- This is a direct monologue from a wise, warm friend speaking to the listener ("bạn"/"you"), NOT a third-person story.
${narrationModeLine}
${narrationLanguageBlock}

${buildHumanVoiceGuidance({ isVietnamese: isVietnamesePrimary })}

${buildHookGuidance({ isVietnamese: isVietnamesePrimary })}

${styleReferenceBlock}

DURATION & PACING — THIS IS A HARD CONSTRAINT, TREAT IT AS THE #1 REQUIREMENT:
- Target total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- WORD BUDGET: the "dialogueOrNarration" fields of ALL segments COMBINED must total ${budget.minWords}–${budget.maxWords} words${isVietnamesePrimary ? ' tiếng Việt' : ''}. Writing fewer than ${budget.minWords} words is a FAILED response, no matter how good the writing is — a short script produces a video far shorter than the length the user asked for.
- Split into ${budget.minSegments}–${budget.maxSegments} segments, each ${budget.minWordsPerSegment}–${budget.maxWordsPerSegment} words (about ${budget.secondsPerSegment} seconds of speech).
- Each segment is a PARAGRAPH of continuous narration — NOT a one-liner or a caption. Write full, flowing paragraphs that breathe and develop an idea.
- BEFORE returning the JSON, COUNT the total words across all dialogueOrNarration fields. If the total is below ${budget.minWords}, go back and expand the paragraphs (add concrete detail, a second example, a deeper turn of the idea) until the budget is met. Do NOT pad with repetition or filler — deepen the content instead.
- durationSeconds should reflect actual estimated speech time (words ÷ ${isVietnamesePrimary ? WORDS_PER_SECOND_VI : WORDS_PER_SECOND_EN} per second).

EMOTIONAL DEPTH REQUIREMENTS (more important than moral_talk_slideshow):
- Each paragraph must carry ONE clear emotional/conceptual idea, developed with at least 2–3 sentences of rich context.
- Use concrete sensory details, everyday scenarios, and honest emotional truth — not abstract platitudes.
- The listener should feel understood and moved, not lectured to.
- Allow pauses and breathing room in the text (shorter sentences between longer ones).
${isLongForm ? `
STRUCTURE FOR A LONG VIDEO (${durationInfo.label}) — READ CAREFULLY:
A ${durationInfo.label} video cannot be one single idea stretched thin. A viewer watching this long on YouTube will leave the moment the script starts circling the same thought in different words. Build it in ACTS:

  ACT 1 — OPENING (roughly the first 10% of segments)
    Hook, then name the exact feeling the viewer came here with. Make them think "this is about me".

  ACT 2 — DEVELOPMENT (roughly 65% of segments): 3 to 5 DISTINCT sub-ideas.
    Each sub-idea takes 2–4 consecutive segments and MUST contain one CONCRETE everyday scene —
    a specific moment with a place, a time, an action (e.g. đọc lại tin nhắn lúc 2 giờ sáng;
    ngồi trong xe chưa muốn vào nhà). Abstract statements alone are what makes a long video boring.
    Each sub-idea must add something the previous ones did NOT say.

  ACT 3 — TURN (roughly 15% of segments)
    The reframe: the moment the viewer sees the problem from a new angle. This is the emotional peak.

  ACT 4 — LANDING (roughly 10% of segments)
    Settle it. End on one quotable line.

ANTI-REPETITION RULE (the #1 killer of long videos):
- Before writing each new segment, check every earlier segment. If the new one restates an idea already
  covered, REPLACE it with a genuinely new angle, a new scene, or a deeper consequence of the idea.
- Never reach the word budget by rephrasing the same thought. Reach it by going DEEPER and more SPECIFIC.
- Vary rhythm across acts: short punchy segments at the hook and the turn, longer flowing ones in development.
` : ''}

USER'S TOPIC:
"${input.scenario || 'No specific topic given'}"
Draft / story suggestion (if any):
"${input.script || 'Write freely — follow the style reference above.'}"

WRITING GUIDELINES:
1. ${buildPunctuationRhythmGuidance()}
2. On-screen emphasis: in the "subtitle" PRIMARY line only (NEVER in dialogueOrNarration), wrap 1–2 key phrases per segment in **double asterisks** for visual highlight — choose the most emotionally resonant phrase.
3. The opening segment (segmentNumber: 1) MUST be a strong hook — an arresting question or concrete image that stops the scroll in the first 3 seconds. Keep it short and punchy.
4. The final segment should close with a single quotable line — the kind of sentence someone would screenshot.

Return ONLY a valid JSON object with this exact schema (no markdown fences, no extra keys):
{
  "title": "Short episode title (${isVietnamesePrimary ? '3–6 từ tiếng Việt gây tò mò' : '3–6 words, intriguing'})",
  "segments": [
    {
      "segmentNumber": 1,
      "dialogueOrNarration": "Full narration paragraph for this segment in the primary language. Several sentences, natural rhythm. Emotion tags like [warmly] are allowed here only.",
      "subtitle": "${isVietnamesePrimary
        ? 'Câu hiển thị ngắn gọn nhất từ đoạn này — có **in đậm** 1-2 từ quan trọng.\\nShortest display sentence from this segment — key words in **bold**.'
        : 'Shortest display sentence from this segment — key words in **bold**.\\nCâu hiển thị ngắn gọn — **in đậm** từ quan trọng.'}",
      "durationSeconds": 20
    }
  ]
}
`;
}
