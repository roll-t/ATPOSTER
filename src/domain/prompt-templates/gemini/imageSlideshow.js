/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản phân cảnh cho dòng
 * "Video Slide Người Que PNG" — dùng thư viện ảnh PNG sẵn có thay vì sinh ảnh AI.
 * Gemini chọn asset ID + toạ độ (x,y) cho từng slide; Remotion ghép chúng thành cảnh.
 */
import { buildPunctuationRhythmGuidance } from './narrationPacing.js';
import { buildHumanVoiceGuidance } from './humanVoice.js';

const STICK_FIGURE_SLIDE_TIERS = {
  'under_1m': { slides: '8 đến 12',  seconds: '4 đến 6 giây' },
  '1_2m':     { slides: '14 đến 20', seconds: '5 đến 7 giây' },
  '2_3m':     { slides: '20 đến 28', seconds: '5 đến 8 giây' },
  '3_4m':     { slides: '28 đến 36', seconds: '6 đến 8 giây' },
  '4_6m':     { slides: '36 đến 48', seconds: '6 đến 9 giây' },
  '6_8m':     { slides: '48 đến 65', seconds: '6 đến 9 giây' },
  '8_10m':    { slides: '60 đến 82', seconds: '7 đến 10 giây' },
};

function buildMackStickFigureStorytellingGuidance({ isVietnamese, topic, G }) {
  if (isVietnamese) {
    return `═══════════════════════════════════════════════════════
CÔNG THỨC KỂ CHUYỆN & HOOK PHONG CÁCH "MACK / WHITEBOARD EXPLAINER" (BẮT BUỘC)
═══════════════════════════════════════════════════════
Video này đi theo đúng phong cách phim tài liệu hoạt hình người que nổi tiếng của kênh Mack (như video "How Did Ancient Humans Survive Freezing Winters?"):
Người dẫn chuyện ngôi thứ ba hóm hỉnh, cuốn hút, thông minh dẫn dắt khán giả qua một vụ án điều tra khoa học / bí ẩn lịch sử / thử thách sinh tồn kỳ thú hoặc nghịch lý tâm lý đời thường, trong khi nhân vật người que đóng vai diễn xuất trực quan trên nền bảng trắng (whiteboard).

1. HOOK 15 GIÂY ĐẦU (SLIDE 1 ĐẾN 3) — CÔNG THỨC "CỖ MÁY THỜI GIAN & TƯƠNG PHẢN THỜI HIỆN ĐẠI":
   TUYỆT ĐỐI KHÔNG mở bài kiểu văn nghị luận sách giáo khoa ("Kỷ băng hà là thời kỳ...", "Trì hoãn là một vấn đề...").
   Phải mở bài bằng 3 bước visual thought-experiment:

   • BƯỚC 1: TÌNH HUỐNG TƯỞNG TƯỢNG GIÀU GIÁC QUAN ("Hãy tưởng tượng..." / "Imagine...")
     Ném thẳng người xem vào một hoàn cảnh thực tế khốc liệt, trớ trêu hoặc kỳ lạ với chi tiết giác quan rõ mồn một. Cắt bỏ mọi tiện nghi hiện đại.
     - Về sinh tồn / cổ đại / khoa học:
       "Hãy tưởng tượng bạn bị ném về 40.000 năm trước giữa mùa đông kỷ băng hà. Gió tuyết -30 độ rít gào buốt đến tận xương. Không lò sưởi, không áo phao lông vũ, không app giao đồ ăn — chỉ có bạn và một đốm lửa sắp tắt."
     - Về thói quen / tâm lý đời sống:
       "Hãy tưởng tượng lúc 2 giờ sáng. Còn 6 tiếng nữa là thi, nhưng bạn lại đang thức trắng xem người tiền sử mài rìu đá săn voi ma mút. Vì sao não bộ bạn lại làm thế?"

   • BƯỚC 2: CÚ BẺ TƯƠNG PHẢN HÀI HƯỚC VỚI CON NGƯỜI HIỆN ĐẠI
     So sánh ngay hoàn cảnh sinh tử đó với sự "mong manh, buồn cười" của con người thời hiện đại:
     "Chúng ta ngày nay chỉ cần điện thoại tụt còn 5% pin hay phòng lạnh dưới 22 độ là đã than trời. Nếu thả một người hiện đại vào vùng băng tuyết đó, họ sẽ thành que kem hình người chỉ sau 45 phút."

   • BƯỚC 3: MỞ NÚT THẮNG NGHỊCH LÝ CỐT LÕI (OPEN LOOP)
     Đặt câu hỏi lớn khiến người xem không thể rời mắt:
     "Thế nhưng tổ tiên chúng ta — những sinh vật không móng vuốt, chẳng có lông thú dày — lại thống trị cả mùa đông băng giá suốt hàng vạn năm. Làm thế nào họ làm được điều không tưởng đó?"

2. ĐỘNG CƠ KỂ CHUYỆN: "ĐIỀU TRA PHÁ ÁN KHOA HỌC" THAY VÌ GIẢNG BÀI:
   Mỗi phân đoạn phải được kể như một manh mối điều tra vụ án, hé lộ từng mảnh ghép bất ngờ:

   • KỂ VỀ MANH MỐI BẤT NGỜ THAY VÌ KIẾN THỨC CHUNG CHUNG:
     Đừng chỉ nói "người xưa mặc quần áo ấm". Hãy kể câu chuyện CÁCH KHOA HỌC TÌM RA:
     "Quần áo da thú rục nát sau vài thế kỷ, vậy làm sao ta biết tổ tiên bắt đầu mặc đồ từ khi nào? Các nhà khoa học không tìm thấy áo... mà đi phân tích ADN của loài chấy rận! Chấy thân chỉ sống được trong thớ vải, và chúng tách khỏi chấy đầu đúng 100.000 năm trước."

   • CHỨNG CỨ SINH HỌC & GIẢI PHẪU THỰC TẾ:
     "Họ có đi giày không? Da giày không còn, nhưng xương ngón chân thì còn! Đi chân trần làm xương ngón chân to dày, đi giày cách nhiệt làm xương teo nhỏ. Hóa thạch 30.000 năm trước cho thấy ngón chân đã bắt đầu nhỏ lại — chứng minh họ đã có đôi giày tuyết đầu tiên!"

   • NHÂN CÁCH HÓA CÁC KHÁI NIỆM (GIVING PERSONALITY):
     Xem các yếu tố tự nhiên như một nhân vật sống động:
     "Lửa không đơn thuần là công cụ. Lửa là đứa trẻ háu ăn và khó tính nhất bộ tộc, bắt bạn phải canh giữ suốt ngày đêm. Nếu đốm lửa tắt giữa bão tuyết, cả bộ tộc sẽ chết."

   • ẨN DỤ HÀI HƯỚC BẰNG ĐỒ VẬT THỜI HIỆN ĐẠI:
     - Tủy và mỡ voi ma mút = thanh năng lượng calo siêu cấp.
     - Ống sừng rỗng chứa nấm mốc giữ than hồng = "cục sạc dự phòng" thời tiền sử.
     - Lều làm từ xương voi ma mút = "căn hộ duplex cao cấp kỷ băng hà".
     - Cả bộ tộc ôm nhau ngủ = "nhóm chat truyền nhiệt".

   • NHỊP DẪN DẮT LY KỲ:
     Dùng các câu chuyển tiếp lôi cuốn: "Và đây là lúc mọi chuyện trở nên điên rồ...", "Thế nhưng một thảm họa khác ập tới...", "Chìa khóa sinh tồn thực sự nằm ở chỗ không ai ngờ tới..."

3. KẾT THÚC Ý NGHĨA & LIÊN HỆ THỜI HIỆN ĐẠI (CLIMAX & TAKEAWAY):
   Không kết bài sáo rỗng. Kết bằng một liên tưởng sâu sắc nối liền quá khứ và hiện tại:
   "Lần tới khi bạn rùng mình vì một cơn gió lạnh hay cáu kỉnh vì đợi lò vi sóng 2 phút, hãy nhớ rằng: chảy trong huyết quản bạn là dòng máu của những kẻ đã đánh bại kỷ băng hà chỉ bằng một mẩu đá nhọn và một đốm lửa hồng."

4. BIÊN ĐẠO NHÂN VẬT NGƯỜI QUE TRỰC QUAN (WHITEBOARD ACTING):
   Gemini PHẢI chọn tư thế và đạo cụ khớp chuẩn từng nhịp cảm xúc:
   - Lạnh buốt, cùng cực: pose_sad_hugging_knees, pose_stressed, pose_exhausted (ở y=${G.ground}, anchor "bottom").
   - Lười biếng thời hiện đại: pose_phone_sitting cùng prop_phone, prop_coffee_cup.
   - Soi xét manh mối điều tra: pose_thinking, pose_reading, prop_notebook, prop_pencil, prop_hourglass.
   - Ngọn lửa & sinh tồn: sym_fire, pose_meditating, pose_happy_arms_up.
   - Kinh ngạc, cảnh báo nguy hiểm: pose_shocked, sym_warning, sym_exclamation, sym_lightning.
   - Chiến thắng, làm chủ thiên nhiên: pose_celebrating, sym_star, sym_trophy.`;
  }

  return `═══════════════════════════════════════════════════════
THE "MACK / WHITEBOARD EXPLAINER" STORYTELLING FORMULA (MANDATORY)
═══════════════════════════════════════════════════════
This video is built in the viral style of Mack / Kurzgesagt / MinutePhysics stick-figure documentaries (e.g. "How Did Ancient Humans Survive Freezing Winters?"):
A witty, charismatic, highly knowledgeable third-person narrator walks the audience through a gripping mystery, prehistoric survival triumph, scientific phenomenon, or psychology paradox, while a stick-figure acts out the drama on a whiteboard.

1. THE HOOK (FIRST 15 SECONDS — SLIDES 1 TO 3) — THE TIME-MACHINE & MODERN CONTRAST:
   DO NOT open with a dry textbook statement or generic lecture ("Ancient humans lived in the Ice Age...", "Procrastination is bad...").
   Follow the 3-Step Thought Experiment Hook:

   • STEP 1: SENSORY TIME-MACHINE SCENARIO ("Imagine...")
     Drop the viewer directly into a brutal, high-stakes, absurd, or tangible situation with sharp sensory details:
     - Survival / History / Science:
       "Imagine it's 40,000 years ago in northern Europe. The air hits your face like frozen needles at minus thirty degrees. No central heating, no goose-down jackets, no delivery apps — just you, a dying campfire, and a blizzard howling outside."
     - Psychology / Habits:
       "Imagine it's 2 AM. You have an exam in six hours, yet you're wide awake watching a twenty-minute documentary about how ancient humans hunted woolly mammoths. Why does your brain do this?"

   • STEP 2: RELATABLE MODERN CONTRAST & COMEDIC PUNCHLINE
     Immediately contrast that extreme struggle with modern human fragility:
     "Most of us today start panicking when our phone hits 5% battery or when the AC drops below 20 degrees. If you dropped an average modern human into that tundra, they'd turn into a human popsicle in about 45 minutes."

   • STEP 3: THE HIGH-STAKES OPEN LOOP / CENTRAL PARADOX
     Ask the big question that makes clicking away impossible:
     "Yet our ancestors — hairless, clawless tropical apes with stone knives — didn't just survive this frozen nightmare. They conquered the globe. How on earth did they pull it off?"

2. THE INVESTIGATIVE STORYTELLING ENGINE (BODY CHAPTERS):
   Treat each concept as a FORENSIC DETECTIVE INVESTIGATION solving progressive mysteries:

   • FORENSIC CLUES OVER TEXTBOOK FACTS:
     Don't just say "humans wore animal furs." Reveal the detective story of HOW SCIENTISTS DISCOVERED IT:
     "Animal hides rot in a few hundred years. So how do archaeologists know when clothes were invented? They didn't find frozen coats — they sequenced the DNA of body lice! Head lice and body lice split 100,000 years ago because body lice can only live in clothing."

   • ANATOMICAL & PHYSICAL EVIDENCE:
     "Did they have shoes? Leather shoes don't survive. But toe bones do! Walking barefoot builds thick toe bones; wearing insulated boots makes them slender. Fossil toes from 30,000 years ago showed modern delicate bones — Arctic boots were already in use!"

   • ANTHROPOMORPHISM (GIVING CONCEPTS PERSONALITY):
     "Fire wasn't just a heat source. Fire was the hungriest, most demanding baby in the tribe that required 24/7 care. If it died in a blizzard, the whole bloodline died with it."

   • RELATABLE MODERN ANALOGIES:
     - Mammoth bone marrow = prehistoric high-octane energy bars.
     - Fungus in a hollow horn = prehistoric thermos / power bank for embers.
     - Mammoth bone tent = Ice Age luxury duplex.
     - Sleeping huddled together = ancient human group chat for body heat.

   • SUSPENSE & MOMENTUM:
     Use punchy narrative bridges: "Here's where it gets crazy...", "And that led to an even deadlier problem...", "To solve this, they needed an evolutionary superpower..."

3. MEMORABLE CLIMAX & TAKEAWAY:
   End with a powerful, witty reflection bridging the ancient/scientific past to our modern lives:
   "So the next time you shiver from a draft or complain about a cold room, remember: running through your veins is the DNA of survivors who stared down Ice Age blizzards with nothing but a chipped stone and a glowing ember."

4. STICK FIGURE VISUAL CHOREOGRAPHY:
   Every narration beat must be physically acted out by the stick figure on the whiteboard:
   - Cold / misery / shivering: pose_sad_hugging_knees, pose_stressed, pose_exhausted (at y=${G.ground}, anchor "bottom").
   - Modern laziness / distraction: pose_phone_sitting with prop_phone, prop_coffee_cup, or pose_lying_phone.
   - Fire keeping / warmth: sym_fire floating near character, pose_meditating or pose_pointing_right.
   - Scientific clue / detective investigation: pose_thinking, pose_reading, prop_notebook, prop_pencil, prop_hourglass.
   - Shock / danger: pose_shocked, sym_warning, sym_exclamation, sym_lightning.
   - Triumph / survival / mastery: pose_celebrating, sym_star, sym_trophy, pose_happy_arms_up.`;
}

