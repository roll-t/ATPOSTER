import { PROMPT_CATEGORIES } from './categories.js';
import { getStickFigureCastOverrides } from './castOverrides.js';
import { getBuddhistTheme } from './buddhistThemes.js';
import { getJapaneseHistoryTheme } from './japaneseHistoryThemes.js';
const CATEGORY_ENGLISH_LABELS = {
  english_quiz: 'English Quiz Video',
  stick_figure: 'Stick Figure Video',
  moral_wisdom: 'Moral Wisdom Video',
  english_tips: 'English Tips Video',
  stick_figure_slideshow: 'Stick Figure Slideshow Image',
  reading_practice: 'Reading Practice Page Image',
  moral_talk_slideshow: 'Moral Talk Pictogram Slideshow Image',
  buddhist_wisdom: 'Buddhist Wisdom Watercolour Slideshow'
};

// Câu chỉ định thứ KHÔNG có trong ảnh ("no people in frame", "without any modern objects") là
// thuốc độc với công cụ sinh ảnh: Google Flow chỉ nhận một prompt dương, không có kênh negative
// prompt, nên mọi danh từ nằm trong câu phủ định vẫn được vẽ ra — bảo "no people" là cách chắc
// chắn để có người trong ảnh.
//
// Prompt đã dặn Gemini đừng viết kiểu đó, nhưng đây là lớp chặn cuối: mô tả cảnh chạy thẳng vào
// prompt ảnh, lọt một câu là hỏng nguyên slide mà không có gì báo lỗi. Cắt theo CÂU để phần còn
// lại vẫn đọc trôi chảy.
const NEGATIVE_SENTENCE = /\b(?:no|not|without|nobody|none of|empty of|free of|devoid of|instead of)\b/i;

// Skill nào dùng chung khối dựng prompt ảnh tranh mực-màu nước này.
const JAPANESE_INK_CATEGORIES = ['buddhist_wisdom', 'japanese_history'];

/** Thế giới hình ảnh của skill: cùng nét vẽ, khác bối cảnh và nhân vật. */
function worldClauseFor(categoryKey) {
  return categoryKey === 'japanese_history' ? HISTORY_WORLD_CLAUSE : BUDDHIST_WORLD_CLAUSE;
}

/** Nhóm chủ đề đang chọn — mỗi skill có bộ chủ đề riêng nhưng cùng hình dạng dữ liệu. */
function narrativeThemeFor(categoryKey, input) {
  return categoryKey === 'japanese_history'
    ? getJapaneseHistoryTheme(input.historyTheme || 'japan_history')
    : getBuddhistTheme(input.buddhistTheme || 'zen_stories');
}

export function stripNegativeClauses(text) {
  const kept = String(text || '')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && !NEGATIVE_SENTENCE.test(sentence));
  return kept.join(' ').trim().replace(/\.\s*$/, '');
}


// Đổi các danh từ mặc-định-phương-Tây trong mô tả cảnh sang vật tương đương Đông Á.
//
// worldClause (xem nhánh buddhist_wisdom) ghim bối cảnh Đông Á vào mọi prompt, nhưng nó chỉ ĐỨNG
// CẠNH mô tả cảnh chứ không ghi đè được: slide viết "a stack of heavy books on the desk beside the
// window" thì model vẫn vẽ sách bìa da và cửa sổ kiểu Âu, vì đó là danh từ nằm ngay trong cảnh và
// đứng trước. Phải đổi chính danh từ đó.
//
// Quan trọng với các KỊCH BẢN CŨ: chúng được Gemini viết trước khi prompt kịch bản có mục "EVERY
// SCENE IS EAST ASIAN", nên visualDescription của chúng gần như chắc chắn dùng danh từ trung tính.
// Lớp này giúp chúng dùng lại được mà không phải sinh lại cả kịch bản.
//
// Danh sách cố ý NGẮN: chỉ những từ thật sự hay kéo ảnh về châu Âu. Mỗi mẫu tự nuốt luôn bản đã
// đổi rồi ("(?:thread-bound )?books?") để chạy hai lần không bị cộng dồn chuỗi.
const EASTERN_SUBSTITUTIONS = [
  { re: /\b(?:book\s?shel(?:f|ves)|book\s?cases?)\b/gi, one: 'wooden scroll rack', many: 'wooden scroll racks' },
  { re: /\b(?:thread-bound\s(?:rice-paper\s)?volume|book)s?\b/gi, one: 'thread-bound rice-paper volume', many: 'thread-bound rice-paper volumes' },
  { re: /\b(?:low\s)?(?:wooden\s)?(?:writing\s)?desks?\b/gi, one: 'low wooden writing table', many: 'low wooden writing tables' },
  { re: /\b(?:shoji\s)?(?:paper\s)?(?:sliding\s)?screens?\b/gi, one: 'shoji paper sliding screen', many: 'shoji paper sliding screens' },
  { re: /\b(?:arm)?chairs?\b/gi, one: 'floor cushion', many: 'floor cushions' },
  { re: /\b(?:tatami\s|wooden\s|plank\s)*floors?\b/gi, one: 'tatami floor', many: 'tatami floors' },
  { re: /\b(?:wooden\s)?(?:lattice\s)?windows?\b/gi, one: 'wooden lattice window', many: 'wooden lattice windows' },
  { re: /\b(?:stone\s|old\s)?cottages?\b/gi, one: 'small wooden hut', many: 'small wooden huts' },
];

