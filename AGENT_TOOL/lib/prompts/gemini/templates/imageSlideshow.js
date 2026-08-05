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

  // Hình học khung hình — phải tính sẵn rồi nhúng SỐ CỤ THỂ vào prompt. Để Gemini tự suy toạ độ
  // theo tỉ lệ thì nó đặt cảnh trí đè lên nhân vật (đúng lỗi đã gặp: nhân vật lọt trong toà nhà).
  //
  // Ràng buộc gốc: mỗi asset được vẽ trong một hộp VUÔNG cạnh = 32% CHIỀU CAO khung. Ảnh pose lại
  // ĐỤC HOÀN TOÀN (ô trắng có hình vẽ bên trong, đo được 100% pixel alpha>0) và nằm ở zIndex 2 —
  // trên cảnh trí zIndex 0 — nên bất cứ bg_* nào chạm vào hộp nhân vật đều bị ô trắng đó xoá mất.
  // Ngược lại prop_*/sym_* trong suốt thật (13–32% pixel đục) và vẽ ĐÈ LÊN nhân vật, nên đứng gần
  // vẫn an toàn.
  //
  // Hệ quả cho khung DỌC 9:16: hộp vuông tính theo chiều cao, mà khung chỉ rộng 1080px, nên riêng
  // nhân vật đã chiếm ~60% chiều ngang — không còn chỗ đặt cảnh trí hai bên. Vì vậy 9:16 chỉ dùng
  // nhân vật + vật thể trên trời/ký hiệu (đều trong suốt, nằm cao hơn hẳn đầu nhân vật).
  const isLandscape = (input.aspectRatio || '9:16') === '16:9';
  const G = isLandscape
    ? { frame: '16:9 landscape (1920×1080 px)', ground: 82, charScale: 1.35, charRange: '1.30 – 1.40',
        laneFarL: 8, laneL: 22, laneR: 78, laneFarR: 92, centerLo: 36, centerHi: 64,
        skyLo: 8, skyHi: 30, groundOK: true }
    : { frame: '9:16 portrait (1080×1920 px)', ground: 76, charScale: 1.05, charRange: '1.00 – 1.10',
        laneFarL: 12, laneL: 25, laneR: 75, laneFarR: 88, centerLo: 20, centerHi: 80,
        skyLo: 12, skyHi: 32, groundOK: false };

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

SCENERY — ⚠️ these are SMALL INDIVIDUAL OBJECTS, **NOT** full-frame backdrops.
"bg_building" is one single small building drawn off to the side, NOT a wall behind
the character. NEVER blow one up to fill the frame and NEVER put one behind the
character — that buries the character inside it and ruins the shot.

  GROUND scenery — stands ON the ground, always anchor "bottom" (zIndex 0):
    bg_tree  bg_bush_flower  bg_flower_sun  bg_hill_flowers  bg_plant_pot
    bg_house  bg_building  bg_school  bg_shop  bg_bench  bg_lamp_post
    bg_fence  bg_road  bg_city_skyline  bg_books_stack  bg_trophy_gold  bg_piggy_bank

  SKY items — float in the air, always anchor "center", high up (zIndex 1):
    bg_sun  bg_cloud  bg_rain_cloud  bg_rainbow  bg_moon_stars
    bg_balloon_heart  bg_kite  bg_airplane  bg_confetti  bg_sparkle

═══════════════════════════════════════════════════════
CANVAS LAYOUT — ${G.frame}
═══════════════════════════════════════════════════════

Every element is a square PNG placed by (x, y):

  x      — 0 = left edge, 100 = right edge, 50 = horizontal center
  y      — 0 = top edge, 100 = bottom edge
  anchor — "bottom" = y is the element's FEET/BASE  ← use for anything standing on the ground
           "center" = y is the element's MIDDLE     ← use for anything floating in the air
  scale  — size multiplier: 1.0 ≈ 32% of frame height
  zIndex — draw order: 0 (back) → 4 (front)
  flip   — true = mirror horizontally (makes the character face the other way)
  delay  — seconds before it fades in (0 = immediately)

