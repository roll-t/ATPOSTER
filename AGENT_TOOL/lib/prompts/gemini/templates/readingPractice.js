const LEVEL_GUIDE = {
  a1: 'CEFR A1 (absolute beginner): very short simple sentences (5-9 words), present simple tense mostly, only the most common everyday words, no phrasal verbs, no idioms, minimal connectors (and, but, so).',
  a2: 'CEFR A2 (elementary): short simple sentences (7-12 words), present simple/past simple/present continuous, common everyday vocabulary, simple connectors (and, but, so, because, when), no idioms or advanced expressions.',
  b1: 'CEFR B1 (intermediate): moderately simple sentences (8-16 words), a wider range of tenses (present, past, present perfect, simple future) is fine, everyday-to-slightly-broader vocabulary, natural connectors (however, although, because, after that), still no obscure idioms or literary language.'
};

// ~2.3 words/second is a natural, clear (not rushed) TTS reading pace at
// "medium" speed — used to size the single paragraph to roughly fill the
// target duration, since this video is exactly ONE slide/page held on
// screen for its whole length (no multi-page pacing to reason about).
const WORDS_PER_SECOND = 2.3;

// Scales the words/second used to size the paragraph, so a "slow" or "fast"
// readingSpeed choice (see categories.js's reading_practice.readingSpeed —
// forwarded to ElevenLabs as voice_settings.speed in voiceover/route.js)
// still produces a paragraph that roughly fills the target duration at that
// ACTUAL narration pace, instead of always sizing for medium speed and
// letting slow/fast reads over/undershoot the target length.
const READING_SPEED_WPS_MULTIPLIER = { slow: 0.82, medium: 1, fast: 1.18 };

/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản dạng "graded reader" — MỘT trang văn bản
 * tĩnh duy nhất (title + 1 đoạn văn), đọc rõ, dùng cho video luyện đọc/luyện nghe tiếng Anh
 * kiểu karaoke (chữ tô sáng theo giọng đọc). Luôn trả về ĐÚNG 1 segment — không chia trang.
 */
export function buildReadingPracticeScriptPrompt(input, durationInfo) {
  const isBilingual = true;
  const level = (input.level || 'a2').toLowerCase();
  const levelGuide = LEVEL_GUIDE[level] || LEVEL_GUIDE.a2;
  const readingSpeed = (input.readingSpeed || 'medium').toLowerCase();
  const speedMultiplier = READING_SPEED_WPS_MULTIPLIER[readingSpeed] || 1;
  const targetWords = Math.max(20, Math.round(durationInfo.targetSeconds * WORDS_PER_SECOND * speedMultiplier));

  return `
You are a professional graded-reader author and ESL curriculum writer, in the style of channels like "Fluent English Stories" / "One English Page a Day" — short, level-appropriate reading-and-listening practice videos.
Your task is to write a short, complete, level-appropriate English story (a "graded reader") as ONE SINGLE PAGE: a short punchy title, and ONE paragraph of body text — the video is exactly one slide for its whole duration, there is no second page.

FORMAT OF THE VIDEO (IMPORTANT — READ CAREFULLY):
- This is a "read-along" video: the title and the full body paragraph are held on screen together for the ENTIRE video, while a narrator reads the body aloud and the word currently being spoken is highlighted (karaoke-style) as the reader follows along.
- There is only ONE image (a simple, mostly-empty background) for the whole video — do not describe multiple scenes or a sequence of moments, describe ONE calm background suitable for text to sit on top of.
- The title is shown on screen but is NOT read aloud by the narrator — the narration audio starts directly with the body text.

STORY GUIDELINES:
1. Write ONE complete, coherent short story/message (with a clear beginning, middle, and end within a single paragraph) about the topic below — a real, relatable, everyday situation. Third-person storytelling/narration, not a scripted dialogue between named characters.
2. Language level: ${levelGuide}
3. Keep it warm, simple, and easy to follow — this is reading/listening PRACTICE material for English learners, not literary prose.
4. Target length: about ${targetWords} words for the body paragraph (to roughly fill ${durationInfo.label} / ~${durationInfo.targetSeconds}s of narration at a natural, clear reading pace) — a bit shorter or longer is fine, but do not pad with filler just to hit a word count, and do not write multiple disconnected paragraphs.
5. The body must read naturally as ONE continuous paragraph (multiple full sentences, no line breaks) — it will be shown as a single block of text and read aloud start to finish.
6. Emotion tags: You MAY include natural emotional/expressive sound tags in square brackets within the narration where appropriate to help the voice generator sound realistic (e.g. "[softly]", "[warmly]", "[pause]"). Use them sparingly.

USER'S TOPIC / STORY IDEA:
"${input.scenario || 'No specific topic given'}"
Draft content suggestion (if any):
"${input.script || 'Freely write a natural short story about this topic'}"

TITLE GUIDELINES:
- A short, punchy on-screen heading (3-6 words) that captures the story's point, e.g. "Mistakes Make You Better", "The Magic of Reading". This becomes the video's title, shown at the top of the page.

VISUAL REQUIREMENTS FOR THE HERO ILLUSTRATION (TOP BANNER IMAGE):
- visualDescription: Write a vivid, detailed description for a composite 2D digital anime/webtoon hero illustration that sits at the top of the video page. It MUST visually summarize and capture the ENTIRE meaning, core theme, main characters, key actions, and mood of the story in one harmonious scene.
  - Example 1 (for English practice topic): "A vibrant 2D anime illustration showing three cheerful teenage friends engaged in daily English activities in a bright modern room: one boy on the left wearing headphones listening happily to music, a boy in the middle carrying a backpack and holding an open red textbook, and a smiling girl on the right holding a smartphone. Warm lighting, friendly atmosphere."
  - Example 2 (for fear of darkness topic): "A heartwarming 2D anime illustration showing a young 7-year-old boy sitting cozy on his bed at night, hugging a fluffy brown teddy bear tightly, while soft warm yellow light leaks in from under the bedroom door casting soft gentle shadows on the wall. Emotional, comforting, clean 2D line art."
- STYLE: Vibrant 2D anime/webtoon digital illustration, clean line art, warm soft lighting, expressive faces, rich atmospheric details.
- NO text, letters, titles, logos, or speech bubbles baked into the image.

Return the result as a JSON object matching exactly this schema:
{
  "title": "Short punchy on-screen title (e.g. Mistakes Make You Better)",
  "segments": [
    {
      "segmentNumber": 1,
      "visualDescription": "Detailed 2D anime hero illustration description summarizing the entire story, characters, and scene in English following the guidelines above.",
      "dialogueOrNarration": "The full paragraph of story text, in English, exactly as it should be read aloud (e.g. Every evening after dinner, Mia opened her favorite book and disappeared into another world. [softly] For her, reading was not just a habit -- it was a small piece of magic.)",
      "subtitle": "${isBilingual
        ? 'The same full paragraph text as dialogueOrNarration (no emotion tags), then a literal \\n, then a natural Vietnamese translation of the whole paragraph (e.g. Every evening after dinner, Mia opened her favorite book and disappeared into another world. For her, reading was not just a habit, it was a small piece of magic.\\nMỗi tối sau bữa cơm, Mia mở cuốn sách yêu thích và lạc vào một thế giới khác. Với cô bé, đọc sách không chỉ là một thói quen -- đó là một chút phép màu nhỏ bé.)'
        : 'The same full paragraph text as dialogueOrNarration, without any emotion tags.'}"
    }
  ]
}
`;
}
