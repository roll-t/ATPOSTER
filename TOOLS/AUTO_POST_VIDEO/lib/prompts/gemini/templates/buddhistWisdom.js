import { getBuddhistTheme } from '../../buddhistThemes.js';
import { WORDS_PER_SECOND_EN_SLOW } from '../../../speechRate.js';

/**
 * Prompt cho Gemini viết kịch bản nói + mô tả tranh cho skill "Chuyện Triết Lý & Thiền Phật Giáo".
 *
 * Ba yêu cầu định hình toàn bộ prompt này:
 *
 * 1. GIỌNG PODCAST, KHÔNG PHẢI GIỌNG PHIM TÀI LIỆU. Video hướng tới kiểu podcast Phật pháp nhẹ
 *    nhàng nghe trên Spotify lúc đêm khuya — một người ngồi kể cho MỘT người nghe, xưng "I"/"you",
 *    nói chậm, có khoảng lặng. Không phải giọng thuyết minh trang trọng ngôi thứ ba.
 *
 * 2. TRÁNH VĂN PHONG "AI VIẾT". Danh sách cấm ở dưới lấy theo các dấu hiệu trong
 *    https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing — từ vựng sáo (delve, tapestry,
 *    testament, vibrant...), câu đối lập "not just X, but Y", nhịp liệt kê ba, đuôi phân từ
 *    "..., highlighting the importance of...", trích dẫn mơ hồ ("experts say"), câu tổng kết cuối
 *    mỗi đoạn, lạm dụng gạch ngang dài. Model KHÔNG tự tránh những thứ này, phải cấm đích danh
 *    kèm ví dụ thì mới có tác dụng.
 *
 * 3. TAG CẢM XÚC CHO ELEVENLABS V3. Chỉ dùng đúng bộ tag ElevenLabs v3 hiểu được (whitelist ở
 *    ELEVENLABS_V3_TAGS) và CHỈ đặt trong dialogueOrNarration. Kịch bản của skill này được thiết
 *    kế để dán thẳng sang ElevenLabs v3; còn nút "🎙️ Tạo Lồng Tiếng" trong app dùng Edge/Gemini
 *    TTS thì đã tự xoá sạch tag trước khi gửi đi (xem normalizeTtsText trong voiceover/route.js),
 *    nên tag nằm đây không làm hỏng luồng lồng tiếng sẵn có.
 *
 * Giao diện có nút "Hiện tag / Ẩn tag" ở khối "Toàn bộ lời thuyết minh" để copy được cả hai bản:
 * có tag (dán ElevenLabs v3) và không tag (dán CapCut hoặc công cụ TTS không hiểu tag).
 */

// Tag ElevenLabs v3 hợp lệ, lọc lại còn những tag hợp với một podcast Phật pháp trầm lắng.
// Cố ý KHÔNG để [laughs], [excited], [shouting]... vào đây: model rất hay chèn bừa tag cảm xúc
// mạnh, mà v3 sẽ diễn đúng như vậy — một tiếng cười giữa đoạn nói về vô thường là hỏng cả file.
// Tag ngoài whitelist này bị cấm hẳn, vì v3 đọc TO những tag nó không nhận ra thành lời.
const ELEVENLABS_V3_TAGS = [
  '[whispers]', '[sighs]', '[exhales]', '[inhales deeply]',
  '[thoughtful]', '[curious]', '[chuckles]', '[sad]',
  '[short pause]', '[long pause]',
];

