/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản phân cảnh cho dòng
 * "Video Slide Người Que PNG" — dùng thư viện ảnh PNG sẵn có thay vì sinh ảnh AI.
 * Gemini chọn asset ID + toạ độ (x,y) cho từng slide; Remotion ghép chúng thành cảnh.
 */
import { buildPunctuationRhythmGuidance } from './narrationPacing.js';
import { buildHookGuidance, buildHumanVoiceGuidance } from './humanVoice.js';

export function buildImageSlideshowScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isBilingual = true;
  const isVietnamese = (input.narrationLanguage || 'en') === 'vi';

  const LONG_TIERS = {
    '4_6m': { slides: '35 đến 48', seconds: '6 đến 10 giây' },
    '6_8m': { slides: '48 đến 65', seconds: '6 đến 10 giây' },
    '8_10m': { slides: '60 đến 82', seconds: '7 đến 11 giây' },
  };
  const longTier = LONG_TIERS[durationRange];
  const targetSlides = longTier ? longTier.slides : durationInfo.segmentsCount;
  const slideSecondsHint = longTier ? longTier.seconds : '3 đến 6 giây';

  return `
You are a professional scriptwriter creating a narrated story video using a library of pre-built PNG stick-figure assets.
Your job: write the narration AND choose which assets to place on screen for each slide.

NARRATION STYLE:
- ONE narrator's voiceover (third-person, documentary/storytelling tone) — NOT dialogue between characters.
- The stick figure simply ACTS OUT what the narration describes. It is silent — no speech, no dialogue.

${buildHumanVoiceGuidance({ isVietnamese })}
${!isVietnamese ? '- Vocabulary constraint: simple A2/B1 English. Short, clear sentences. No advanced expressions.' : '- Ngôn ngữ: tự nhiên, gần gũi, khẩu ngữ. Câu ngắn rõ. Tránh văn viết hàn lâm.'}

${buildHookGuidance({ isVietnamese })}

═══════════════════════════════════════════════════════
PNG ASSET LIBRARY — use ONLY these exact IDs, no others
═══════════════════════════════════════════════════════

POSES — stick figure with red snapback cap (use exactly 1 per scene):

  Standing / Emotions:
    pose_standing_neutral  pose_happy_arms_up  pose_sad  pose_thinking
    pose_angry  pose_shocked  pose_pointing_right  pose_waving
    pose_pointing_at_viewer  pose_facepalm  pose_celebrating
    pose_laughing  pose_crying  pose_comparing  pose_listening

  Sitting / Desk work:
    pose_meditating  pose_typing  pose_writing_sitting  pose_reading
    pose_sleeping_at_desk  pose_stressed  pose_sad_hugging_knees
    pose_phone_sitting  pose_eating

  Movement:
    pose_running  pose_walking  pose_jumping  pose_walking_phone
    pose_tired_running  pose_stretching  pose_overwhelmed

  Lying / Resting:
    pose_sleeping  pose_lying_phone  pose_lying_resting
    pose_exhausted  pose_shocked_receipt

PROPS — objects held or placed near the character (zIndex 3):
  prop_phone  prop_laptop  prop_alarm_clock  prop_coffee_cup  prop_book_open
  prop_headphones  prop_notebook  prop_pencil  prop_backpack  prop_clock
  prop_calendar  prop_checklist  prop_chart_up  prop_hourglass  prop_coins
  prop_wallet_empty  prop_receipt  prop_desk_lamp

SYMBOLS — floating icons and effects (zIndex 4):
  sym_checkmark  sym_xmark  sym_star  sym_heart  sym_lightning
  sym_zzz  sym_thought_bubble  sym_speech_bubble  sym_exclamation
  sym_arrow_up  sym_target  sym_key  sym_warning  sym_fire
  sym_trophy  sym_chain  sym_arrow_down  sym_crown

BACKGROUND ELEMENTS — scene dressing behind the character (zIndex 0–1):
  Nature:    bg_tree  bg_bush_flower  bg_flower_sun  bg_sun  bg_cloud
             bg_rain_cloud  bg_hill_flowers  bg_rainbow  bg_moon_stars
  Buildings: bg_house  bg_building  bg_school  bg_shop  bg_bench
             bg_lamp_post  bg_fence  bg_road  bg_city_skyline
  Fun:       bg_balloon_heart  bg_kite  bg_airplane  bg_confetti
             bg_sparkle  bg_books_stack  bg_trophy_gold  bg_piggy_bank  bg_plant_pot

═══════════════════════════════════════════════════════
CANVAS LAYOUT — 9:16 portrait (1080×1920 px)
═══════════════════════════════════════════════════════

Each element is a square PNG centered on its (x, y) point:

  x      — 0 = left edge, 100 = right edge, 50 = horizontal center
  y      — 0 = top edge,  100 = bottom edge, 62 = typical character standing spot
  scale  — size multiplier: 1.0 ≈ 32% of canvas height (~614 px tall)
  zIndex — draw order: 0 (furthest back) → 4 (in front of everything)
  flip   — true = mirror horizontally (character faces the other way)
  delay  — seconds before this element fades in (0 = appears immediately)

Recommended sizes by type:
  bg_*   → scale 1.5–3.0   (fill the background behind the character)
  pose_* → scale 0.9–1.2   (character, lower-center of frame)
  prop_* → scale 0.4–0.7   (objects near the character)
  sym_*  → scale 0.4–0.65  (floating icons above or beside the character)

Typical 9:16 composition (character with background, 4–5 elements):
  bg element  — x=50, y=55, scale=2.5, zIndex=0, delay=0
  2nd bg (opt)— x=20, y=68, scale=1.8, zIndex=1, delay=0
  CHARACTER   — x=50, y=62, scale=1.0, zIndex=2, delay=0.2   ← always required
  prop (opt)  — x=72, y=50, scale=0.55, zIndex=3, delay=0.5
  symbol (opt)— x=73, y=28, scale=0.55, zIndex=4, delay=0.8

COMPOSITION RULES (follow strictly):
  1. Every scene MUST have exactly 1 pose_* element.
  2. Maximum 5 elements total per scene (keep it clean and readable).
  3. Do NOT use the exact same element combination for 3 or more scenes in a row.
  4. Choose the pose that BEST matches what the narration says at that moment.
  5. Pick background elements that fit the story's setting.
  6. Use delay to create a natural reveal: bg first (0) → character (0.2) → props/effects (0.5–1.0).
  7. The character must always be in the lower-center area (x=40–60, y=55–70) unless the story clearly says otherwise.

DURATION & PACING:
- Target total video duration: ${durationInfo.label} (~${durationInfo.targetSeconds} seconds total).
- BẮT BUỘC: chia kịch bản thành ${targetSlides} phân đoạn liên tục.
- Thời lượng đọc mỗi segment: ${slideSecondsHint}. Tổng thời lượng phải khớp target.

USER'S TOPIC:
"${input.scenario || 'No specific topic given'}"
Draft content / narration suggestion (if any):
"${input.script || 'Freely write a natural narration about this topic'}"

NARRATION GUIDELINES:
1. Third-person documentary voiceover about a real, relatable everyday problem or situation.
2. ${isVietnamese
    ? 'Lời thuyết minh (dialogueOrNarration) PHẢI bằng tiếng Việt. Viết tự nhiên, câu ngắn, gần gũi — như người bạn kể chuyện, KHÔNG phải văn nghị luận.'
    : 'Content MUST be in simple, basic English (A2/B1). Use short, natural sentences.'}
3. ${isVietnamese
    ? 'Subtitle: "subtitle" phải chứa câu tiếng Việt TRƯỚC, rồi "\\n", rồi bản dịch tiếng Anh (vd: "Hàng triệu người thức trắng đêm lướt điện thoại.\\nMillions of people lie awake every night, scrolling.").'
    : isBilingual
      ? 'Subtitle: "subtitle" must contain the English line FIRST, then "\\n", then a natural Vietnamese translation (e.g. "Millions of people lie awake every night, scrolling.\\nHàng triệu người thức trắng đêm lướt điện thoại.").'
      : 'Subtitle: English only.'}
4. Do NOT include emotion tags like [sighs], [softly], [pause] — they have no effect and just clutter the text.
5. ${buildPunctuationRhythmGuidance()}

═══════════════════════════════════════════════════════
RETURN FORMAT — raw JSON only, no markdown code fences
═══════════════════════════════════════════════════════

{
  "title": "Episode title",
  "segments": [
    {
      "segmentNumber": 1,
      "dialogueOrNarration": "Full narration line in third-person voiceover.",
      "subtitle": "${isVietnamese ? 'Câu tiếng Việt.\\nEnglish translation.' : isBilingual ? 'English line.\\nVietnamese translation.' : 'Caption text.'}",
      "durationSeconds": 5,
      "elements": [
        { "asset": "bg_tree",              "x": 80, "y": 65, "scale": 2.0,  "zIndex": 0, "flip": false, "delay": 0   },
        { "asset": "pose_standing_neutral", "x": 50, "y": 62, "scale": 1.0,  "zIndex": 2, "flip": false, "delay": 0.2 },
        { "asset": "sym_zzz",              "x": 73, "y": 28, "scale": 0.55, "zIndex": 4, "flip": false, "delay": 0.8 }
      ]
    }
  ],
  "thumbnail": {
    "visualDescription": "Detailed whiteboard-style stick-figure thumbnail scene — the most dramatic/emotional moment of the story, plain white background, high-contrast composition, suitable for a YouTube 16:9 thumbnail. No text in the image itself.",
    "headlineText": "CATCHY HOOK TEXT!"
  }
}
`;
}