───────────────────────────────────────────────────────
THE GROUND LINE — y = ${G.ground}
───────────────────────────────────────────────────────
The character, and every piece of GROUND scenery, MUST use:
    "y": ${G.ground},  "anchor": "bottom"
Sharing one y with anchor "bottom" makes them all stand on the same floor no matter
how different their scales are. Do not invent other ground values.

───────────────────────────────────────────────────────
WHY OVERLAP IS FATAL — read this before placing anything
───────────────────────────────────────────────────────
Every pose_* PNG is an OPAQUE WHITE TILE with the figure drawn inside it, and it is
painted ON TOP of scenery. So any bg_* that touches the character's tile gets wiped
out by that white — the classic failure is a building "swallowing" the character.
prop_* and sym_* are genuinely transparent AND are drawn above the character, so
those two may sit close without any damage.

  ⛔ bg_*  → must stay COMPLETELY CLEAR of the character.
  ✅ prop_*, sym_*  → safe near the character.

${G.groundOK ? `───────────────────────────────────────────────────────
THE FIVE LANES (16:9 is wide — use the sides)
───────────────────────────────────────────────────────
   x=${G.laneFarL}       x=${G.laneL}       x=50            x=${G.laneR}       x=${G.laneFarR}
  ┌────────┬────────┬──────────────┬────────┬────────┐
  │ far-L  │  left  │  🚫 CENTER   │ right  │ far-R  │
  │scenery │scenery │  CHARACTER   │scenery │scenery │
  │        │or prop │    ONLY      │or prop │        │
  └────────┴────────┴──────────────┴────────┴────────┘

  ⛔ x between ${G.centerLo} and ${G.centerHi} belongs to the character. No bg_* may go there.
  ⛔ At most ONE element per lane — two in one lane will collide.
  ⛔ Leave at least two lanes completely EMPTY. Generous white space IS the style;
     a crowded frame is a failed frame.` : `───────────────────────────────────────────────────────
9:16 IS NARROW — the character fills the middle
───────────────────────────────────────────────────────
At this aspect ratio the character's tile already spans x=${G.centerLo} to x=${G.centerHi} — about
60% of the width. There is NO usable room beside them.

  ⛔ DO NOT use any GROUND scenery (bg_tree, bg_house, bg_building, bg_bench, …)
     in 9:16. There is nowhere to put it that does not collide. Skip it entirely.
  ✅ Everything that is not the character goes ABOVE, in the sky zone, or is a
     prop/symbol drawn on top.

  ┌────────────────────────────┐
  │   SKY — y ${G.skyLo}–${G.skyHi}            │  ← sky items + symbols
  ├────────────────────────────┤
  │      🚫 CHARACTER ONLY     │  ← x ${G.centerLo}–${G.centerHi}
  └────────────────────────────┘`}

SKY ZONE — y between ${G.skyLo} and ${G.skyHi}, anchor "center"
  Sun, clouds, moon, kites and every sym_* live up here, well clear of the head.
  Put them at x=${G.laneL} or x=${G.laneR} — beside the head, never directly on it.

───────────────────────────────────────────────────────
SIZES — the character is always the biggest thing
───────────────────────────────────────────────────────
  pose_*        → scale ${G.charRange}   ← always x=50, the star of the frame${G.groundOK ? `
  bg_* ground   → scale 0.55 – 0.80  (a tree/house is a small side object, never huge)` : ''}
  bg_* sky      → scale 0.35 – 0.55
  prop_*        → scale 0.40 – 0.60
  sym_*         → scale 0.35 – 0.55

