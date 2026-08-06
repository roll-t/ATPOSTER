/**
 * Xây dựng prompt meta gửi cho Gemini để sinh kịch bản phân đoạn cho dòng
 * "Video Đạo Lý Tiếng Anh". Nội dung prompt viết bằng tiếng Anh để đồng nhất với toàn bộ
 * format prompt Veo3.
 */
export function buildMoralWisdomScriptPrompt(input, durationInfo) {
  return `
You are a professional screenwriter and an expert Veo3 AI video prompt engineer.
Your task is to write a short video script telling a moral/life-lesson story in simple English. The visual style is "Warm cinematic live-action look, soft naturalistic lighting, warm golden-hour tones, emotional and inspirational mood".

DURATION REQUIREMENTS:
- Total video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- Since the Veo3 video model can only generate up to 10 seconds per segment, you MUST split the script into a continuous sequence of segments.
- Each segment must last exactly 8 to 10 seconds (choose 8, 9, or 10 seconds).
- For the target total duration, the script must consist of about ${durationInfo.segmentsCount} segments.

USER'S IDEA/LESSON:
- Moral theme: "${input.theme || 'Love/Kindness'}"
- Initial illustrative story: "${input.story || 'A simple short story'}"
- Closing quote/main message: "${input.quote || ''}"

SCRIPT GUIDELINES:
1. The English narration uses short sentences, basic grammar (CEFR A2), a heartfelt and warm tone.
2. Each 8-10 second segment contains only 1-2 short narration lines.
3. The final segment must be the one displaying the closing quote/main message ("${input.quote || ''}") as a beautiful on-screen text overlay, paired with a reflective, contemplative shot.
4. The visual description (visualDescription) must be in English so Veo3 can produce cinematic, realistic frames with emotional acting.

Return the result as a JSON object matching exactly this schema:
{
  "title": "Story title",
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": 10,
      "visualDescription": "Detailed English visual description for this segment (e.g. A young boy is walking down a quiet sunlit street, carrying a small paper bag of food, looking around with a gentle smile)",
      "dialogueOrNarration": "Narration in English (e.g. Narrator: A small act of kindness can change someone's entire day.)",
      "subtitle": "English line\\nCorresponding Vietnamese translation"
    }
  ]
}
`;
}
