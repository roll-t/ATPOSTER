/**
 * Xây dựng prompt meta gửi cho Gemini để sinh kịch bản phân đoạn cho dòng
 * "Video Trả Lời Câu Hỏi Tiếng Anh". Nội dung prompt viết bằng tiếng Anh để đồng nhất với
 * toàn bộ format prompt Veo3. Mỗi câu hỏi luôn là 1 "vòng" gồm đúng 3 phân đoạn
 * (3s + 10s + 10s ≈ 23s). Để tôn trọng thời lượng video mà người dùng chọn thay vì luôn
 * cố định 1 câu hỏi/23 giây, ta nhân số vòng lên tương ứng — video dài hơn = nhiều câu hỏi
 * liên tiếp (quiz nhiều câu), không phải kéo dài giả tạo 1 câu hỏi duy nhất.
 */
export function buildEnglishQuizScriptPrompt(input, durationInfo) {
  const roundsCount = Math.max(1, Math.round(durationInfo.targetSeconds / 23));

  return `
You are a professional screenwriter and an expert Veo3 AI video prompt engineer.
Your task is to create a rapid-fire English multiple-choice quiz video script with several questions in a row, jumping straight into the questions with no greeting or lengthy intro.

DEFAULT QUESTION FORMAT: Fill in the blank with the correct word. Example: "She ____ to school yesterday. (go / goes / went)"

VISUAL STYLE & VOICE:
- Visual style: "Clean flat 2D vector graphic style, modern educational app aesthetic, minimal vector shapes, bright and energetic mood, cute colorful pastel palette".
- Voice: A young, cheerful, bright female voice with a cute, kid-friendly preschool/kindergarten-teacher style.

MANDATORY RULES FOR VISUAL CONSISTENCY (AVOID STYLE DRIFT):
1. Because Google Flow/Veo3's video AI generates each segment's imagery independently, writing something vague like "keep the same background/same character" will cause the AI to generate a completely different background and character (e.g. a panda mascot flipping from 2D to 3D).
2. MANDATORY: You must repeat the EXACT full description of the background scene, mascot character, pose, position, and expression in ALL segments throughout the entire video (including across different questions) — only change the text shown on the blackboard and the countdown timer. The mascot must be the SAME character throughout every question.
3. Do not use short, vague phrases like "same background" or "panda remains".

DURATION & NUMBER OF QUESTIONS:
- Target video duration: ${durationInfo.label} (about ${durationInfo.targetSeconds} seconds).
- The video MUST contain exactly ${roundsCount} multiple-choice questions in a row to fill the target duration (not one question artificially stretched out).
- Question 1 must use EXACTLY the content the user provided below (do not change it). If more questions are needed (when ${roundsCount} > 1), invent additional questions on the SAME grammar/vocabulary topic as question 1 (or a closely related topic), with similar difficulty, so the whole video feels like a coherent series of exercises on the same theme.

MANDATORY STRUCTURE FOR EACH QUESTION (each question = exactly 3 consecutive segments in the order below; number segmentNumber continuously and increasingly across the ENTIRE video, WITHOUT resetting to 1 for each new question):

1. "Show question" segment (Duration: exactly 3 seconds):
   - Content: Show the English fill-in-the-blank question on the central board over a bright pastel background. A cute mascot character stands waving happily.
   - Dialogue (dialogueOrNarration): Read the English question aloud in a cute kindergarten-teacher voice.
   - Subtitle (subtitle): The English question text.

2. "Countdown + answers" segment (Duration: exactly 10 seconds):
   - Content: The background, mascot, and question exactly match the previous segment. The central board now also shows 4 answer choices (A, B, C, D) below the question. A 10-second countdown ring appears in a corner of the screen.
   - Dialogue (dialogueOrNarration): Read out the answer hints or the countdown in English with a cheerful kindergarten-teacher voice.
   - Subtitle (subtitle): Show the list of 4 English answer choices.

3. "Answer + explanation" segment (Duration: 10 seconds):
   - Content: The background, mascot, and question exactly match the previous segments. The correct answer is highlighted in bright green; the wrong ones are highlighted red/dimmed. Below the board, an explanation appears in Vietnamese.
   - SPECIAL NOTE: The explanation (both the dialogueOrNarration and subtitle of this segment) MUST be written entirely in VIETNAMESE so viewers can easily understand the lesson.

Repeat the exact same 3-segment structure above for each following question (if ${roundsCount} > 1), keeping the same mascot/background, only changing the question/answers/explanation content.

USER'S IDEA (used for question 1):
- Original question: "${input.question || 'English question'}"
- Answer choices: "${input.options || ''}"
- Correct answer: "${input.correctAnswer || ''}"
- Explanation: "${input.explanation || ''}"
- Topic: "${input.topic || ''}"

Return the result as a JSON object matching exactly this schema. The example below only illustrates the 3-segment structure of ONE QUESTION — the actual "segments" array must contain exactly ${roundsCount * 3} segments (${roundsCount} questions × 3 segments/question, with segmentNumber numbered continuously 1, 2, 3, 4, 5, 6...):
{
  "title": "Quiz video title",
  "segments": [
    {
      "segmentNumber": 1,
      "durationSeconds": 3,
      "visualDescription": "Detailed 2D graphic description (e.g. A flat 2D vector graphic. A bright warm yellow pastel background with soft white clouds. In the bottom right corner, a cute cartoon baby panda sits smiling and waving happily. A clean white blackboard in the center displays the question: 'Choose the correct word: They ____ soccer last Sunday.')",
      "dialogueOrNarration": "Kindergarten-style English MC voice (e.g. Narrator: Can you fill in the blank? They blank soccer last Sunday.)",
      "subtitle": "They ____ soccer last Sunday."
    },
    {
      "segmentNumber": 2,
      "durationSeconds": 10,
      "visualDescription": "2D graphic description repeating segment 1 exactly plus new details (e.g. A flat 2D vector graphic. A bright warm yellow pastel background with soft white clouds. In the bottom right corner, a cute cartoon baby panda sits smiling and waving happily. A clean white blackboard in the center displays the question: 'Choose the correct word: They ____ soccer last Sunday.' Below the question, four answer options appear: A. play, B. plays, C. played, D. playing. A friendly 10-second countdown timer wheel counts down in the center.)",
      "dialogueOrNarration": "Kindergarten-style English MC counting down (e.g. Narrator: A, B, C, or D? Let's guess in ten seconds.)",
      "subtitle": "A. play | B. plays | C. played | D. playing"
    },
    {
      "segmentNumber": 3,
      "durationSeconds": 10,
      "visualDescription": "2D graphic description repeating segment 1 exactly plus new details (e.g. A flat 2D vector graphic. A bright warm yellow pastel background with soft white clouds. In the bottom right corner, a cute cartoon baby panda sits smiling and waving happily. A clean white blackboard in the center displays the question: 'Choose the correct word: They ____ soccer last Sunday.' Option C. played glows in bright green as the correct answer. A simple blackboard text at the bottom shows the grammar explanation in Vietnamese.)",
      "dialogueOrNarration": "EXPLANATION DIALOGUE IN VIETNAMESE (e.g. Narrator: Đáp án đúng là C vì câu này nói về hành động xảy ra vào chủ nhật tuần trước, ta dùng thì quá khứ đơn.)",
      "subtitle": "Giải thích: Dùng thì quá khứ đơn 'played' cho hành động xảy ra tuần trước."
    }
  ]
}
`;
}
