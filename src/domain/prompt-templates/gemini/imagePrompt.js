/**
 * Xây dựng prompt gửi cho Gemini để tạo câu lệnh ảnh (Image Prompt) chuẩn chuyên nghiệp
 * cho Midjourney v6.1, Flux 1.1 Pro và Stable Diffusion.
 */
export function buildImagePromptGeminiPrompt({
  idea,
  style = 'Cinematic Film Photography',
  aspectRatio = '16:9',
  lighting = 'Cinematic Dramatic Lighting',
  camera = 'Eye-level, 85mm portrait lens',
}) {
  return `You are a world-class AI Image Prompt Engineer specializing in Midjourney v6.1, Flux 1.1 Pro, and Stable Diffusion.

The user wants to generate a masterpiece image prompt based on the following input:
- User Idea / Subject: "${idea}"
- Art Style: "${style}"
- Aspect Ratio: "${aspectRatio}"
- Lighting / Mood: "${lighting}"
- Camera / Composition: "${camera}"

TASK:
1. Write a master-tier, highly detailed English prompt for Midjourney v6.1:
   - Describe the main subject vividly with concrete physical details, posture, materials, and expression.
   - Describe the setting, environment, background elements, and depth of field.
   - Specify the exact lighting, color grading, atmosphere, and volumetric effects.
   - Specify photographic / artistic details: lens (e.g. 35mm, 85mm anamorphic), aperture (f/1.4, f/2.8), textures, render quality (Unreal Engine 5, 8k resolution, photorealistic).
   - Append appropriate Midjourney parameters at the very end (e.g. --ar ${aspectRatio} --v 6.1 --stylize 250).

2. Write a clean, natural prompt for Flux 1.1 Pro / Stable Diffusion:
   - Natural language description without Midjourney parameter flags.

3. Provide a brief Vietnamese summary explaining the visual composition and key elements.

RETURN ONLY VALID JSON (no markdown fences, no extra text):
{
  "midjourneyPrompt": "...",
  "fluxPrompt": "...",
  "vietnameseExplanation": "..."
}
`;
}
