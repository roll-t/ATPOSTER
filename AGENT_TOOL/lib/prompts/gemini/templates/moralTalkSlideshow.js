/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản phân cảnh cho dòng
 * "Video Nói Chuyện Đạo Lý" — kể một tình huống đời thường rút ra bài học sống,
 * minh hoạ bằng pictogram trắng phát sáng trên nền đen (xem style block riêng
 * trong buildSegmentedPrompts.js). Không có nhân vật cố định xuyên suốt — mỗi
 * slide là 1 pictogram tượng trưng cho khoảnh khắc đang kể, giống bộ icon
 * "Human Pictogram" (người đàn ông gãi đầu, hai người cãi nhau, đám đông vẫy cờ...).
 *
 * narrationLanguage ('vi' mặc định | 'en') quyết định NGÔN NGỮ CHÍNH của lời kể
 * (dialogueOrNarration — chính là văn bản sẽ được lồng tiếng), và ngôn ngữ nào
 * đứng dòng đầu trong subtitle song ngữ.
 */
export function buildMoralTalkSlideshowScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isLandscape = input.aspectRatio === '16:9';
  const isVietnamesePrimary = (input.narrationLanguage || 'vi') !== 'en';

  const theme = input.moralTheme || 'self_help';
  
  let pacingGuidance = '';
  if (theme === 'self_help' || theme === 'rules_of_life') {
    // Requires deeper explanation, so fewer slides but longer duration per slide
    let targetSlides = '4 đến 6';
    if (durationRange === '1_2m') targetSlides = '8 đến 12';
    else if (durationRange === '2_3m') targetSlides = '12 đến 18';
    else if (durationRange === '3_4m') targetSlides = '18 đến 25';

    pacingGuidance = `- THEME CHARACTERISTIC: This is a "${theme === 'self_help' ? 'Self-Help / Motivation / Discipline' : 'Rules of Life / Communication / Etiquette'}" topic. This theme requires deep explanation and rich narration context per slide.
- REQUIRED SLIDE COUNT: Split the video into exactly ${targetSlides} segments/slides.
- NARRATION LENGTH PER SLIDE: Allow each slide's narration (dialogueOrNarration) to be longer (around 8 to 15 seconds of speech, equivalent to 25 to 45 words). Write descriptive, meaningful, and warm narration that fully explains the concept or context for the slide's image, rather than having short 3-second segments.`;
  } else {
    // top_lists: lists points, can have slightly more slides but still reasonable
    let targetSlides = '5 đến 8';
    if (durationRange === '1_2m') targetSlides = '10 đến 15';
    else if (durationRange === '2_3m') targetSlides = '15 đến 22';
    else if (durationRange === '3_4m') targetSlides = '22 đến 30';

    pacingGuidance = `- THEME CHARACTERISTIC: This is a "Top Lists / Warnings / Tips / Taboos" topic, listing specific items/points.
- REQUIRED SLIDE COUNT: Split the video into exactly ${targetSlides} segments/slides. One slide for introduction, one slide for each list point, and one slide for the conclusion.
- NARRATION LENGTH PER SLIDE: Each slide should have about 6 to 10 seconds of speech (equivalent to 18 to 30 words), allowing enough explanation for each point.`;
  }

  const compositionGuidance = isLandscape
    ? `- FRAME ORIENTATION: This slide is a WIDE 16:9 landscape frame. Use the extra horizontal space — you may place the main pictogram figure to one side with a smaller supporting icon/element on the other side (e.g. a clock, a signpost, a second figure), as long as it stays clean, symbolic, and readable at a glance.`
    : `- FRAME ORIENTATION: This slide is a TALL 9:16 portrait frame. Keep the composition simple and centered — one clear symbolic pictogram grouping per slide, generous empty black space around it, reads instantly on a phone screen.`;

  const narrationLanguageBlock = isVietnamesePrimary
    ? `- The narration (dialogueOrNarration) MUST be written in natural, warm, spoken VIETNAMESE — this is the primary spoken language of the video (it will be sent directly to a Vietnamese voice narrator). Use simple, everyday Vietnamese, short sentences, a calm and heartfelt storytelling tone — NOT preachy or lecturing.
- Subtitle language: for EVERY segment, the "subtitle" field must contain the Vietnamese line FIRST, then a literal "\\n", then a natural, accurate simple-English translation of that same line (e.g. "Một hành động tử tế nhỏ bé có thể thay đổi cả một cuộc đời.\\nA small act of kindness can change an entire life."). IMPORTANT: "subtitle" must NEVER contain a bracketed emotion tag like "[warmly]" — those belong ONLY inside "dialogueOrNarration" (they are voice-engine instructions, not on-screen text).`
    : `- The narration (dialogueOrNarration) MUST be written in simple, natural, spoken ENGLISH (CEFR A2-B1 level) — this is the primary spoken language of the video (it will be sent directly to an English voice narrator). Short sentences, calm and heartfelt storytelling tone — NOT preachy or lecturing.
- Subtitle language: for EVERY segment, the "subtitle" field must contain the English line FIRST, then a literal "\\n", then a natural, accurate Vietnamese translation of that same line (e.g. "A small act of kindness can change an entire life.\\nMột hành động tử tế nhỏ bé có thể thay đổi cả một cuộc đời."). IMPORTANT: "subtitle" must NEVER contain a bracketed emotion tag like "[warmly]" — those belong ONLY inside "dialogueOrNarration" (they are voice-engine instructions, not on-screen text).`;

  return `
You are a professional documentary-style scriptwriter and an expert AI image prompt engineer, specialized in short "moral lesson / life wisdom" storytelling videos (the Vietnamese "nói chuyện đạo lý" genre) — videos that tell a brief relatable everyday story and draw out a heartfelt life lesson from it.
Your task is to write a short third-person NARRATION (voiceover) script telling one such story/lesson, and design a detailed image generation prompt for each slide of the video.

NARRATION STYLE REQUIREMENTS (IMPORTANT):
- This is NOT a conversation/dialogue between characters. Do NOT write back-and-forth lines like "A: ... / B: ...".
- Write it as ONE narrator's voiceover (third-person, warm storytelling tone) describing a short, relatable everyday situation, then gently drawing out the life lesson/moral it teaches — reflective and heartfelt, never preachy or lecturing, never using the words "moral" or "lesson" explicitly if it can be shown instead of said.
- Each slide's pictogram simply depicts / symbolizes whatever moment the narration is describing right then. Figures are silent symbolic pictograms — no speech, no dialogue, no speech bubbles.
${narrationLanguageBlock}

VISUAL STYLE & IMAGE PROMPT REQUIREMENTS:
- The style is: minimalist glowing white pictogram icon illustrations on a solid pure black background — exactly like professional "human pictogram" icon packs (simple flat white human-silhouette figures with a soft white outer glow, no facial detail, no color, no scenery).
- Describe the visual scene in detail in English (visualDescription) for each segment/slide, even though the narration itself may be in Vietnamese — the image-generation model reads English prompts.
- Since the video is a SLIDESHOW of static images, each segment represents ONE slide/image.
- IMPORTANT — unlike a recurring-character story, this style uses a DIFFERENT symbolic pictogram grouping per slide, matching whatever the narration is describing at that exact moment (e.g. a lone confused figure with a question mark, two figures in conflict, a crowd embracing, a figure sharing something with another, a figure walking away, a group celebrating). Do not force the same named character to reappear across all slides — pick whichever generic pictogram(s) best symbolize each specific narration line.
- Describe the pose/action/symbolic prop icons (question marks, exclamation marks, hearts, arrows, speech bubbles, signposts, luggage, flags — all rendered in the same white-glow icon style) needed to convey the moment clearly at a glance.
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
1. The script must tell ONE short, relatable everyday story (a specific small moment or situation, not an abstract lecture) that naturally leads to the stated life lesson/topic.
2. The narration (dialogueOrNarration) must be third-person storytelling voiceover, spoken in a natural, warm, calm narrating voice — never a scripted conversation between named characters.
3. Emotion tags: You MAY include natural emotional/expressive sound tags in square brackets within the narration where appropriate to help the voice generator sound realistic (e.g., "[softly]", "[pause]", "[warmly]", "[gently]"). Keep these tags in the SAME language as the narration's own bracket convention (English tag words like [softly]/[pause] are fine even inside Vietnamese narration, since these are voice-engine instructions, not spoken text).

YÊU CẦU BẮT BUỘC DÀNH CHO ẢNH THU NHỎ YOUTUBE (YOUTUBE THUMBNAIL):
- Bên cạnh các slide phân cảnh câu chuyện, bạn BẮT BUỘC phải sinh thêm 1 mục "thumbnail" ở cuối JSON.
- Viết prompt cho thumbnail (visualDescription) thật cô đọng, giàu cảm xúc, tóm gọn được bài học đạo lý cốt lõi của toàn bộ video trong 1 bức ảnh pictogram trắng phát sáng tối giản trên nền đen.
- Kèm 1 câu tiêu đề ngắn 2-5 từ (headlineText) nổi bật, gây tò mò, viết bằng ${isVietnamesePrimary ? 'tiếng Việt' : 'tiếng Anh'} (ví dụ: ${isVietnamesePrimary ? '"BÀI HỌC KHÔNG NGỜ" hoặc "SỰ TỬ TẾ TRỞ LẠI"' : '"AN UNEXPECTED LESSON" or "KINDNESS COMES BACK"'}).

Return the result as a JSON object matching exactly this schema:
{
  "title": "Episode title",
  "segments": [
    {
      "segmentNumber": 1,
      "visualDescription": "Detailed visual description in English of the glowing white pictogram slide image, focusing on which symbolic figure(s)/props best depict this exact narration moment, their pose/positioning, and the soft white glow on pure black background. No text/labels in the image. (e.g. A single glowing white pictogram figure sits alone on the ground, head resting on knees, a small dim question-mark icon glowing faintly above their head, pure black background, soft white outer glow, generous negative space, minimalist symbolic composition.)",
      "dialogueOrNarration": "Full narration line, third-person voiceover style, in the primary language specified above.",
      "subtitle": "${isVietnamesePrimary
        ? 'Một hành động tử tế nhỏ bé có thể thay đổi cả một cuộc đời.\\nA small act of kindness can change an entire life.'
        : 'A small act of kindness can change an entire life.\\nMột hành động tử tế nhỏ bé có thể thay đổi cả một cuộc đời.'}"
    }
  ],
  "thumbnail": {
    "visualDescription": "Detailed, highly impactful, curiosity-inducing YouTube thumbnail scene description in English, in the same glowing white pictogram-on-black style, 16:9 composition, high contrast, symbolic and emotionally resonant.",
    "headlineText": "${isVietnamesePrimary ? 'BÀI HỌC KHÔNG NGỜ' : 'AN UNEXPECTED LESSON'}"
  }
}
`;
}