export function easternizeScene(text) {
  let out = String(text || '');
  for (const { re, one, many } of EASTERN_SUBSTITUTIONS) {
    out = out.replace(re, (match) => {
      const replacement = match.trim().endsWith('s') ? many : one;
      // Giữ nguyên chữ hoa đầu câu, nếu không sẽ ra "...morning. thread-bound...".
      return /^[A-Z]/.test(match) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    });
  }
  return out;
}


// ─── Bộ câu dùng chung cho MỌI prompt ảnh của skill Phật giáo ───
//
// Nâng lên mức module vì có HAI nơi cần đúng bộ câu này: prompt của từng slide, và prompt hai
// ảnh bìa (16:9 + 9:16). Trước đây chúng là biến cục bộ trong nhánh segment, nên ảnh bìa hoặc
// phải chép lại y hệt — rồi sớm muộn cũng lệch nhau — hoặc ra một phong cách khác hẳn video.

// Bám theo ảnh mẫu người dùng đưa: nét mực mảnh vẽ tay hơi nguệch ngoạc, màu nước loang nhẹ ra
// ngoài nét, GIẤY TRẮNG SẠCH chừa nhiều khoảng trống, sáng và trong.
//
// PHONG CÁCH ĐÃ CHUYỂN SANG NHẬT. Bản trước ghi "pen-and-watercolour STORYBOOK illustration" —
// "storybook illustration" là dòng minh hoạ sách thiếu nhi PHƯƠNG TÂY, nên dù cảnh vật, y phục,
// đồ đạc đã Nhật hết (xem BUDDHIST_WORLD_CLAUSE) thì NÉT VẼ vẫn ra kiểu Âu. Giờ neo vào sumi-e
// và tranh minh hoạ Nhật hiện đại, thêm "yohaku" (mỹ học chừa khoảng trống) và bố cục lệch tâm.
//
// CỐ Ý KHÔNG dùng chữ "washi": giấy washi kéo model về màu ngà và thớ giấy thô, đúng thứ đã
// phải sửa một lần rồi (xem đoạn cấm giấy cũ ngay dưới). Giữ "smooth bright white paper".
//
// Bảng màu GIỮ NGUYÊN sắc độ người dùng đã chọn, chỉ đổi TÊN GỌI sang sắc truyền thống Nhật
// (yamabuki, indigo, moss) — thêm tín hiệu văn hoá mà không làm ảnh đổi tông.
//
// CHỈ VIẾT KHẲNG ĐỊNH, KHÔNG VIẾT "No ...". Google Flow nhận đúng MỘT prompt dương, không có
// kênh negative prompt riêng như Stable Diffusion. Mọi danh từ nhét vào câu phủ định đều được
// model đọc như một khái niệm cần vẽ. Bản trước ghi "No aged, brown, sepia parchment", "no
// glowing light source" — và ảnh trả về đúng là giấy cũ rách mép với đèn dầu phát sáng.
const JAPANESE_INK_STYLE_CLAUSE = 'Drawn as a Japanese ink-and-watercolour illustration, in the spirit of sumi-e and modern Japanese picture books: fine dark brush-and-ink linework, sketchy and light, over soft translucent watercolour washes that bleed a little past the lines. Painted on smooth bright white paper, with wide areas of the paper left bare — yohaku, the Japanese use of empty space. Muted palette of warm ochre and yamabuki yellow, indigo-tinted slate blue-grey, soft sienna and moss green. Asymmetric, off-centre composition in the Zen manner. Even bright daylight, airy and low in contrast, clean and fresh.';