// Số slide / số chữ mục tiêu theo từng mốc thời lượng.
//
// CÔNG THỨC: 1 ảnh giữ 10 GIÂY (SECONDS_PER_IMAGE). Số slide = số giây / 10, và vì mỗi slide là
// một ảnh phải sinh riêng qua Google Flow, đây chính là số prompt ảnh người dùng sẽ phải chạy.
//
// Số chữ suy ra TỪ CHÍNH LỜI NÓI, không đặt tay: giây × WORDS_PER_SECOND_EN_SLOW (2.1 từ/giây,
// nhịp đọc thiền). Nhờ vậy ba con số luôn khớp nhau — tổng số chữ, số slide, và thời lượng thật
// của audio — thay vì mỗi chỗ khai một kiểu rồi lệch.
//
// minWords của bảng này được generateSegmentedScript.js đọc lại qua getBuddhistWordTarget() để
// biết khi nào phải gọi thêm một lượt viết bù.
const SECONDS_PER_IMAGE = 10;

// Biên độ cho phép quanh con số lý thuyết, để Gemini còn chỗ co giãn theo mạch chuyện.
const SPREAD = 0.12;

function targetsFor(seconds) {
  const slides = seconds / SECONDS_PER_IMAGE;
  const words = seconds * WORDS_PER_SECOND_EN_SLOW;
  const range = (n) => `${Math.round(n * (1 - SPREAD))} đến ${Math.round(n * (1 + SPREAD))}`;
  return { slides: range(slides), words: range(words), minWords: Math.round(words * (1 - SPREAD)) };
}

export const DURATION_TARGETS = {
  under_1m: targetsFor(45),
  '1_2m': targetsFor(90),
  '2_3m': targetsFor(150),
  '3_4m': targetsFor(210),
  '4_6m': targetsFor(300),
  '6_8m': targetsFor(420),
  '8_10m': targetsFor(540),
  '10_15m': targetsFor(750),
  '15_20m': targetsFor(1050),
};

// Số từ của MỘT slide (10 giây lời nói) — nhét thẳng vào prompt để Gemini không phải tự suy.
const WORDS_PER_SLIDE_LOW = Math.round(SECONDS_PER_IMAGE * WORDS_PER_SECOND_EN_SLOW * 0.85);
const WORDS_PER_SLIDE_HIGH = Math.round(SECONDS_PER_IMAGE * WORDS_PER_SECOND_EN_SLOW * 1.2);

const DEFAULT_TARGET = DURATION_TARGETS['8_10m'];

/**
 * Số từ TỐI THIỂU của một kịch bản ở mốc thời lượng này (lấy cận dưới của bảng trên).
 *
 * generateSegmentedScript.js dùng số này thay cho công thức chung `targetSeconds × tốc độ đọc`:
 * công thức chung mặc định tốc độ TIẾNG VIỆT (4.3 âm tiết/giây), áp vào skill tiếng Anh đọc chậm
 * sẽ ra mục tiêu ~3200 từ cho video 10-15 phút — gấp đôi mức thật sự cần.
 */
export function getBuddhistWordTarget(durationRange) {
  return (DURATION_TARGETS[durationRange] || DEFAULT_TARGET).minWords;
}

/** Khoảng số từ của MỘT slide (10 giây lời nói) — dùng chung cho prompt viết mới và viết bù. */
export function getBuddhistWordsPerSlide() {
  return { low: WORDS_PER_SLIDE_LOW, high: WORDS_PER_SLIDE_HIGH };
}

/** Số slide (= số ảnh, = số prompt ảnh) mục tiêu của mốc thời lượng này. */
export function getBuddhistSlideTarget(durationRange) {
  return (DURATION_TARGETS[durationRange] || DEFAULT_TARGET).slides;
}

