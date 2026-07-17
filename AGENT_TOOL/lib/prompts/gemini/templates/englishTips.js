/**
 * Xây dựng prompt meta gửi cho Gemini để sinh kịch bản phân đoạn cho dòng
 * "Video Mẹo Học Tiếng Anh" (whiteboard-animation explainer kiểu kênh "Effortless English").
 * Nội dung prompt viết bằng tiếng Anh để đồng nhất với toàn bộ format prompt Veo3.
 */
export function buildEnglishTipsScriptPrompt(input, durationInfo) {
  return `
You are a professional screenwriter and an expert Veo3 AI video prompt engineer.
Your task is to write a short English-learning-tips explainer video script in the style of the "Effortless English" whiteboard-animation channel: a confident narrator teaches one rule/tip using simple hand-drawn illustrations and on-screen keyword text, with NO recurring character mascot.

VISUAL STYLE & MOTION:
- Visual style: "Minimalist hand-drawn whiteboard-animation, clean black ink line illustrations and simple icons/diagrams on a plain white/cream background, no photorealism, no recurring character."
- Each segment's visual must directly illustrate the point being narrated at that moment (e.g. a crossed-out single word next to a flowing phrase, a brain icon with a lightning bolt, a checklist with items ticking off, a speech bubble with example sentences).
- Bold on-screen keyword/bullet text must appear in sync with the narration. It must appear instantly with a hard cut — never describe it fading in, sliding in, or animating in any way — then cut directly to the next text/diagram the same way.
- Keep the illustration style, ink thickness, and background CONSISTENT across every segment so the stitched video looks like one continuous whiteboard drawing session.

DURATION & PACING REQUIREMENTS (IMPORTANT — READ CAREFULLY):
- Target total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- Since Veo3 can only generate up to 10 seconds per generation, you MUST split the script into a continuous sequence of segments, each lasting exactly 8 to 10 seconds (choose 8, 9, or 10 seconds).
- For the target total duration, the script must consist of about ${durationInfo.segmentsCount} segments.
- Segments must flow as ONE continuous narration (the narrator keeps talking across segment boundaries) so that when the Veo3 clips are stitched together, they look like one seamless video — do not restart or re-introduce the topic mid-video.

MANDATORY STRUCTURE (in this order):
1. HOOK segment(s): open with the attention-grabbing question/problem statement, spoken directly to the viewer.
2. KEY POINT segments: cover each key point the user listed below, one at a time, each with its own illustrating diagram/icon on the whiteboard. If there are more segments available than key points, expand each point with a bit more natural explanation rather than inventing unrelated points.
3. EXAMPLE segment(s): show the concrete example the user provided, illustrated with a simple on-screen diagram (e.g. crossed-out word vs. a full phrase written out).
4. CLOSING/CTA segment: end with the call-to-action line (like/subscribe/notification bell), paired with a friendly closing whiteboard illustration.

USER'S IDEA:
- Hook / opening question: "${input.hook || 'Do you want to speak English more naturally?'}"
- Rule/tip title: "${input.ruleTitle || 'An English learning tip'}"
- Key points to teach (one per line):
${input.keyPoints || 'Freely create 3-5 practical key points on the topic above'}
- Concrete example to illustrate: "${input.example || 'Freely create a simple, clear example'}"
- Closing call-to-action (if empty, invent a natural one): "${input.closingCTA || ''}"

SCRIPT GUIDELINES:
1. The narration uses simple, clear, natural spoken English (CEFR A2-B1), short sentences, confident teacher tone.
2. Each segment's dialogueOrNarration should be a natural continuation of the previous segment's sentence/thought, not a disconnected new topic.
3. The subtitle for each segment is the short bold keyword/phrase shown on screen for that moment (not the full narration sentence) — a few words only, matching what a whiteboard illustration would realistically show as text.

Return the result as a JSON object matching exactly this schema:
{
  "title": "Video title",
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": 10,
      "visualDescription": "Detailed English visual description of the whiteboard illustration for this segment (e.g. A minimalist black-ink whiteboard animation. A hand draws a single word 'GO' in the center, then a big red X is drawn over it while a thought-bubble icon appears above showing a confused stick figure face.)",
      "dialogueOrNarration": "Full narration line in English for this segment (e.g. Narrator: Want to speak English more naturally? Here's the biggest mistake most learners make.)",
      "subtitle": "Short bold on-screen keyword/phrase (e.g. THE BIGGEST MISTAKE)"
    }
  ]
}
`;
}