// NEO VĂN HOÁ — thứ thiếu nó là ảnh ra "không có xíu nào Phật giáo".
//
// BUDDHIST_STYLE_CLAUSE chỉ tả CHẤT LIỆU (bút mực + màu nước + giấy trắng), không nói cảnh ở
// đâu, thời nào, người mặc gì. Gặp mô tả trung tính như "a scholar reading heavy books by a
// window", model vẽ theo cái phổ biến nhất trong dữ liệu huấn luyện: học giả châu Âu, sách bìa
// da gáy mạ vàng, cửa sổ kiểu Pháp. Đúng những gì đã nhận được ở lần chạy đầu.
// Thế giới hình ảnh của skill LỊCH SỬ. Cùng phong cách vẽ với Phật giáo (JAPANESE_INK_STYLE_CLAUSE
// ở trên), chỉ đổi bối cảnh và nhân vật — đúng yêu cầu.
const HISTORY_WORLD_CLAUSE = 'Set in old Japan, a world of castles and warriors: castle keeps above stone walls and moats, castle gates and guard towers, timber-post rooms with tatami floors and shoji paper screens, plastered walls with tiled coping, packed-dirt post roads through pine and bamboo, terraced rice fields, thatched village roofs. Every person is Japanese in period dress, samurai in dark lacquered armour with wide shoulder plates or in plain kimono with two swords at the waist, foot soldiers in simple conical helmets, lords in stiff wide-shouldered formal dress, travellers and shinobi disguised as farmers or pedlars in straw hats, villagers in wrapped kimono with cloth sashes, straw sandals, hair in topknots. Period objects throughout: long and short swords on wooden stands, helmets with wide neck-guards, banners with family crests, lacquered message boxes, rolled maps and letters, ink stones, bamboo brushes, clay tea bowls, wooden buckets.';

const BUDDHIST_WORLD_CLAUSE = 'Set in old Japan, a traditional Japanese Zen Buddhist world: tiled temple roofs with deep sweeping eaves, timber posts, shoji paper screens and wooden lattice, stone lanterns, raked gravel, pine and bamboo. Every person is Japanese in period dress, monks with shaved heads in faded ochre or grey robes, villagers in wrapped kimono with cloth sashes, hair in topknots or buns, straw sandals. Period objects throughout: thread-bound rice-paper volumes, rolled scrolls, ink stones, bamboo brushes, clay tea bowls, low writing tables, tatami mats.';

// Giữ lại đúng MỘT câu phủ định — chữ lọt vào ảnh là lỗi nặng nhất và không tả dương được.
const BUDDHIST_TEXT_RULE = 'No text or lettering anywhere in the image.';

/**
 * Hai prompt ẢNH BÌA cho một tập: 16:9 cho video dài, 9:16 cho video dọc.
 *
 * Gemini chỉ viết phần CHỦ THỂ (xem mục 8 trong buddhistWisdom.js); phần phong cách, neo văn hoá
 * và tỉ lệ khung được ghép ở đây — cùng thứ tự và cùng câu chữ với prompt của từng slide, để ảnh
 * bìa trông đúng là một khung hình của chính video đó chứ không phải một bức tranh lạ.
 *
 * Chạy qua cả stripNegativeClauses lẫn easternizeScene giống hệt slide: hai lớp lọc này đã cứu
 * đúng những lỗi hay gặp nhất (câu phủ định bị vẽ ra, danh từ mặc-định-phương-Tây), không có lý
 * do gì để ảnh bìa được miễn.
 */
export function buildBuddhistCoverPrompts(categoryKey, coverPrompts = {}) {
  const build = (raw, aspectRatio, composition) => {
    const subject = easternizeScene(stripNegativeClauses(raw));
    if (!subject) return null;
    return [
      `${subject}.`,
      composition,
      worldClauseFor(categoryKey),
      JAPANESE_INK_STYLE_CLAUSE,
      BUDDHIST_TEXT_RULE,
      `${aspectRatio} format. Full-bleed artwork: the illustration runs all the way to all four edges of the image.`,
    ].filter(Boolean).join(' ');
  };

  const landscape = build(
    coverPrompts.landscape,
    'Wide 16:9 landscape',
    'Thumbnail composition: the main subject sits to one side, the opposite side left open and quiet.',
  );
  const portrait = build(
    coverPrompts.portrait,
    'Tall 9:16 vertical',
    'Thumbnail composition: one close, centred subject filling the middle of the frame, open space above and below it, readable at a glance on a phone.',
  );

  if (!landscape && !portrait) return null;
  return { ...(landscape ? { landscape } : {}), ...(portrait ? { portrait } : {}) };
}

/**
 * Ghép style cố định của chủ đề với từng phân đoạn được sinh ra từ Gemini
 * để tạo ra danh sách prompt (Veo3 hoặc Midjourney/Flux) hoàn chỉnh cho từng phân đoạn.
 */