export function buildBuddhistWisdomScriptPrompt(input, durationInfo, durationRange = '8_10m') {
  const isLandscape = (input.aspectRatio || '16:9') === '16:9';
  const themeObj = getBuddhistTheme(input.buddhistTheme || 'zen_stories');
  const { slides: targetSlides, words: targetWords } = DURATION_TARGETS[durationRange] || DEFAULT_TARGET;

  const compositionGuidance = isLandscape
    ? `- FRAME FORMAT (16:9 landscape):
  - Compose each scene with traditional horizontal balance (rule of thirds, the asymmetry of Zen composition).
  - Leave things open and uncluttered — bare white paper, morning mist, an open meadow or a flowing stream spreading across the width.
  - Keep the subject comfortably framed with painterly margins. No clutter.`
    : `- FRAME FORMAT (9:16 portrait):
  - Compose vertically: a towering Bodhi tree, a monk climbing stone steps, tall grass rising into an open pale sky.
  - Center the focal point and leave wide breathing space above and below it.`;

  return `
You are the host and writer of a quiet Buddhist podcast — the kind of episode someone puts on in bed at 1 a.m. with the lights off. Your job is to write the spoken script for one episode, plus one painted illustration prompt for every slide of the video.

THEME GROUP: "${themeObj.label}" (${themeObj.sublabel})
EPISODE TOPIC REQUESTED BY THE USER:
"${input.scenario || 'The Art of Mindful Living and Letting Go'}"
${input.script ? `EXTRA CONTEXT / DRAFT FROM THE USER: "${input.script}"` : ''}

────────────────────────────────────────
1. VOICE: A LATE-NIGHT PODCAST, NOT A DOCUMENTARY
────────────────────────────────────────
- Write 100% in natural spoken English. Everything you write will be read aloud — never written to be read on a page.
- One person talking to ONE listener. Say "I" and "you". "Let me tell you about two monks and a river" — not "This narrative explores the parable of two monks."
- Slow, low, unhurried, kind. Long enough silences that the listener can breathe. Never hyped, never dramatic, never salesy.
- Use contractions (it's, you'll, don't, that's). Use plain everyday words. A ten-year-old should understand every sentence, and a sixty-year-old should not feel talked down to.
- Vary the rhythm. A long, flowing sentence, then a short one. Sometimes a fragment. Silence is part of the writing.
- Tell the story in scenes with concrete physical detail — the weight of a wet robe, mud on the riverbank, the smell of rain on hot stone. Let the meaning arrive through what happens, not through you announcing what it means.
- Ask the listener a real question now and then ("Have you ever carried something like that?"), then leave room instead of answering it immediately.
- Never say the moral twice. Say it once, quietly, and stop.

THE FIRST 30 SECONDS — ENTER QUIETLY (segments 1 and 2):
- The episode does not start. It is already going, and the listener just walked in on it. Someone is halfway through a thought, speaking low.
- Start at the lowest energy in the whole episode. Nothing loud, nothing announced, no hook, no promise of what's coming, no "today we're going to talk about". Never name the theme in the first sentence.
- Open on one small concrete thing instead of an idea — rain starting on a roof, an old man taking his shoes off at the door, grass bending in the wind. One image, described plainly.
- The first sentence must be short. Under 12 words. Let it sit.
- No question in segment 1. No dramatic statement. No "Let me tell you about" as the opening words — earn it first with an image.
- Segments 1 to 3 sit at the LOW end of the word range (around ${WORDS_PER_SLIDE_LOW} words). Energy rises very slightly over the first few minutes and never gets loud.
- Wrong: "Today we explore the art of letting go." / "Two monks once faced a choice that would change everything." / "Have you ever felt weighed down?"
- Right: "The rain came back about an hour ago. It always does this time of year." then, later, ease into the story.

────────────────────────────────────────
2. BANNED WRITING PATTERNS (THIS IS THE MOST IMPORTANT SECTION)
────────────────────────────────────────
The script must not read like it was generated. Every pattern below is a known tell. Avoid all of them.

BANNED VOCABULARY — do not use these words or phrases anywhere in the narration:
  delve, tapestry, testament, realm, landscape (figurative), journey (figurative), embark, unlock, navigate (figurative),
  profound, vibrant, rich (figurative), boasts, nestled, "in the heart of", timeless, breathtaking, renowned, remarkable,
  crucial, pivotal, vital, key (as adjective), robust, holistic, myriad, plethora, intricate, meticulous, enduring,
  showcase, underscore, highlight (as verb), foster, cultivate (outside literal farming), garner, bolster, resonate,
  align with, interplay, "serves as", "stands as", "marks a turning point", "plays a role in", "a beacon of",
  "the essence of", "at its core", "ultimately", "in conclusion", "in today's world", "in a world where",
  "the ancient wisdom of", "little did they know", "and that, my friend, is".

BANNED SENTENCE PATTERNS:
  a) Negative parallelism. No "It's not just a river, it's a mirror." No "Not only does he let go, but he also forgets." No "It isn't about winning, it's about presence." This construction is the single loudest AI tell — zero instances allowed.
  b) The rule of three. Do not stack three adjectives, three nouns, or three clauses for rhythm ("calm, steady, and free"). Use one or two. If you catch yourself writing a third, cut it.
  c) Participle tails. Never end a sentence with ", highlighting the importance of...", ", reminding us that...", ", showing us how...", ", underscoring the need for...". Stop the sentence at the period.
  d) Em-dash overuse. At most one em-dash in the entire script. Use periods and commas.
  e) Copula avoidance. Write "he was tired", not "he found himself in a state of exhaustion" or "his condition represented exhaustion".
  f) Vague attribution. No "studies show", "experts say", "many believe", "it is said that", "scholars agree". If a teaching comes from a specific sutra or a named teacher, name it plainly. If you are not certain a quote or citation is real, do not write it — invent nothing and attribute nothing to the Buddha that you cannot state plainly as a well-known teaching.
  g) Summary sentences. Do not end a segment by restating what the segment just said. No wrap-up segment at the end that recaps the episode.
  h) The "despite the challenges, the future looks bright" shape. No optimistic-speculation ending.
  i) Formulaic openers. Do not begin with "Have you ever wondered...", "Imagine a world where...", "In the quiet stillness of..." or a dictionary definition.
  j) No markdown emphasis, no bold, no headings, no bullet points inside the narration. It is speech, not a document.

SELF-CHECK BEFORE YOU OUTPUT: reread every segment and delete any sentence that could sit unchanged in a generic inspirational video. If a line feels smooth but says nothing, cut it.

────────────────────────────────────────
3. ELEVENLABS V3 AUDIO TAGS
────────────────────────────────────────
The narration gets read by ElevenLabs v3, which acts on bracketed audio tags. Use them, carefully.
- ALLOWED TAGS — use only these exact strings, nothing else:
  ${ELEVENLABS_V3_TAGS.join('  ')}
- Any other bracketed tag is forbidden. ElevenLabs reads unknown tags OUT LOUD as words, which ruins the take. Never invent tags like [calm voice], [meditative], [pause 2s], [music].
- Placement: put the tag immediately BEFORE the sentence it should colour, on the same line as the text. Example: "[whispers] And then he simply set her down, and walked on."
- Density: about one tag every 3 to 5 sentences. Many segments should contain no tag at all. Never put two tags next to each other, and never open every segment with a tag — it makes the whole episode sound mechanical.
- Segment 1 must open with [whispers] or [thoughtful] so the voice starts low and close to the microphone. Never open the episode with [curious], [excited] or any tag that lifts the energy.
- For pauses, prefer an ellipsis "…" inside the sentence. v3 does not support SSML break tags, so never write <break>. Use [short pause] or [long pause] only at a genuine turning point in the story, at most two or three times in the whole episode.
- Tags belong ONLY in "dialogueOrNarration". The "subtitle", "title" and "visualDescription" fields must never contain a bracketed tag.

────────────────────────────────────────
4. LENGTH AND PACING
────────────────────────────────────────
- Target duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- Produce exactly ${targetSlides} segments. One segment = one painted image held on screen for about ${SECONDS_PER_IMAGE} seconds. The segment count IS the number of illustrations that have to be generated, so it is not negotiable.

THE TWO NUMBERS BELOW ARE BOTH HARD REQUIREMENTS — READ THIS TWICE:
- SEGMENT COUNT: exactly ${targetSlides} segments. Fewer segments means fewer illustrations than the video needs, and the images will run out before the narration does.
- WORDS PER SEGMENT: each "dialogueOrNarration" holds **${WORDS_PER_SLIDE_LOW} to ${WORDS_PER_SLIDE_HIGH} spoken English words** — that is ${SECONDS_PER_IMAGE} seconds of slow speech, one image's worth. Usually one or two sentences. Do not write a 40-word segment: it would leave its image on screen twice as long as intended.
- The LAST segment is a segment like any other. It must carry a full ${WORDS_PER_SLIDE_LOW} to ${WORDS_PER_SLIDE_HIGH} words. Never return an empty or one-line final segment.
- TOTAL: across all segments the script must reach **at least ${targetWords} spoken words**. Audio tags are not spoken and do not count toward any of these numbers.
- BEFORE YOU RETURN: count the segments, then count the words in each one. Both numbers must land in range. If the total is short, the fix is MORE SEGMENTS carrying the story further — never longer segments, and never fewer of them.

HOW TO REACH THE TOTAL HONESTLY:
- Segments are short, so the story must actually go somewhere across ${targetSlides} of them. Do not stretch a thin idea over the whole episode and do not repeat a beat you have already covered.
- When you need more material, go further into the scene rather than padding: what the road smelled like, what he did with his hands, how long the silence lasted before anyone spoke, what the listener's own version of this moment might be. Concrete detail is what fills a meditative script honestly.
- Each segment should still feel like a complete breath — one or two sentences that land — not a sentence chopped in half across two segments.

- Give the episode a shape: a hushed opening that eases the listener in (see THE FIRST 30 SECONDS above), a story or teaching that unfolds without rushing, and an ending that lands on one image and stops. No recap.
- Keep each sentence short enough to say in one breath. Break long clauses with commas so the voice has somewhere to breathe.

────────────────────────────────────────
5. BILINGUAL SUBTITLES
────────────────────────────────────────
Every segment needs a "subtitle" with two lines:
  Line 1: the spoken English, trimmed to a short on-screen line (8 to 16 words), with 1 or 2 key phrases wrapped in **double asterisks**.
  Line 2: a literal "\\n" then a natural Vietnamese translation, also with the matching phrase in **double asterisks**.
Keep the Vietnamese warm and plain — spoken Vietnamese, not translated-textbook Vietnamese. No audio tags on either line.
Example:
  "subtitle": "He set her down at the river. **You're still carrying her.**\\nAnh ấy đã đặt cô gái xuống bên sông rồi. **Còn em thì vẫn đang cõng.**"

────────────────────────────────────────
6. WHAT GOES IN "visualDescription"
────────────────────────────────────────
WRITE SUBJECT ONLY. DO NOT WRITE STYLE WORDS.
- The pipeline appends the art style (ink and watercolour, vintage Zen, palette, paper texture, lighting) to every image prompt automatically. If you also write "ink lines, warm amber washes, rice paper" into visualDescription, the style ends up stated twice and crowds out the subject — the image generator then paints a generic pretty Zen picture instead of this exact moment.
- So: no "hand-drawn", no "watercolour", no "ink", no colour names, no "textured rice paper", no "soft washes", no palette, no "Zen storybook style". Just what is in the picture.

DESCRIBE THIS SEGMENT'S EXACT MOMENT:
- The image must show what the narration of THIS segment is talking about right now. If the words say he is stepping into the current with her on his back, the picture is that, not a monk meditating somewhere.
- One dense paragraph of concrete visual nouns: who is in frame, what they are doing, their posture and where they are looking, what objects are near them, the place, the time of day, the weather.
- Say where things sit in the picture (foreground / mid-ground / behind them, left or right, close-up or wide). Vary it across the episode — a run of identical wide shots is dull, and so is a run of close-ups.
- When the narration turns inward and has no action to show, pick ONE physical object from the scene and hold on it in daylight: the wet hem of a robe, a hand resting on a walking staff, a single stone in the shallows, an empty bowl on a step. Never fall back on a generic temple postcard.

WRITE ONLY WHAT IS THERE — NEVER WHAT IS ABSENT:
- Your visualDescription is pasted straight into an image generator that takes one positive prompt and has no negative-prompt channel. Every noun you write gets drawn, even inside a phrase like "no ..." or "without ...". Writing "no people in frame" is a reliable way to get people in the frame.
- So never write "no", "without", "empty of", "free of", "instead of", "not a". Describe only what IS in the picture. If nobody is in the scene, simply describe the place and its objects and say nothing about people.
- Avoid the words "frame", "border", "edge of the frame", "fading out", "vignette" — they make the generator draw the picture as a small card sitting inside a border. Say "in the foreground", "on the left", "in the distance" instead.

LIGHT: EVERY SCENE IS DAYLIGHT.
- The illustration style is bright, airy watercolour on white paper. A night scene or a dark interior comes out muddy and grey in it, which is why this is a hard rule.
- Allowed: early morning, soft overcast noon, drizzle, mist burning off, late afternoon. Say which one.
- Never write "night", "darkness", "candlelit", "lit by an oil lamp", "glowing", "in shadow", or "silhouette". A lamp or candle may sit in the scene as an unlit object, never as the light source.
- If the narration itself is set at night, illustrate the STORY being told (which happens in daylight) rather than the narrator's own dark room.

WHAT MAY APPEAR (the world of this episode):
- Monks in plain earthy robes, elderly teachers, young disciples, ordinary villagers, travellers.
- Mountain paths, rivers and stone crossings, pine and bamboo forests, meadows and dry grass, rain, mist, snow, wide pale skies.
- Old wooden monasteries and small temple rooms, worn stone steps, courtyards, rock gardens, lotus ponds, ancient Bodhi trees.
- Small objects: brass oil lamps, clay cups, open scrolls, ceramic inkwells, bamboo brushes, straw sandals, wooden bowls, walking staffs.

NEVER: modern objects (cars, phones, electric light, modern clothing), text or letters or watermarks of any kind, photorealism, 3D CGI gloss.
${compositionGuidance}

────────────────────────────────────────
7. OUTPUT FORMAT — STRICT JSON, NOTHING ELSE
────────────────────────────────────────
Return ONLY a valid JSON object in this exact shape. No markdown fences, no commentary before or after.
{
  "title": "A plain, human episode title in English",
  "theme": "${themeObj.key}",
  "totalSegments": 25,
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": 10,
      "visualDescription": "A wide view of an open meadow under a pale overcast sky. On the left, the eaves of a small wooden temple. Thin drizzle falling across the middle distance. A shallow stream winds through dry grass toward the far treeline. Tall grass in the foreground. Late afternoon, soft even light.",
      "dialogueOrNarration": "[thoughtful] Rain started up again about an hour ago. It's barely falling. More like it just hangs in the air and waits.",
      "subtitle": "Rain started up again about an hour ago. It **barely falls**.\\nMưa lại bắt đầu chừng một tiếng trước. Mà **rơi cũng chẳng ra rơi**."
    },
    {
      "segmentNumber": 7,
      "durationSeconds": 10,
      "visualDescription": "Mid-shot at the muddy edge of a swollen river. The older monk crouches low with his back turned to a young woman in a pale robe, one hand braced on his knee, head lowered. She is stepping toward him, gathering her hem. Behind them, water churning white over half-submerged stepping stones. Wet pines along the far bank. Bright overcast morning, soft even light.",
      "dialogueOrNarration": "The younger monk opened his mouth to say something about the rule. He did not get the chance.",
      "subtitle": "He opened his mouth to say something **about the rule**.\\nAnh vừa định nói gì đó **về giới luật**."
    }
  ]
}
`.trim();
}
