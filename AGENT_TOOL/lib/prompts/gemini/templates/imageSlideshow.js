/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản phân cảnh cho dòng
 * "Video Slide Ảnh Học Tiếng Anh".
 */
import { buildPunctuationRhythmGuidance } from './narrationPacing.js';
import { buildHookGuidance, buildHumanVoiceGuidance } from './humanVoice.js';

export function buildImageSlideshowScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isBilingual = true;
  const isLandscape = input.aspectRatio === '16:9';

  // Nhịp slide phải GIÃN RA ở các mốc video dài. Ở nhịp ngắn 3-6 giây/slide, một video 8-10 phút
  // sẽ cần tới ~120 ảnh — số ảnh phải sinh thủ công qua Google Flow lớn tới mức không làm nổi.
  // Video explainer dài ngoài đời cũng giữ mỗi hình lâu hơn hẳn video ngắn, nên giãn nhịp vừa
  // đúng thực tế biên tập vừa kéo số ảnh về mức làm được.
  const LONG_TIERS = {
    '4_6m': { slides: '35 đến 48', seconds: '6 đến 10 giây' },
    '6_8m': { slides: '48 đến 65', seconds: '6 đến 10 giây' },
    '8_10m': { slides: '60 đến 82', seconds: '7 đến 11 giây' },
  };
  const longTier = LONG_TIERS[durationRange];
  const targetSlides = longTier ? longTier.slides : durationInfo.segmentsCount;
  const slideSecondsHint = longTier ? longTier.seconds : '3 đến 6 giây (rất ngắn)';

  const charsDetail = `
- Determine the stick-figure character(s) needed to silently depict the topic. Use as few as the topic actually needs (often just 1, at most 3).
- Give them simple names (e.g. Alex, Mia, John, Leo) and a simple distinguishing accessory/look (e.g. wearing a red baseball cap, wearing round glasses, holding a notebook, wearing a blue hoodie) — this is only for YOUR OWN consistency across slides. Never write these names as visible text anywhere in the image.
- Since this is a stick figure style, characters must be simple black-ink hand-drawn stick figures on a plain white/cream background (whiteboard style).
- Keep these characters, their accessories, and the background highly consistent across all segments/slides.
`;

  const compositionGuidance = isLandscape
    ? `- FRAME ORIENTATION: This slide is a WIDE 16:9 landscape frame. Use the extra horizontal space deliberately — do not just draw the same narrow portrait composition with empty margins on the sides.
- Enrich each scene with supporting visual details that reinforce what the narration is saying at that moment: relevant props, background elements, simple environmental context (e.g. a clock on the wall, a calendar with a crossed-out date, a stack of books, other people in the background, a chart/graph sketched on a whiteboard, small supporting icons/objects placed around the main character).
- These extra details act as visual "evidence" for the narration's point — they should directly illustrate or emphasize the specific idea being said, not be random clutter. Keep them minimalist whiteboard-sketch style, consistent with the main character's line-art.
- You may compose the frame with the main character on one side and a secondary supporting element/mini-scene on the other side (e.g. character + a thought-bubble-like inset showing a related detail), as long as it stays clean and readable at a glance.`
    : `- FRAME ORIENTATION: This slide is a TALL 9:16 portrait frame. Keep the composition simple and focused — one clear focal point (the main character and their immediate action), minimal background elements, close framing so it reads instantly on a phone screen.`;

  return `
You are a professional documentary-style scriptwriter and an expert AI image prompt engineer.
Your task is to write a short third-person NARRATION (voiceover) script for learning English about a real, relatable everyday problem/issue, and design a detailed image generation prompt for each slide of the video.

NARRATION STYLE REQUIREMENTS (IMPORTANT):
- This is NOT a conversation/dialogue between characters. Do NOT write back-and-forth lines like "Alex: ... / Mia: ...".
- Write it as ONE narrator's voiceover (third-person, documentary/storytelling tone) describing the problem: what it looks like, why it happens, its effects, and — if it fits naturally — a closing thought.
- The stick figure character(s) shown in each slide simply ACT OUT / illustrate whatever the narration is describing at that moment. They are silent — no speech, no dialogue, no speech bubbles.

${buildHumanVoiceGuidance({ isVietnamese: false })}
- Note: the vocabulary constraint below (simple A2/B1 English) still applies on top of everything above — write like a real person talking, using only simple words.

${buildHookGuidance({ isVietnamese: false })}

VISUAL STYLE & IMAGE PROMPT REQUIREMENTS:
- The style is: Minimalist hand-drawn whiteboard-animation style, simple black ink line illustrations and stick figures (circle head, simple line body/limbs) on a plain white background, plain sketch look.
- Describe the visual scene in detail in English (visualDescription) for each segment/slide.
- Since the video is a SLIDESHOW of static images, each segment represents ONE slide/image.
- Describe the scene with the stick figure character(s) silently depicting the moment the narration is talking about right then — their pose, action, simple facial expression, the minimalist whiteboard-sketched setting, and mood. No speech, no dialogue.
- Keep the character appearance (accessories, etc.) and background settings highly consistent across all segments/slides, so the slideshow flows logically as one continuous depiction of the issue.
${compositionGuidance}
- Do NOT mention motion/animation words like "animating", "zooming", "moving" in the visualDescription because we are generating static images. Focus on poses, gestures, and static frame composition.
- IMPORTANT — no unwanted text in the image: do NOT describe or request character-name labels, "reference sheet" style callouts, arrows, or any technical/construction annotations anywhere in the image. Only if the scene itself naturally calls for a short, meaningful piece of in-scene text (for example one bold impactful word or short phrase reinforcing what the slide is about, like on a sign, a phone screen, or as simple bold graphic text) should any text appear — and it must stay short and purposeful, never a label describing the drawing.
- The visual description should be descriptive and detail-oriented, suitable for direct text-to-image prompts (e.g. Midjourney or Flux).

PER-SLIDE LAYOUT ("layout") — HOW THIS SLIDE IS PRESENTED ON SCREEN:
Set a "layout" on EVERY segment. A video that uses the exact same presentation on all slides looks
flat and monotonous over several minutes; alternating between these keeps a long explainer watchable
(this mirrors how whiteboard-explainer channels actually edit). Pick whichever genuinely fits that
beat of the narration — do NOT cycle through them mechanically:
  - "default"      : illustration fills the frame, subtitle rendered in the video's normal caption
                     style. Use for most slides — this should still be the majority.
  - "image-only"   : illustration fills the frame, NO subtitle drawn at all. Use as a breathing beat
                     when the drawing alone already says it, or on a strong emotional/punchline
                     image. Still write dialogueOrNarration and subtitle normally (the narration is
                     still spoken; only the on-screen text is hidden).
  - "caption-left" : illustration fills the frame, subtitle pinned to the BOTTOM-LEFT corner instead
                     of centered. Use when the drawing's subject sits to the right/centre so the
                     lower-left corner is visually empty.
  - "split"        : frame split in half — text on one side, illustration on the other. Use for a
                     definition, a contrast, or a single punchy statement tied to one character.
                     Also set "splitSide": "right" (illustration on the right, the usual choice) or
                     "left". For this layout describe a SINGLE character/object centered on a plain
                     background in visualDescription, since it only gets half the frame.
  - "bullets"      : a TEXT-ONLY slide, no illustration at all. Also fill "bullets" with 2 to 4
                     short lines (each a complete, punchy point, max ~12 words). Use ONLY where the
                     narration genuinely lists steps/reasons/tips. At most 1-2 of these in the whole
                     video, never two in a row. Still write visualDescription normally (an image is
                     generated anyway and simply not used for this slide) plus dialogueOrNarration
                     that reads those points aloud.

DURATION & PACING REQUIREMENTS:
- Target total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- BẮT BUỘC: Bạn phải chia kịch bản thành chuỗi từ ${targetSlides} phân đoạn/slide liên tục.
- Mỗi phân đoạn/slide tương ứng với thời lượng đọc từ ${slideSecondsHint}. Hãy chia lời thuyết minh tương ứng.

CAST/CHARACTERS GUIDELINES:
${charsDetail}

USER'S TOPIC / ISSUE:
"${input.scenario || 'No specific topic given'}"
Draft narration/content suggestion (if any):
"${input.script || 'Freely write a natural narration about this issue'}"

NARRATION SCRIPT GUIDELINES:
1. The script must go straight into describing a real, relatable everyday problem/issue (e.g. procrastination, phone addiction, wasting money, fear of failure, unhealthy habits, social media comparison...) told in a narrator's voice — never as a scripted conversation between named characters.
2. The narration (dialogueOrNarration) must be third-person storytelling/documentary-style voiceover, spoken in a natural, normal narrating voice.
3. Language constraint: The content MUST be 100% in simple, basic English (suitable for high school level, TOEIC 300+ level). Use simple vocabulary and short, clear sentences. No advanced expressions.
4. ${isBilingual
    ? 'Subtitle language: for EVERY segment, the "subtitle" field must contain the English line, then a literal "\\n", then a natural, accurate Vietnamese translation of that same line (e.g. "Millions of people lie awake every night, scrolling instead of sleeping.\\nHàng triệu người thức trắng đêm để lướt điện thoại thay vì ngủ."). Keep the Vietnamese translation short and natural, matching the meaning of the English line above it — do not translate dialogueOrNarration, only subtitle.'
    : 'Display the English-only subtitle/text clearly.'}
5. Do NOT include bracketed tags like "[sighs]", "[softly]", "[gasp]", "[whispering]", "[pause]" anywhere in the narration — the voice engine does not read them and does not act on them, they have zero effect on the spoken audio and only show up as clutter in the text. Express emotion/pacing through word choice and punctuation instead, never through bracket tags.
6. ${buildPunctuationRhythmGuidance()}


YÊU CẦU BẮT BUỘC DÀNH CHO ẢNH THU NHỎ YOUTUBE (YOUTUBE THUMBNAIL):
- Bên cạnh các slide phân cảnh câu chuyện, bạn BẮT BUỘC phải sinh thêm 1 mục "thumbnail" ở cuối JSON.
- Ảnh Thu Nhỏ (Thumbnail) là YẾU TỐ QUAN TRỌNG NHẤT quyết định tỉ lệ nhấp xem video (CTR) trên YouTube.
- Viết prompt cho thumbnail (visualDescription) thật có ý nghĩa, sâu sắc, cô đọng được bài học / xung đột tâm lý cốt lõi của toàn bộ video trong 1 bức ảnh người que tối giản trên nền trắng.
- Tăng cường độ tương phản thị giác, biểu cảm nét mặt và tư thế nhân vật thật giàu cảm xúc, kèm 1 câu tiêu đề ngắn 2-4 từ (headlineText) nổi bật (ví dụ: "STOP PROCRASTINATING!" hoặc "OVERCOME SHYNESS NOW!").

Return the result as a JSON object matching exactly this schema:
{
  "title": "Episode title",
  "segments": [
    {
      "segmentNumber": 1,
      "visualDescription": "Detailed visual description in English of the slide image, focusing on the stick figure character(s) silently acting out the moment the narration describes, their positions, poses, accessories, expressions, and whiteboard sketch background, suitable for direct text-to-image prompts. No text/labels in the image unless one short meaningful phrase naturally belongs in the scene. (e.g. In a simple whiteboard-sketched dark bedroom at night, a simple black ink stickman lies in bed scrolling on a glowing phone, eyes half-closed, clearly unable to sleep. Plain white background, minimalist line-art.)",
      "dialogueOrNarration": "Full narration line in English, third-person voiceover style (e.g. Millions of people lie awake every night, scrolling instead of sleeping.)",
      "subtitle": "${isBilingual
        ? 'Millions of people lie awake every night, scrolling instead of sleeping.\\nHàng triệu người thức trắng đêm để lướt điện thoại thay vì ngủ.'
        : 'Millions of people lie awake every night, scrolling instead of sleeping.'}",
      "layout": "default",
      "splitSide": "right",
      "bullets": ["Only include this field on a \\"bullets\\" slide", "2 to 4 short punchy lines", "Otherwise omit it entirely"]
    }
  ],
  "thumbnail": {
    "visualDescription": "Detailed, highly impactful, curiosity-inducing YouTube thumbnail scene description in English. Depicting the stick figure character in the most dramatic, emotional, and meaningful dilemma of the story, with high contrast, clear 16:9 composition, minimalist whiteboard line-art style on plain white background. (e.g. Minimalist whiteboard line-art style: A stick figure character sitting at a desk surrounded by giant ticking clocks and towering stacks of unfinished work, head in hands in deep realization, while a bold glowing banner reads 'STOP PROCRASTINATING!'. Plain white background, high contrast, dramatic emotional storytelling composition.)",
    "headlineText": "STOP PROCRASTINATING!"
  }
}
`;
}