export function buildSegmentedPrompts(categoryKey, style, title, segments, input = {}) {
  const category = PROMPT_CATEGORIES[categoryKey];
  if (!category) {
    throw new Error('Chủ đề không hợp lệ.');
  }

  // --- Nếu là Slide Ảnh Người Que (PNG asset approach) ---
  if (categoryKey === 'stick_figure_slideshow') {
    return segments.map(seg => {
      const hasElements = Array.isArray(seg.elements) && seg.elements.length > 0;

      // Nếu segment có elements[] (PNG assets) thì KHÔNG cần sinh textPrompt / image generation.
      // Nếu không có elements (kịch bản cũ vẫn dùng visualDescription) thì giữ nguyên hành vi cũ.
      if (hasElements) {
        return {
          segmentNumber: seg.segmentNumber,
          durationSeconds: seg.durationSeconds || 5,
          dialogueOrNarration: seg.dialogueOrNarration,
          subtitle: seg.subtitle,
          elements: seg.elements,
          ...(seg.layout ? { layout: seg.layout } : {}),
        };
      }

      // --- Backward-compat: kịch bản cũ có visualDescription + imageGroup ---
      const imageStyle = {
        label: 'Người Que (Whiteboard)',
        visualStyle: 'Minimalist whiteboard-animation style, hand-drawn black ink stick figures on a plain white background.',
        background: "Plain white/cream background, no scenery, no props other than the character's own distinguishing accessory",
        colorPalette: ['#000000', '#FFFFFF', '#FE2C55 (single small accent only)']
      };
      const selectedAspectRatio = input.aspectRatio || '9:16';
      const paletteList = Array.isArray(imageStyle.colorPalette) ? imageStyle.colorPalette.join(', ') : String(imageStyle.colorPalette || '');
      const { selectedCharacters } = getStickFigureCastOverrides(input);
      const charactersDescription = selectedCharacters
        .map(c => `${c.name} (${c.en.personality}, distinguishing look: ${c.en.trait})`)
        .join(', and ');
      const sceneRenderNote = 'This is a single static story-illustration frame (NOT a character reference sheet) — depict the scene naturally exactly as described, with no labeled callouts, no arrows, no technical annotations, and no character name text anywhere in the image.';

      const jsonPrompt = {
        title: `${title} - Slide ${seg.segmentNumber}`,
        category: 'Image Slideshow Video',
        image_style: imageStyle.label,
        aspect_ratio: selectedAspectRatio,
        style: {
          visual_style: imageStyle.visualStyle,
          background: imageStyle.background,
          color_palette: imageStyle.colorPalette,
          render_note: sceneRenderNote
        },
        scene: { setting: seg.visualDescription, characters: charactersDescription || 'None' },
        audio: { dialogue_lines: [seg.dialogueOrNarration] },
        on_screen_captions: { subtitle: seg.subtitle }
      };

      const textPrompt = [
        `${imageStyle.visualStyle}.`,
        `Scene description: ${seg.visualDescription}.`,
        charactersDescription ? `Featuring characters: ${charactersDescription}.` : '',
        `Background setting: ${imageStyle.background}.`,
        `Color palette: ${paletteList}.`,
        `${sceneRenderNote}`,
        `Format: aspect ratio ${selectedAspectRatio}.`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        durationSeconds: seg.durationSeconds || 10,
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        ...(seg.layout ? { layout: seg.layout } : {}),
        ...(seg.splitSide ? { splitSide: seg.splitSide } : {}),
        ...(Array.isArray(seg.bullets) && seg.bullets.length > 0 ? { bullets: seg.bullets } : {}),
        ...(Number.isFinite(Number(seg.imageGroup)) ? { imageGroup: Number(seg.imageGroup) } : {}),
        ...(seg.revealLayout ? { revealLayout: seg.revealLayout } : {}),
        jsonPrompt,
        textPrompt
      };
    });
  }

  // --- Nếu là Video Nói Chuyện Đạo Lý (pictogram trắng phẳng, không glow, trên nền đen) ---
  // Nhánh RIÊNG, tách biệt hoàn toàn khỏi stick_figure_slideshow ở trên — không dùng chung
  // IMAGE_STYLES.stick_figure (đó là nét vẽ tay đen trên nền trắng), và KHÔNG có khái niệm
  // nhân vật cố định xuyên suốt — mỗi slide là 1 nhóm pictogram tượng trưng riêng cho khoảnh
  // khắc đang kể (đúng tinh thần bộ icon "Human Pictogram" tham chiếu).
  if (categoryKey === 'moral_talk_slideshow') {
    const selectedAspectRatio = input.aspectRatio || '9:16';
    const isLandscape = selectedAspectRatio === '16:9';
    const visualStyle = 'Minimalist flat white pictogram icon style on a solid pure black background. Simple flat white human-silhouette figures (no facial detail, no outline stroke, solid flat white fill, crisp sharp edges, NO glow, NO blur, NO bloom, NO light/halo effect of any kind), exactly like professional pictogram icon sets used in presentations. Include simple symbolic prop icons in the same flat white style when needed (question marks, exclamation marks, speech bubbles, hearts, arrows, luggage, flags) to reinforce the moment being narrated. No text, no color, no shading detail, no background scenery — pure black background with only the flat white silhouette figures and props, centered composition, generous negative space. SIZE LIMIT: the main figure/grouping (including any prop/icon floating above or beside it, e.g. a speech bubble or a lightbulb over the head) must occupy AT MOST about two-thirds (65%) of the frame\'s height and width combined — scale it down and leave real black margin on every side (top, bottom, left, right); never let the figure touch or nearly fill the frame edges.';
    const background = 'Solid pure black background, no scenery, no props other than simple flat white symbolic icons (no glow) that directly support the moment.';
    const colorPalette = ['#000000 (background)', '#FFFFFF (flat pictogram figures/icons, no glow)'];
    const paletteList = colorPalette.join(', ');
    const sceneRenderNote = 'This is a single static symbolic pictogram frame (NOT a character reference sheet, NOT a hand-drawn illustration) — depict only simple flat white silhouette figures/icons on solid black with crisp sharp edges and NO glow/blur/bloom/light effect of any kind, exactly like a professional pictogram icon set, with no labeled callouts, no arrows-as-annotations, no text of any kind anywhere in the image. Keep the figure SMALL relative to the frame — about two-thirds (65%) of the frame height/width at most, comfortably inset with visible black margin all around, not cropped or touching any edge.';

    // Chỉ dẫn bố cục cho khung 16:9 (video dài) được ghim THẲNG vào prompt ảnh cuối cùng, không chỉ
    // nằm trong prompt sinh kịch bản gửi Gemini (xem moralTalkSlideshow.js) — vì visualDescription
    // của các slide ĐÃ TỪNG được tạo trước khi có bản cập nhật này vẫn còn mỏng/đơn giản, và người
    // dùng có thể bấm "Copy Prompt Ảnh" hoặc "Đẩy sang Google Flow" lại cho các slide cũ đó bất cứ
    // lúc nào. Ghim ở đây đảm bảo MỌI lần lấy prompt ảnh (mới lẫn cũ) đều đủ giàu bố cục, không phụ
    // thuộc việc visualDescription cụ thể của slide có được viết chi tiết hay không.
    const landscapeCompositionNote = isLandscape
      ? 'IMPORTANT composition note for this WIDE 16:9 frame: do not render a single small figure floating alone in mostly-empty space — that looks thin and unfinished on a wide frame. Anchor the main pictogram figure/grouping to one side of the frame, and add a second symbolic element on the opposite side (a supporting figure, or a simple flat-white-outline environmental prop, no glow, in the exact same white monoline style, e.g. a doorway, bench, staircase, signpost, or horizon line) that relates directly to the scene, to fill the width with a balanced, narrative composition — while keeping the total look sparse (2-3 symbolic elements max) with generous negative space, never cluttered.'
      : '';

    return segments.map(seg => {
      const jsonPrompt = {
        title: `${title} - Slide ${seg.segmentNumber}`,
        category: 'Moral Talk Pictogram Slideshow',
        image_style: 'Flat White Pictogram (Black Background)',
        aspect_ratio: selectedAspectRatio,
        style: {
          visual_style: visualStyle,
          background,
          color_palette: colorPalette,
          render_note: sceneRenderNote,
          ...(landscapeCompositionNote ? { composition_note: landscapeCompositionNote } : {})
        },
        scene: {
          setting: seg.visualDescription
        },
        audio: {
          dialogue_lines: [seg.dialogueOrNarration]
        },
        on_screen_captions: {
          subtitle: seg.subtitle
        }
      };

      const textPrompt = [
        `${visualStyle}`,
        `Scene description: ${seg.visualDescription}.`,
        landscapeCompositionNote,
        `Background setting: ${background}`,
        `Color palette: ${paletteList}.`,
        `${sceneRenderNote}`,
        `Format: aspect ratio ${selectedAspectRatio}.`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        durationSeconds: 10,
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        jsonPrompt,
        textPrompt
      };
    });
  }

  // --- Nếu là Trang Đọc Luyện Tiếng Anh (graded reader, có ảnh Hero minh hoạ phía trên và trang đọc phía dưới) ---
  if (categoryKey === 'reading_practice') {
    // Luôn sinh đúng 1 ảnh hero, tỉ lệ ngang (16:9) - bất kể tỉ lệ khung hình chung của cả video
    // (input.aspectRatio, thường là 9:16) - vì ảnh hero chỉ chiếm 1 dải/nền phía trên trang đọc,
    // không phải toàn khung hình. Trước đây có thử sinh thêm 1 bản dọc thứ 2 (secondaryVariant)
    // để chọn theo bố cục, nhưng chất lượng bản thứ 2 không ổn nên bỏ, quay lại 1 ảnh duy nhất.
    const selectedAspectRatio = '16:9';
    const level = (input.level || 'a2').toUpperCase();

    const heroVisualStyle = 'Vibrant 2D digital anime webtoon vector illustration style, clean line art, warm soft lighting, expressive characters, rich atmospheric details, aesthetic 2D artwork (NO text, NO labels, NO typography in image).';
    const heroRenderNote = 'This is a top-banner hero illustration for a reading practice story video. It must visually summarize and capture the entire theme, mood, and main characters of the story in a single rich composite scene. It sits in the upper hero area of the page. Keep composition centered and aesthetically balanced.';

    return segments.map(seg => {
      const jsonPrompt = {
        title: `${title} - Hero Illustration`,
        category: 'Reading Practice Hero Illustration',
        level,
        aspect_ratio: selectedAspectRatio,
        style: {
          visual_style: heroVisualStyle,
          render_note: heroRenderNote
        },
        scene: {
          setting: seg.visualDescription
        },
        audio: {
          narration: seg.dialogueOrNarration
        },
        on_screen_captions: {
          subtitle: seg.subtitle
        }
      };

      const textPrompt = [
        `${heroVisualStyle}`,
        `Hero illustration scene expressing the main story theme: ${seg.visualDescription}.`,
        `${heroRenderNote}`,
        `Format: aspect ratio ${selectedAspectRatio}.`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        durationSeconds: Math.max(8, Math.round((seg.dialogueOrNarration || '').trim().split(/\s+/).filter(Boolean).length / 2.5)),
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        aspectRatio: selectedAspectRatio,
        jsonPrompt,
        textPrompt
      };
    });
  }

  // --- Chuyện Triết Lý & Thiền Phật Giáo (Tranh màu nước & mực cổ điển, 1 ảnh / 10s) ---
  //
  // THỨ TỰ TRONG textPrompt LÀ CÓ CHỦ Ý: mô tả cảnh đứng ĐẦU, phần phong cách đứng sau và chỉ nói
  // MỘT LẦN. Bản trước xếp ngược lại và ảnh sinh ra không bám nội dung — đo trên một prompt thật:
  // 1350 ký tự thì 84% là style boilerplate, cảnh thật chỉ 16% và mãi tới 39% chiều dài prompt mới
  // xuất hiện. Model sinh ảnh cân nội dung theo thứ tự + tỉ trọng, nên nó vẽ "tranh thiền chung
  // chung" thay vì đúng khoảnh khắc của đoạn đó.
  //
  // Cũng đã BỎ HẲN dòng "Background setting: ... ancient monastery stone walls, antique wooden
  // textures ...". Đó là chuỗi CỐ ĐỊNH gắn vào mọi slide, tức là tiêm thêm CHỦ THỂ lạ vào cảnh:
  // slide đang tả nhà sư cõng cô gái lội sông thì vẫn bị dặn thêm "tường đá tu viện, đồ gỗ cổ" —
  // ảnh ra thành tu viện chứ không phải dòng sông. Nền giờ chỉ còn nói về CHẤT LIỆU GIẤY, không
  // nói tới vật thể nào.
  //
  // Bỏ luôn danh sách mã màu hex: công cụ sinh ảnh đọc "#d97706" như rác, tên màu đã nằm trong
  // câu phong cách rồi.
  if (JAPANESE_INK_CATEGORIES.includes(categoryKey)) {
    // TỈ LỆ ẢNH LUÔN LÀ 16:9 NGANG cho skill này, không đi theo input.aspectRatio như các skill
    // khác — người dùng chốt cứng vậy. Nghĩa là nếu chọn dạng video dọc 9:16, ảnh vẫn ra ngang và
    // Remotion sẽ phải cắt/viền chúng khi dựng.
    const selectedAspectRatio = '16:9';
    // Câu phong cách bám theo ảnh mẫu người dùng đưa: bút mực mảnh vẽ tay hơi nguệch ngoạc, màu
    // nước loang nhẹ ra ngoài nét, GIẤY TRẮNG SẠCH chừa nhiều khoảng trống, sáng và trong.
    //
    // CHỈ VIẾT KHẲNG ĐỊNH, KHÔNG VIẾT "No ...". Google Flow nhận đúng MỘT prompt dương, không có
    // kênh negative prompt riêng như Stable Diffusion. Mọi danh từ mình nhét vào câu phủ định đều
    // được model đọc như một khái niệm cần vẽ. Bản trước ghi "No aged, brown, sepia or textured
    // parchment background", "no glowing light source", "No border, no frame, no vignette" — và
    // ảnh trả về đúng là giấy cũ rách mép, đèn dầu phát sáng, tranh nằm trong một khung giấy.
    // Muốn không có giấy cũ thì phải TẢ giấy trắng, không phải cấm giấy cũ.
    const styleClause = JAPANESE_INK_STYLE_CLAUSE;

    // Tỉ lệ + tràn viền tách thành câu riêng, ĐỨNG CUỐI và ngắn gọn để không bị chìm.
    //
    // Lưu ý: extension KHÔNG chỉnh ô tỉ lệ trong giao diện Google Flow (aspectRatio gửi sang chỉ
    // được ghi vào manifest, xem content-flow.js) — nên câu này là thứ DUY NHẤT tác động tới khung
    // hình. Người dùng vẫn nên đặt sẵn 16:9 trong chính Google Flow cho chắc.
    const formatClause = `Wide ${selectedAspectRatio} landscape format. Full-bleed artwork: the illustration runs all the way to all four edges of the image.`;

    // NEO VĂN HOÁ — đây chính là thứ thiếu khiến ảnh trả về "không có xíu nào Phật giáo".
    //
    // styleClause ở trên chỉ tả CHẤT LIỆU (bút mực + màu nước + giấy trắng). Nó không nói cảnh ở
    // đâu, thời nào, người mặc gì. Gặp một mô tả trung tính như "a scholar reading heavy books by a
    // window", model sinh ảnh vẽ theo cái phổ biến nhất trong dữ liệu huấn luyện: học giả châu Âu,
    // sách bìa da gáy mạ vàng, cửa sổ kiểu Pháp, giếng đá kiểu Ý. Đúng những gì đã nhận được.
    //
    // Câu này ghim bối cảnh Đông Á cổ vào MỌI prompt ảnh, kể cả các slide CŨ đã sinh từ trước rồi
    // được bấm "Copy Prompt Ảnh" / "Đẩy sang Google Flow" lại — không phụ thuộc vào việc
    // visualDescription của slide đó có nhớ nói "Chinese temple" hay không.
    //
    // Cố ý viết GỌN và đứng NGAY SAU cảnh, trước styleClause: model cân nội dung theo thứ tự, và
    // bài học ghi ở đầu khối này là boilerplate dài sẽ nhấn chìm mất cảnh thật.
    const worldClause = worldClauseFor(categoryKey);

    // Không khí riêng của nhóm chủ đề đang chọn (Chánh Niệm, Nhân Quả, Vô Thường...).
    //
    // CHỈ lấy trường `mood`, KHÔNG lấy `motifs`. motifs là danh sách CHỦ THỂ (bàn tay rửa bát,
    // chiếc thuyền trống, cánh hoa rơi) — dán một danh sách chủ thể cố định vào MỌI slide đúng là
    // lỗi đã được ghi ở đầu khối này: chuỗi "ancient monastery stone walls" gắn cứng từng làm
    // slide tả nhà sư lội sông biến thành ảnh tu viện. Vì vậy motifs chỉ được đưa vào prompt KỊCH
    // BẢN (buddhistWisdom.js), nơi Gemini cân nhắc theo từng phân đoạn; còn ở đây chỉ có `mood`,
    // một câu thuần không khí và ánh sáng, không chứa chủ thể nào để model vẽ nhầm.
    const themeObj = narrativeThemeFor(categoryKey, input);
    const moodClause = themeObj.mood ? `Mood: ${themeObj.mood}` : '';

    const textRule = BUDDHIST_TEXT_RULE;

    return segments.map(seg => {
      // Lọc câu phủ định (xem stripNegativeClauses) và bỏ dấu chấm cuối để câu nối phía sau
      // không thành ".." như bản cũ.
      const scene = easternizeScene(stripNegativeClauses(seg.visualDescription));

      const jsonPrompt = {
        title: `${title} - Slide ${seg.segmentNumber}`,
        category: categoryKey === 'japanese_history'
          ? 'Japanese History Watercolour Slideshow'
          : 'Buddhist Wisdom Watercolour Slideshow',
        image_style: 'Loose pen-and-watercolour storybook illustration on white paper',
        aspect_ratio: selectedAspectRatio,
        // scene đứng trước style, cùng lý do với textPrompt ở trên.
        scene: {
          setting: scene,
          world: worldClause,
          ...(moodClause ? { mood: themeObj.mood } : {})
        },
        style: {
          visual_style: styleClause,
          paper: 'Smooth bright white paper, left bare across large parts of the image.',
          format: formatClause,
          text: textRule
        },
        audio: {
          narration: seg.dialogueOrNarration
        },
        on_screen_captions: {
          subtitle: seg.subtitle
        }
      };

      const textPrompt = [
        `${scene}.`,
        worldClause,
        moodClause,
        styleClause,
        textRule,
        formatClause
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        // 1 ảnh giữ 5 giây — xem SECONDS_PER_IMAGE trong templates/buddhistWisdom.js.
        durationSeconds: seg.durationSeconds || 5,
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        aspectRatio: selectedAspectRatio,
        jsonPrompt,
        textPrompt
      };
    });
  }

  // --- Chế độ Video phân đoạn Veo3 cũ ---
  const paletteList = Array.isArray(style.colorPalette) ? style.colorPalette.join(', ') : String(style.colorPalette || '');

  let charactersDescription = style.characters;
  let voiceDescription = style.voice;
  if (categoryKey === 'stick_figure') {
    const { charactersOverride, voiceOverride } = getStickFigureCastOverrides(input);
    charactersDescription = charactersOverride || style.characters;
    voiceDescription = voiceOverride || style.voice;
  }

  let captionLabel = 'Bilingual subtitle';
  if (categoryKey === 'stick_figure') {
    captionLabel = "Speech bubble caption above the character's head (English only, no subtitle bar; appears instantly with a hard cut, no fade/slide animation, then cuts directly to the next line)";
  } else if (categoryKey === 'english_tips') {
    captionLabel = 'Bold on-screen keyword/bullet text on the whiteboard (English only, no subtitle bar; appears instantly with a hard cut, no fade/slide animation, then cuts directly to the next text)';
  }

  return segments.map(seg => {
    const safeDuration = Math.max(1, Math.min(10, Number(seg.durationSeconds) || 10));

    const jsonPrompt = {
      title: `${title} - Part ${seg.segmentNumber}`,
      series: style.series,
      category: CATEGORY_ENGLISH_LABELS[categoryKey] || category.label,
      aspect_ratio: style.aspectRatio,
      duration_seconds: safeDuration,

      style: {
        visual_style: style.visualStyle,
        color_palette: style.colorPalette,
        lighting: style.lighting,
        camera: style.camera,
        mood_tone: style.moodTone,
        typography_note: style.typographyNote
      },
      scene: {
        setting: seg.visualDescription,
        action_sequence: [seg.visualDescription],
        characters: charactersDescription
      },
      audio: {
        voice: voiceDescription,
        dialogue_lines: [seg.dialogueOrNarration],
        music: style.music,
        sfx: style.sfx
      },
      on_screen_captions: {
        note: `${captionLabel}: ${seg.subtitle}`
      },
      brand_consistency_notes: `Segment ${seg.segmentNumber} of a multi-part video in "${style.series}". Keep character models and scene backgrounds consistent.`
    };

    const textPrompt = [
      `${style.visualStyle}. ${style.moodTone}.`,
      `Scene detail: ${seg.visualDescription}.`,
      `Characters/Objects: ${charactersDescription}.`,
      `Camera: ${style.camera}. Lighting: ${style.lighting}.`,
      `Dialogue/Audio: ${seg.dialogueOrNarration}.`,
      `Voice: ${voiceDescription}.`,
      `Music: ${style.music}. Sound effects: ${style.sfx}.`,
      `${captionLabel}: ${seg.subtitle}.`,
      `Format: vertical ${style.aspectRatio}, duration: ${safeDuration} seconds.`,
      `Consistency: Part ${seg.segmentNumber} of "${style.series}" series. Keep visual features, color palette (${paletteList}), and pacing consistent.`
    ].join(' ');

    return {
      segmentNumber: seg.segmentNumber,
      durationSeconds: safeDuration,
      visualDescription: seg.visualDescription,
      dialogueOrNarration: seg.dialogueOrNarration,
      subtitle: seg.subtitle,
      jsonPrompt,
      textPrompt
    };
  });
}
