/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản phân cảnh cho dòng
 * "Video Slide Ảnh Học Tiếng Anh".
 */
export function buildImageSlideshowScriptPrompt(input, durationInfo) {
  const charsDetail = `
- Determine the stick-figure character(s) needed to silently depict the topic. Use as few as the topic actually needs (often just 1, at most 3).
- Give them simple names (e.g. Alex, Mia, John, Leo) and a simple distinguishing accessory/look (e.g. wearing a red baseball cap, wearing round glasses, holding a notebook, wearing a blue hoodie) — this is only for YOUR OWN consistency across slides. Never write these names as visible text anywhere in the image.
- Since this is a stick figure style, characters must be simple black-ink hand-drawn stick figures on a plain white/cream background (whiteboard style).
- Keep these characters, their accessories, and the background highly consistent across all segments/slides.
`;

  return `
You are a professional documentary-style scriptwriter and an expert AI image prompt engineer.
Your task is to write a short third-person NARRATION (voiceover) script for learning English about a real, relatable everyday problem/issue, and design a detailed image generation prompt for each slide of the video.

NARRATION STYLE REQUIREMENTS (IMPORTANT):
- This is NOT a conversation/dialogue between characters. Do NOT write back-and-forth lines like "Alex: ... / Mia: ...".
- Write it as ONE narrator's voiceover (third-person, documentary/storytelling tone) describing the problem: what it looks like, why it happens, its effects, and — if it fits naturally — a closing thought.
- The stick figure character(s) shown in each slide simply ACT OUT / illustrate whatever the narration is describing at that moment. They are silent — no speech, no dialogue, no speech bubbles.

VISUAL STYLE & IMAGE PROMPT REQUIREMENTS:
- The style is: Minimalist hand-drawn whiteboard-animation style, simple black ink line illustrations and stick figures (circle head, simple line body/limbs) on a plain white background, plain sketch look.
- Describe the visual scene in detail in English (visualDescription) for each segment/slide.
- Since the video is a SLIDESHOW of static images, each segment represents ONE slide/image.
- Describe the scene with the stick figure character(s) silently depicting the moment the narration is talking about right then — their pose, action, simple facial expression, the minimalist whiteboard-sketched setting, and mood. No speech, no dialogue.
- Keep the character appearance (accessories, etc.) and background settings highly consistent across all segments/slides, so the slideshow flows logically as one continuous depiction of the issue.
- Do NOT mention motion/animation words like "animating", "zooming", "moving" in the visualDescription because we are generating static images. Focus on poses, gestures, and static frame composition.
- IMPORTANT — no unwanted text in the image: do NOT describe or request character-name labels, "reference sheet" style callouts, arrows, or any technical/construction annotations anywhere in the image. Only if the scene itself naturally calls for a short, meaningful piece of in-scene text (for example one bold impactful word or short phrase reinforcing what the slide is about, like on a sign, a phone screen, or as simple bold graphic text) should any text appear — and it must stay short and purposeful, never a label describing the drawing.
- The visual description should be descriptive and detail-oriented, suitable for direct text-to-image prompts (e.g. Midjourney or Flux).

DURATION & PACING REQUIREMENTS:
- Target total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- BẮT BUỘC: Bạn phải chia kịch bản thành chuỗi từ ${durationInfo.segmentsCount} phân đoạn/slide liên tục.
- Mỗi phân đoạn/slide chỉ tương ứng với thời lượng đọc từ 3 đến 6 giây (rất ngắn). Hãy chia nhỏ lời thuyết minh tương ứng.

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
4. Display the English-only subtitle/text clearly.
5. Emotion tags: You MAY include natural emotional/expressive sound tags in square brackets within the narration where appropriate to help the voice generator sound realistic (e.g., "[sighs] So many people struggle with this every day.", "[softly] But it does not have to stay this way."). Use standard tags like [sighs], [softly], [gasp], [whispering], [pause]. Do not include Vietnamese emotional tags, only English ones.


Return the result as a JSON object matching exactly this schema:
{
  "title": "Episode title",
  "segments": [
    {
      "segmentNumber": 1,
      "visualDescription": "Detailed visual description in English of the slide image, focusing on the stick figure character(s) silently acting out the moment the narration describes, their positions, poses, accessories, expressions, and whiteboard sketch background, suitable for direct text-to-image prompts. No text/labels in the image unless one short meaningful phrase naturally belongs in the scene. (e.g. In a simple whiteboard-sketched dark bedroom at night, a simple black ink stickman lies in bed scrolling on a glowing phone, eyes half-closed, clearly unable to sleep. Plain white background, minimalist line-art.)",
      "dialogueOrNarration": "Full narration line in English, third-person voiceover style (e.g. Millions of people lie awake every night, scrolling instead of sleeping.)",
      "subtitle": "Millions of people lie awake every night, scrolling instead of sleeping."
    }
  ]
}
`;
}
