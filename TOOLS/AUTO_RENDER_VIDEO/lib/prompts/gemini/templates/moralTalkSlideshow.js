/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản phân cảnh cho dòng
 * "Video Nói Chuyện Đạo Lý" — kể một tình huống đời thường rút ra bài học sống,
 * minh hoạ bằng pictogram trắng phẳng (không hiệu ứng phát sáng) trên nền đen (xem style block riêng
 * trong buildSegmentedPrompts.js). Không có nhân vật cố định xuyên suốt — mỗi
 * slide là 1 pictogram tượng trưng cho khoảnh khắc đang kể, giống bộ icon
 * "Human Pictogram" (người đàn ông gãi đầu, hai người cãi nhau, đám đông vẫy cờ...).
 *
 * narrationLanguage ('vi' mặc định | 'en') quyết định NGÔN NGỮ CHÍNH của lời kể
 * (dialogueOrNarration — chính là văn bản sẽ được lồng tiếng), và ngôn ngữ nào
 * đứng dòng đầu trong subtitle song ngữ.
 *
 * moralTheme quyết định CẢ nhịp độ (pacingGuidance) LẪN giọng văn/kỹ thuật viết
 * (styleReferenceBlock, xem moralTalkVoiceStyle.js — dùng chung với
 * buildRegenerateNarrationPrompt để nút "Viết lại lời kể" không lệch văn phong).
 */
import { getMoralTalkStyleReference } from './moralTalkVoiceStyle.js';
import { getMoralTheme } from '../../moralThemes.js';
import { buildPunctuationRhythmGuidance, buildVietnamesePronunciationNote } from './narrationPacing.js';
import { buildHookGuidance, buildHumanVoiceGuidance } from './humanVoice.js';

export function buildMoralTalkSlideshowScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isLandscape = input.aspectRatio === '16:9';
  const isVietnamesePrimary = (input.narrationLanguage || 'vi') !== 'en';

  const theme = input.moralTheme || 'self_help';
  const { isReflectiveTheme, narrationModeLine, styleReferenceBlock } = getMoralTalkStyleReference(theme);

  let pacingGuidance = '';

  if (isReflectiveTheme) {
    // Requires deeper explanation, so fewer slides but longer duration per slide. Bumped up
    // from an earlier, thinner ladder (4-6/8-12/12-18/18-25) after a real under_1m generation
    // came out at only ~25s total — too short for a 45s target — because 4-6 slides at the low
    // end of the narration-length range undershoots badly. Keeping fewer slides than "top_lists"
    // below (each slide still carries more narration weight), just no longer at the thin end.
    let targetSlides = '6 đến 9';
    if (durationRange === '1_2m') targetSlides = '10 đến 14';
    else if (durationRange === '2_3m') targetSlides = '16 đến 20';
    else if (durationRange === '3_4m') targetSlides = '20 đến 26';
    // "Video dài" (16:9, đăng YouTube dài hơi) — tiếp tục đúng nhịp tăng của thang trên (mỗi mốc
    // +60-120s cộng thêm ~10-12 slide), không nhảy vọt hay chững lại đột ngột ở đúng chỗ ranh giới
    // "short" (dưới 4 phút) chuyển sang "long" (trên 4 phút).
    else if (durationRange === '4_6m') targetSlides = '28 đến 34';
    else if (durationRange === '6_8m') targetSlides = '38 đến 46';
    else if (durationRange === '8_10m') targetSlides = '48 đến 58';

    pacingGuidance = `- THEME CHARACTERISTIC: This is a "${getMoralTheme(theme).styleLabel}" topic. This theme requires deep explanation and rich narration context per slide.
- REQUIRED SLIDE COUNT: Split the video into exactly ${targetSlides} segments/slides. Treat this as a firm floor, not a suggestion — a shorter script that undershoots this count reads as thin and rushed, never as "concise".
- NARRATION LENGTH PER SLIDE: Each slide's narration (dialogueOrNarration) should be around 8 to 15 seconds of speech (roughly 25 to 45 words). Write descriptive, meaningful, and warm narration that fully explains the concept or context for the slide's image, rather than having short 3-second segments.`;
  } else {
    // top_lists: lists points, can have slightly more slides but still reasonable
    let targetSlides = '5 đến 8';
    if (durationRange === '1_2m') targetSlides = '10 đến 15';
    else if (durationRange === '2_3m') targetSlides = '15 đến 22';
    else if (durationRange === '3_4m') targetSlides = '22 đến 30';
    else if (durationRange === '4_6m') targetSlides = '32 đến 40';
    else if (durationRange === '6_8m') targetSlides = '44 đến 54';
    else if (durationRange === '8_10m') targetSlides = '56 đến 68';

    pacingGuidance = `- THEME CHARACTERISTIC: This is a "${getMoralTheme(theme).styleLabel}" topic, listing specific items/points.
- REQUIRED SLIDE COUNT: Split the video into exactly ${targetSlides} segments/slides — one OPENING slide, one REASON-TO-STAY slide, one slide for each list point, and one slide for the conclusion.
- NARRATION LENGTH PER SLIDE: Each slide should have about 6 to 10 seconds of speech (equivalent to 18 to 30 words), allowing enough explanation for each point.
- The opening is TWO SEPARATE SLIDES, never one (see the TWO-BEAT OPENING rule in the style section). If the topic does NOT promise a count (possible for the trending-slang satire theme), skip the counting requirement below and just follow that theme's own opening rule — otherwise slide 1's narration OPENS WITH THE NUMBER as its very first words — e.g. "5 nguyên tắc giao tiếp mà trải đời rồi mới hiểu." — with no framing sentence in front of it and never starting with "Có". That number must equal exactly how many list-point slides you actually write. Slide 2 is a short line giving the viewer a reason to watch to the end, and must NOT repeat the count.`;
  }

  // Khung 16:9 (video dài YouTube) trước đây chỉ được gợi ý "you may..." (tuỳ chọn) để tận dụng
  // chiều ngang — Gemini gần như luôn bỏ qua và vẽ y hệt bố cục của khung 9:16 (1 pictogram đơn lẻ
  // giữa khung), khiến ảnh trông trống trải/đơn giản trên khung rộng dù đúng phong cách tối giản.
  // Đổi thành yêu cầu BẮT BUỘC với kỹ thuật bố cục cụ thể (2 điểm neo trái/phải + tuỳ chọn 1 chi
  // tiết môi trường tối giản cùng tông trắng phẳng) — vẫn giữ đúng phong cách icon tối giản
  // trên nền đen, chỉ là dùng hết chiều rộng khung hình thay vì bỏ trống 2 bên.
  const compositionGuidance = isLandscape
    ? `- FRAME ORIENTATION (MANDATORY — this is a WIDE 16:9 frame for a long-form video): Never render a single small pictogram figure floating alone in a mostly-empty wide frame — that composition reads fine on a phone screen but looks thin, unfinished, and low-effort on a wide 16:9 frame. Every slide must use a full-width, two-anchor composition:
  1. Anchor the MAIN pictogram figure/grouping to one side of the frame (alternate between left-anchored and right-anchored across consecutive slides for visual rhythm — do not center every slide the same way).
  2. On the OPPOSITE side, place a second symbolic element that adds real context to this exact narration moment — either a supporting pictogram figure (e.g. the other person in the situation), OR a simple flat-white-outline environmental prop (no glow) in the EXACT SAME white monoline icon style (e.g. a doorway, a bench, a staircase, a window frame, a signpost, a road/horizon line, a clock, a desk) — it must relate directly to what's being narrated, never generic decorative filler.
  3. Optionally add ONE small supporting icon (arrow, question mark, heart, exclamation mark) scaled smaller and placed to create depth across the width — but keep the total look sparse: 2 to 3 symbolic elements per slide at most, still with generous empty black negative space, never a cluttered scene.
- TOP SAFE ZONE: the video's caption text is overlaid across the TOP portion of the frame. Keep the pictogram figure(s)/prop(s) confined to roughly the BOTTOM two-thirds of the frame — leave the top third pure black, with no part of the figure/props reaching up into it, so the caption text has clean empty space to sit on.
- SIZE LIMIT: describe the figure(s) as SMALL relative to the frame — at most about two-thirds (65%) of the frame's height/width, with clear black margin all around. Do not describe a figure filling, touching, or cropped by the frame edges.`
    : `- FRAME ORIENTATION: This slide is a TALL 9:16 portrait frame. Keep the composition simple and centered — one clear symbolic pictogram grouping per slide, generous empty black space around it, reads instantly on a phone screen.
- TOP SAFE ZONE: the video's caption text is overlaid across the TOP portion of the frame. Keep the pictogram figure(s)/prop(s) confined to roughly the BOTTOM two-thirds of the frame — leave the top third pure black, with no part of the figure/props reaching up into it, so the caption text has clean empty space to sit on.
- SIZE LIMIT: describe the figure(s) as SMALL relative to the frame — at most about two-thirds (65%) of the frame's height/width, with clear black margin all around. Do not describe a figure filling, touching, or cropped by the frame edges.`;

  const narrationLanguageBlock = isVietnamesePrimary
    ? `- The narration (dialogueOrNarration) MUST be written in natural, warm, spoken VIETNAMESE — this is the primary spoken language of the video (it will be sent directly to a Vietnamese voice narrator). Use simple, everyday Vietnamese, short sentences, a calm and heartfelt storytelling tone — NOT preachy or lecturing.
- Subtitle language: for EVERY segment, the "subtitle" field must contain the Vietnamese line FIRST, then a literal "\\n", then a natural, accurate simple-English translation of that same line (e.g. "Một hành động tử tế nhỏ bé có thể thay đổi cả một cuộc đời.\\nA small act of kindness can change an entire life."). IMPORTANT: "subtitle" must NEVER contain a bracketed emotion tag like "[warmly]" — those belong ONLY inside "dialogueOrNarration" (they are voice-engine instructions, not on-screen text).
- ${buildVietnamesePronunciationNote()}`
    : `- The narration (dialogueOrNarration) MUST be written in simple, natural, spoken ENGLISH (CEFR A2-B1 level) — this is the primary spoken language of the video (it will be sent directly to an English voice narrator). Short sentences, calm and heartfelt storytelling tone — NOT preachy or lecturing.
- Subtitle language: for EVERY segment, the "subtitle" field must contain the English line FIRST, then a literal "\\n", then a natural, accurate Vietnamese translation of that same line (e.g. "A small act of kindness can change an entire life.\\nMột hành động tử tế nhỏ bé có thể thay đổi cả một cuộc đời."). IMPORTANT: "subtitle" must NEVER contain a bracketed emotion tag like "[warmly]" — those belong ONLY inside "dialogueOrNarration" (they are voice-engine instructions, not on-screen text).`;

  return `
You are a professional scriptwriter specialized in short "moral lesson / life wisdom" spoken-word videos (the Vietnamese "nói chuyện đạo lý" genre).
Your task is to write a short NARRATION (voiceover) script in the exact voice/style described below, and design a detailed image generation prompt for each slide of the video.

NARRATION STYLE REQUIREMENTS (IMPORTANT):
- This is NOT a conversation/dialogue between characters. Do NOT write back-and-forth lines like "A: ... / B: ...".
${narrationModeLine}
- Each slide's pictogram simply depicts / symbolizes whatever the narration is evoking right then — this can be a literal everyday scene OR a symbolic/metaphorical image (e.g. an adult pictogram figure standing face to face with a small child pictogram figure, a figure looking into a mirror-shaped outline, a figure holding a folded paper). Figures are silent symbolic pictograms — no speech, no dialogue, no speech bubbles.
${narrationLanguageBlock}

${buildHumanVoiceGuidance({ isVietnamese: isVietnamesePrimary })}

${buildHookGuidance({ isVietnamese: isVietnamesePrimary })}

${styleReferenceBlock}

VISUAL STYLE & IMAGE PROMPT REQUIREMENTS:
- The style is: minimalist flat white pictogram icon illustrations on a solid pure black background — exactly like professional "human pictogram" icon packs (simple flat white human-silhouette figures with crisp sharp edges, NO glow, NO blur, NO bloom, NO light/halo effect of any kind, no facial detail, no color, no scenery).
- Describe the visual scene in detail in English (visualDescription) for each segment/slide, even though the narration itself may be in Vietnamese — the image-generation model reads English prompts.
- Since the video is a SLIDESHOW of static images, each segment represents ONE slide/image.
- IMPORTANT — unlike a recurring-character story, this style uses a DIFFERENT symbolic pictogram grouping per slide, matching whatever the narration is describing at that exact moment (e.g. a lone confused figure with a question mark, two figures in conflict, a crowd embracing, a figure sharing something with another, a figure walking away, a group celebrating). Do not force the same named character to reappear across all slides — pick whichever generic pictogram(s) best symbolize each specific narration line.
- Describe the pose/action/symbolic prop icons (question marks, exclamation marks, hearts, arrows, speech bubbles, signposts, luggage, flags — all rendered in the same flat white icon style, no glow) needed to convey the moment clearly at a glance.
${compositionGuidance}
- Do NOT mention motion/animation words like "animating", "zooming", "moving" in the visualDescription because we are generating static images. Focus on poses, gestures, and static frame composition.
- IMPORTANT — no text in the image at all: never request labels, captions, arrows-as-annotations, or any text of any kind inside the image itself (this style is purely symbolic icons on black, like the reference pictogram library — text belongs only in the subtitle, never baked into the picture).
- The visual description should be descriptive and detail-oriented, suitable for direct text-to-image prompts (e.g. Midjourney or Flux).

DURATION & PACING REQUIREMENTS:
- Target total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
${pacingGuidance}

USER'S TOPIC / LIFE LESSON:
"${input.scenario || 'No specific topic given'}"
Draft story suggestion (if any):
"${input.script || 'Freely write a natural, heartfelt short story illustrating this life lesson'}"

NARRATION SCRIPT GUIDELINES:
1. The script must speak about the stated life lesson/topic, following the VOICE & STYLE REFERENCE above — not a third-person story about someone else, and not an abstract lecture.
2. The narration (dialogueOrNarration) must follow the narration mode described above, spoken in a natural, calm voice — never a scripted conversation between named characters.
3. Do NOT include bracketed tags like "[pause]", "[softly]", "[warmly]", "[gently]" anywhere in the narration — the voice engine does not read them and does not act on them, they have zero effect on the spoken audio and only show up as clutter in the text. Express emotion/pacing through word choice and punctuation instead (see below), never through bracket tags.
4. ${buildPunctuationRhythmGuidance()}
5. On-screen emphasis markup: in the "subtitle" field's PRIMARY line only (never the translation line, and NEVER inside "dialogueOrNarration"), wrap 1 to 3 short key words/phrases per line in double asterisks so they render in a highlight color on screen — e.g. "Hai. Có **mượn** thì phải **trả**." For a "top_lists" point that happens to be a contrast ("A, không phải B"), highlight the core word/phrase in BOTH the A and B halves. For a reflective line, highlight whichever single word or short phrase carries the emotional weight of that sentence. Keep it sparse — only the words that truly deserve visual punch, never whole clauses.

Return the result as a JSON object matching exactly this schema:
{
  "title": "Episode title",
  "segments": [
    {
      "segmentNumber": 1,
      "visualDescription": "Detailed visual description in English of the flat white pictogram slide image, focusing on which symbolic figure(s)/props best depict this exact narration moment, their pose/positioning, and the flat white silhouettes (no glow) on pure black background. No text/labels in the image. Figure sized small relative to the frame (about two-thirds at most, clear black margin all around). (e.g. A single small flat white pictogram figure sits alone on the ground in the lower half of the frame, comfortably inset with black margin on every side, head resting on knees, a small flat white question-mark icon above their head, pure black background, crisp sharp edges with no glow, generous negative space, minimalist symbolic composition.)",
      "dialogueOrNarration": "Full narration line following the VOICE & STYLE REFERENCE above, in the primary language specified above.",
      "subtitle": "${isVietnamesePrimary
        ? 'Một hành động **tử tế** nhỏ bé có thể thay đổi cả một cuộc đời.\\nA small act of kindness can change an entire life.'
        : 'A small act of **kindness** can change an entire life.\\nMột hành động tử tế nhỏ bé có thể thay đổi cả một cuộc đời.'}"
    }
  ]
}
`;
}