export function buildImageSlideshowScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isBilingual = true;
  const isVietnamese = (input.narrationLanguage || 'en') === 'vi';

  const tierConfig = STICK_FIGURE_SLIDE_TIERS[durationRange] || {
    slides: durationInfo.segmentsCount || '10 đến 14',
    seconds: '4 đến 7 giây',
  };
  const targetSlides = tierConfig.slides;
  const slideSecondsHint = tierConfig.seconds;

  // Hình học khung hình — phải tính sẵn rồi nhúng SỐ CỤ THỂ vào prompt. Để Gemini tự suy toạ độ
  // theo tỉ lệ thì nó đặt cảnh trí đè lên nhân vật (đúng lỗi đã gặp: nhân vật lọt trong toà nhà).
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

${buildMackStickFigureStorytellingGuidance({ isVietnamese, topic: input.scenario, G })}

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
  "title": "${isVietnamese ? 'Làm Sao Người Cổ Đại Sống Sót Qua Mùa Đông Kỷ Băng Hà?' : 'How Did Ancient Humans Survive Freezing Winters?'}",
  "segments": [
    {
      "segmentNumber": 1,
      "layout": "default",
      "dialogueOrNarration": "${isVietnamese ? 'Hãy tưởng tượng bạn bị ném về 40.000 năm trước giữa mùa đông Bắc Âu. Gió tuyết âm ba mươi độ rít gào, không lò sưởi, không chăn điện, chỉ có bạn và một đốm lửa sắp tàn.' : 'Imagine it is 40,000 years ago in northern Europe. The icy wind hits your face like glass at minus thirty degrees, with no central heating and no delivery apps.'}",
      "subtitle": "${isVietnamese ? 'Hãy tưởng tượng bạn bị ném về 40.000 năm trước giữa mùa đông Bắc Âu.\\nImagine it is 40,000 years ago in northern Europe during an Ice Age winter.' : isBilingual ? 'Imagine it is 40,000 years ago in northern Europe.\\nHãy tưởng tượng bạn ở Bắc Âu 40.000 năm trước giữa mùa đông kỷ băng hà.' : 'Imagine it is 40,000 years ago in northern Europe.'}",
      "durationSeconds": 6,
      "elements": [
        { "asset": "pose_sad_hugging_knees", "x": 50, "y": ${G.ground}, "scale": ${G.charScale}, "anchor": "bottom", "zIndex": 2, "flip": false, "delay": 0 },
        { "asset": "sym_lightning", "x": ${G.laneR}, "y": 20, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.4 }
      ]
    },
    {
      "segmentNumber": 2,
      "layout": "caption-left",
      "dialogueOrNarration": "${isVietnamese ? 'Con người hiện đại chúng ta phòng giảm xuống dưới hai mươi độ là đã kêu trời. Nếu bị thả vào đó, đa số sẽ thành que kem hình người chỉ sau bốn mươi phút.' : 'Most modern humans panic when the room drops below twenty degrees. Dropped into that tundra, an average person becomes a human popsicle in forty minutes.'}",
      "subtitle": "${isVietnamese ? 'Con người hiện đại chúng ta phòng giảm dưới 20 độ là đã kêu trời.\\nMost modern humans complain when the room drops below 20 degrees.' : isBilingual ? 'Most modern humans complain when the room drops below 20 degrees.\\nCon người hiện đại chúng ta phòng giảm dưới 20 độ là đã kêu trời.' : 'Most modern humans complain when the room drops below 20 degrees.'}",
      "durationSeconds": 6,
      "elements": [
        { "asset": "pose_phone_sitting", "x": ${G.laneR}, "y": ${G.ground}, "scale": ${G.charScale}, "anchor": "bottom", "zIndex": 2, "flip": true, "delay": 0 },
        { "asset": "prop_coffee_cup",   "x": ${G.laneL}, "y": ${G.ground}, "scale": 0.5, "anchor": "bottom", "zIndex": 3, "flip": false, "delay": 0.3 }
      ]
    },
    {
      "segmentNumber": 3,
      "layout": "default",
      "dialogueOrNarration": "${isVietnamese ? 'Vậy làm sao các nhà khảo cổ biết người xưa bắt đầu mặc quần áo từ khi nào? Họ không tìm thấy áo da thú... mà đã giải mã ADN của loài chấy rận!' : 'So how do archaeologists know when humans first wore clothes? They did not find ancient jackets... they sequenced the DNA of body lice!'}",
      "subtitle": "${isVietnamese ? 'Làm sao ta biết khi nào con người bắt đầu mặc quần áo?\\nHow do we know when humans first wore clothes?' : isBilingual ? 'How do we know when humans first wore clothes?\\nLàm sao ta biết khi nào con người bắt đầu mặc quần áo?' : 'How do we know when humans first wore clothes?'}",
      "durationSeconds": 6,
      "elements": [
        { "asset": "pose_thinking", "x": 50, "y": ${G.ground}, "scale": ${G.charScale}, "anchor": "bottom", "zIndex": 2, "flip": false, "delay": 0 },
        { "asset": "sym_thought_bubble", "x": ${G.laneR}, "y": 20, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.3 }
      ]
    },
    {
      "segmentNumber": 4,
      "layout": "bullets",
      "dialogueOrNarration": "${isVietnamese ? 'Để sinh tồn qua mùa đông băng giá, người cổ đại đã làm chủ ba vũ khí tiến hóa tối thượng.' : 'To survive the freezing winter, ancient humans mastered three evolutionary superpowers.'}",
      "subtitle": "${isVietnamese ? 'Ba vũ khí sinh tồn tối thượng của người cổ đại.\\nThree evolutionary superpowers of ancient humans.' : isBilingual ? 'Three evolutionary superpowers of ancient humans.\\nBa vũ khí sinh tồn tối thượng của người cổ đại.' : 'Three evolutionary superpowers of ancient humans.'}",
      "durationSeconds": 6,
      "bullets": [
        "${isVietnamese ? '**Một**, chế tạo kim may xương và quần áo may kín gió.' : '**First**, bone needles and windproof tailored clothing.'}",
        "${isVietnamese ? '**Hai**, xem lửa như thành viên sống của bộ tộc.' : '**Second**, treating fire as a living tribal member.'}",
        "${isVietnamese ? '**Ba**, nạp calo từ tủy và mỡ voi ma mút.' : '**Finally**, consuming dense calories from mammoth fat.'}"
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