───────────────────────────────────────────────────────
COMPOSITION RULES — follow strictly
───────────────────────────────────────────────────────
  1. Exactly 1 pose_* per scene (except for layout: "bullets" which has no character), at y=${G.ground}, anchor "bottom", zIndex 2.
     • For standard focused layout, place the character in the center (x=50).
     • For asymmetrical/split-screen layouts (e.g. character interacting with an object/scenery), place the character on the side (x=${G.laneL} or x=${G.laneR}) and place the other object on the opposite side to balance the frame.
     • Pick the pose that best acts out what the narration says at that moment.
  2. Use "flip": true or false so the character faces the interacting prop or scenery (e.g. if character is at x=${G.laneL} and writing on a whiteboard at x=${G.laneR}, flip should be false so they face right).
  3. TOTAL ELEMENTS (if layout is not "bullets"): 1 to ${G.groundOK ? '4' : '3'}. Aim for an average near 2.
     • Roughly HALF of all scenes should be the character ALONE (1 element) for clean whiteboard focus.
     • Add a second element only when the narration names a concrete thing.
     • Only reach the maximum for a genuine climax moment.
  4. Never repeat the same pose in two consecutive scenes.
  5. Reveal order via delay: scenery 0 → character 0.15 → prop 0.4 → symbol 0.7.
  6. A prop the character USES (phone, laptop, coffee) goes at x=${G.laneR} or x=${G.laneL}, y=${G.ground}, anchor "bottom" — so it reads as sitting beside them on the floor rather than floating in mid-air.
  7. Pick the ONE symbol that carries the emotion of the line. Never stack symbols.
  8. Emit "anchor" on EVERY element. Omitting it defaults to "center", which makes ground objects float or sink instead of standing on the ground line.

───────────────────────────────────────────────────────
LAYOUT VARIATIONS (to break monotony & improve visual rhythm)
───────────────────────────────────────────────────────
For each segment, you can optionally set the "layout" field:
- "default": (Default) The character(s) and scenery are displayed, with a standard centered caption at the bottom.
- "caption-left": The character(s) and scenery are displayed, but the caption text is aligned to the bottom-left corner. Use this when the character is on the right side of the screen.
- "image-only": Hides the subtitle caption entirely. Use this for short visual-only reactions or pauses in narration.
- "bullets": A text-only list slide. Under this layout, the elements list should be empty/omitted, and you MUST specify a "bullets" field containing an array of 2 to 4 bullet points (e.g., ["First rule...", "Second rule..."]) which will reveal one by one. Highlight key words in bullets using double asterisks (e.g., "**First** rule").

───────────────────────────────────────────────────────
NARRATIVE & VISUAL COHESION
───────────────────────────────────────────────────────
1. Maintain environmental consistency: if consecutive scenes occur in the same location (e.g., at a desk, at school, outdoors), do not change the background scenery or props randomly. Keep them consistent or evolve them logically.
2. Pose transitions: Ensure character posture shifts follow a logical physical progression (e.g., pose_sleeping -> pose_stretching -> pose_standing_neutral).
3. Connecting words: Use time transitions like "First", "Then", "After that", "Next", "Finally" to make the voiceover flow like a story.

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
      "layout": "default",
      "dialogueOrNarration": "Full narration line in third-person voiceover.",
      "subtitle": "${isVietnamese ? 'Câu tiếng Việt.\\nEnglish translation.' : isBilingual ? 'English line.\\nVietnamese translation.' : 'Caption text.'}",
      "durationSeconds": 5,
      "elements": [
        { "asset": "pose_thinking", "x": 50, "y": ${G.ground}, "scale": ${G.charScale}, "anchor": "bottom", "zIndex": 2, "flip": false, "delay": 0 }
      ]
    },
    {
      "segmentNumber": 2,
      "layout": "caption-left",
      "dialogueOrNarration": "Narration that names one concrete thing, balanced layout.",
      "subtitle": "...",
      "durationSeconds": 5,
      "elements": [
        { "asset": "pose_phone_sitting", "x": 78, "y": ${G.ground}, "scale": ${G.charScale}, "anchor": "bottom", "zIndex": 2, "flip": true, "delay": 0    },
        { "asset": "prop_desk_lamp",     "x": 22, "y": ${G.ground}, "scale": 0.5, "anchor": "bottom", "zIndex": 3, "flip": false, "delay": 0.3 }
      ]
    },
    {
      "segmentNumber": 3,
      "layout": "bullets",
      "dialogueOrNarration": "Here are three simple rules for better habits.",
      "subtitle": "...",
      "durationSeconds": 6,
      "bullets": [
        "**First**, put your phone away.",
        "**Second**, sleep early.",
        "**Finally**, stay consistent."
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
