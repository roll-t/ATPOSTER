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

export function buildPexelsTalkVideoScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isVietnamesePrimary = (input.narrationLanguage || 'vi') !== 'en';
  const theme = input.moralTheme || 'self_help';
  const { isReflectiveTheme, narrationModeLine, styleReferenceBlock } = getMoralTalkStyleReference(theme);

  // Segment counts — fewer and longer than moral_talk_slideshow
  let targetSegments = '4 đến 6';
  let segDuration = '15 đến 25 giây';
  if (durationRange === '1_2m')  { targetSegments = '6 đến 9';   segDuration = '12 đến 20 giây'; }
  if (durationRange === '2_3m')  { targetSegments = '8 đến 12';  segDuration = '15 đến 22 giây'; }
  if (durationRange === '3_4m')  { targetSegments = '10 đến 15'; segDuration = '15 đến 25 giây'; }
  if (durationRange === '4_6m')  { targetSegments = '14 đến 20'; segDuration = '15 đến 25 giây'; }
  if (durationRange === '6_8m')  { targetSegments = '18 đến 26'; segDuration = '15 đến 25 giây'; }
  if (durationRange === '8_10m') { targetSegments = '22 đến 32'; segDuration = '15 đến 25 giây'; }

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

DURATION & PACING:
- Target total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- Split into ${targetSegments} segments. Each segment's narration should be ${segDuration} of speech (about ${Math.round(parseInt(segDuration)*2.7)} to ${Math.round(parseInt(segDuration.split(' đến ')[1] || segDuration)*3)} words${isVietnamesePrimary ? ' tiếng Việt' : ''}).
- Each segment is a PARAGRAPH of continuous narration — NOT a one-liner or a caption. Write full, flowing paragraphs that breathe and develop an idea.
- The segments should feel like chapters of a single emotional journey, building from the hook → development → peak insight → landing/closing.
- durationSeconds should reflect actual estimated speech time (words ÷ 2.5 per second for Vietnamese, ÷ 2.8 for English).

EMOTIONAL DEPTH REQUIREMENTS (more important than moral_talk_slideshow):
- Each paragraph must carry ONE clear emotional/conceptual idea, developed with at least 2–3 sentences of rich context.
- Use concrete sensory details, everyday scenarios, and honest emotional truth — not abstract platitudes.
- The listener should feel understood and moved, not lectured to.
- Allow pauses and breathing room in the text (shorter sentences between longer ones).

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
