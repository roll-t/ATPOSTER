import { STICK_FIGURE_CHARACTERS } from '../../characters.js';

/**
 * Xây dựng prompt meta gửi cho Gemini để sinh kịch bản phân đoạn cho dòng
 * "Video Người Que Học Tiếng Anh". Nội dung prompt viết bằng tiếng Anh để đồng nhất
 * với toàn bộ format prompt Veo3.
 */
export function buildStickFigureScriptPrompt(input, durationInfo) {
  const selectedIds = Array.isArray(input.characterIds) ? input.characterIds : [];
  const selectedChars = STICK_FIGURE_CHARACTERS.filter(c => selectedIds.includes(c.id));
  const charsDetail = selectedChars
    .map(c => `- ${c.name}: Personality: ${c.en.personality}. Appearance: ${c.en.trait}. Role: ${c.en.role}.`)
    .join('\n');

  return `
You are a professional screenwriter and an expert Veo3 AI video prompt engineer.
Your task is to write a short stick-figure animation script for learning English, following the minimalist visual style of the "Stickman English" channel.

VISUAL STYLE & MOTION:
- Describe the visuals in detail in English (visualDescription) following this standard: "A minimalist 2D animation, hand-drawn thick black ink outline stick figures, highly expressive cartoon faces with simple dot eyes and mouth lines. The background is a clean solid white paper texture, completely plain with zero clutter. Clean smooth lines, high contrast black-and-white art style. Dynamic comic movements, expressive hand gestures."
- Composition: stick figures move dynamically, with clean unbroken linework.
- Mouths must stay simple and clean while speaking: a small line that opens/closes minimally. Avoid fast, exaggerated, or rapid lip-flapping motion — that renders as a blurry smudge. Keep mouth movement slow and minimal.
- The speech-bubble caption (see "subtitle" below) must appear instantly with a hard cut — never describe it fading in, sliding in, or animating in any way. It stays static on screen for the full line, then cuts directly to the next caption (or disappears) the same way, with no transition animation.

DURATION & PACING REQUIREMENTS (IMPORTANT — READ CAREFULLY):
- Target total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- Since Veo3 can only generate up to 10 seconds per generation, the user generates ONE segment at a time and then uses Veo's native "extend/continue video" feature to chain the next segment's prompt onto the end of the previous clip. Because of this, segments do NOT need to be self-contained, fully-wrapped-up narrative beats — a line of dialogue, a gesture, or an action MAY continue naturally across a segment boundary.
- Instead, pace each segment's action/dialogue so it naturally fills the segment's ENTIRE duration.
- BẮT BUỘC: Bạn phải chia kịch bản thành chuỗi các phân đoạn liên tục, mỗi phân đoạn phải có thời lượng cố định chính xác là 10 giây ("durationSeconds": 10). Không được dùng 8 hay 9 giây.
- The dialogue must be long enough and developed enough (multiple back-and-forth exchanges, practical daily conversational situations) to fill the required number of segments.
- Segments must be tightly connected in terms of character position, outfit, and setting (avoid characters jumping around chaotically between shots) so that when the Veo3 clips are stitched together, they look like one seamless, continuous video.

CAST INVOLVED:
${charsDetail}

USER'S INITIAL IDEA/SCENARIO:
"${input.scenario || 'No specific scenario given'}"
Draft script/dialogue suggestion:
"${input.script || 'Freely create simple dialogue'}"
Key phrase/sentence pattern to teach (if any): "${input.keyPhrase || ''}"
Continuity from the previous episode (if any): "${input.continuityNote || ''}"

SITUATIONAL CONVERSATION SCRIPT GUIDELINES:
1. The script must go straight into a realistic conversational situation (e.g. asking for directions, ordering coffee, greeting a coworker, discussing work...).
2. The dialogue (dialogueOrNarration) must be a direct conversation, spoken in a normal, natural speaking voice.
3. The lines must use simple, easy-to-learn vocabulary, but MUST be 100% grammatically correct English.
4. Display the English-only subtitle clearly at the bottom of the screen (Subtitles are placed at the bottom of the screen). No translation to Vietnamese.

Return the result as a JSON object matching exactly this schema:
{
  "title": "Episode title",
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": 10,
      "visualDescription": "Detailed visual description in English, following the Stickman English style (e.g. A minimalist 2D animation. On a clean solid white background, a simple hand-drawn black stickman wearing a tiny red cap walks in from the left, waving happily. The lines are thick and clean.)",
      "dialogueOrNarration": "Full dialogue line in English (e.g. Alex: Hello! Nice to meet you today.)",
      "subtitle": "Alex: Hello! Nice to meet you today."
    }
  ]
}
`;
}
