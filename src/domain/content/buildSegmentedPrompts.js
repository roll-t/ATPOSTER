import { PROMPT_CATEGORIES } from './categories.js';
import { getStickFigureCastOverrides } from './castOverrides.js';
import { getBuddhistTheme } from './buddhistThemes.js';
import { getJapaneseHistoryTheme } from './japaneseHistoryThemes.js';
import { detectTimeEra } from './timeEraDetector.js';
const CATEGORY_ENGLISH_LABELS = {
  english_quiz: 'English Quiz Video',
  stick_figure: 'Stick Figure Video',
  moral_wisdom: 'Moral Wisdom Video',
  english_tips: 'English Tips Video',
  stick_figure_slideshow: 'Stick Figure Slideshow Image',
  article_news_stick_figure: 'Stick Figure News Slideshow Image',
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

// Từ khoá và mẫu regex nhận diện đề tài chiến tranh / chiến trận cho skill Lịch Sử Nhật Bản
const WAR_KEYWORDS_VI = /\b(?:chiến\s?tranh|chiến\s?trận|trận\s?chiến|chiến\s?dịch|chiến\s?trường|trận\s?đánh|đánh\s?trận|giao\s?tranh|chiến\s?đấu|huyết\s?chiến|binh\s?biến|nội\s?chiến|vây\s?hãm|công\s?thành|đại\s?chiến|khói\s?lửa|tướng\s?quân|võ\s?tướng|kỵ\s?binh|bộ\s?binh|binh\s?sĩ|binh\s?lính|quân\s?đoàn|đoàn\s?quân|quân\s?sự|súng\s?hoả\s?mai|cung\s?thủ|chiến\s?hạm|tử\s?chiến|tổng\s?công\s?kích|xuất\s?trận|chém\s?giết|chinh\s?phạt|xâm\s?lược|xâm\s?lăng|nguyên\s?mông|dẹp\s?loạn)\b|trận\s+[A-ZÀ-Ỹ]|loạn\s+[A-ZÀ-Ỹ]/i;
const WAR_KEYWORDS_JA = /(?:戦|合戦|乱|戦争|激突|出陣|進軍|包囲|攻城|討ち入り|武者|騎馬|鉄砲隊|弓兵|軍勢|大軍|関ヶ原|川中島|桶狭間|長篠|大坂の陣|壇ノ浦|一ノ谷|元寇|応仁の乱|島原の乱|戊辰戦争|西南戦争|本能寺|決戦|討伐)/;
const WAR_KEYWORDS_EN = /\b(?:war|wars|battle|battles|battlefield|combat|clash|clashes|siege|sieges|invasions?|incursions?|rebellion|campaign|conflict|army|armies|cavalry|samurai war|sengoku|warlord|warlords|conquest|assault|raid|warfare|warrior|infantry|troops|onslaught|mongol|mongols|sekigahara|kawanakajima|okehazama|nagashino|dannoura|genpei|boshin|tatakai)\b/i;

export function isJapaneseHistoryWarTopic(input = {}, textContext = '') {
  // 1. Nếu người dùng chọn tường minh qua visualTone
  if (input.visualTone === 'epic_war') return true;
  if (input.visualTone === 'calm_zen') return false;

  // 2. Nhóm chủ đề luôn là chiến tranh
  const theme = input.historyTheme || '';
  if (theme === 'sengoku_events') return true;

  // 3. Gom mọi văn bản ngữ cảnh (scenario, script, title, topic, prompt, description, textContext...)
  const combined = [
    input.scenario,
    input.script,
    input.title,
    input.topic,
    input.prompt,
    input.description,
    textContext
  ].filter(Boolean).join(' ');

  if (!combined) {
    if (theme === 'samurai_era') return true;
    return false;
  }

  return WAR_KEYWORDS_VI.test(combined) || WAR_KEYWORDS_JA.test(combined) || WAR_KEYWORDS_EN.test(combined);
}

/** Thế giới hình ảnh của skill: cùng nét vẽ, khác bối cảnh và nhân vật. */
function worldClauseFor(categoryKey, input = {}, textContext = '') {
  if (categoryKey === 'japanese_history') {
    return isJapaneseHistoryWarTopic(input, textContext)
      ? HISTORY_WAR_WORLD_CLAUSE
      : HISTORY_PEACEFUL_WORLD_CLAUSE;
  }
  return BUDDHIST_WORLD_CLAUSE;
}

function styleClauseFor(categoryKey, input = {}, textContext = '') {
  return JAPANESE_INK_STYLE_CLAUSE;
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


// ─── Bộ câu dùng chung cho MỌI prompt ảnh của skill Phật giáo & Lịch sử Nhật Bản ───

// Phong cách tranh mực và màu nước truyền thống cho skill Phật giáo & Lịch sử Nhật Bản (chuẩn phong cách sumi-e pen-and-watercolour trên giấy trắng)
const JAPANESE_INK_STYLE_CLAUSE = 'Drawn as a Japanese ink-and-watercolour illustration, in the spirit of sumi-e and modern Japanese picture books: fine dark brush-and-ink linework, sketchy and light, over soft translucent watercolour washes that bleed a little past the lines. Painted on smooth bright white paper, with wide areas of the paper left bare — yohaku, the Japanese use of empty space. Muted palette of warm ochre and yamabuki yellow, indigo-tinted slate blue-grey, soft sienna and moss green. Asymmetric, off-centre composition in the Zen manner. Even bright daylight, airy and low in contrast, clean and fresh.';

// Thế giới CHIẾN TRẬN cho Lịch Sử Nhật Bản (loại bỏ nhà tranh, ruộng lúa chill chill; tập trung vào quân sự, võ tướng, sa trường trong ánh sáng ban ngày)
const HISTORY_WAR_WORLD_CLAUSE = 'Set in feudal Japan during historical warfare and military campaigns: grand castle fortifications, battle plains, fortified watchtowers, war camps (jinmaku) with clan crest banners (nobori) fluttering in the wind, barricades of wooden stakes (umadome), and marching army columns. Armored warriors in authentic battle gear: samurai commanders in elaborate kabuto helmets and lacquered yoroi armor with clan crests, ranks of foot soldiers (ashigaru) with long yari spears, matchlock gunners, mounted cavalry with swords, and archers. Historical battlefield atmosphere: fluttering battle standards, drum towers, war fans (gunbai), drifting morning mist, and martial presence in open daylight.';

// Thế giới TRANG NGHIÊM LỊCH SỬ cho Lịch Sử Nhật Bản đề tài hoà bình (triều đình, thương gia, học giả)
const HISTORY_PEACEFUL_WORLD_CLAUSE = 'Set in old Japan, a traditional historical world: noble estates and castle keeps, timber-post chambers with fine tatami mats, painted shoji screens and cedar verandas, stone garden pathways, post roads through pine groves, traditional merchant streets with tiled eaves. Every person is Japanese in authentic period attire: noble lords and ladies in layered silk robes, samurai retainers in formal kamishimo with two swords, scholars and travellers in straw hats, tea masters and merchants. Period objects: thread-bound manuscripts, rolled calligraphy scrolls, lacquered tea utensils, ink stones, bamboo brushes, low writing tables, ceramic tea bowls.';

// Giữ lại HISTORY_WORLD_CLAUSE trỏ tới HISTORY_WAR_WORLD_CLAUSE làm mặc định
const HISTORY_WORLD_CLAUSE = HISTORY_WAR_WORLD_CLAUSE;

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
/**
 * Sắc chữ của DÒNG CHỐT dưới đáy — mỗi skill một màu, chung một bố cục.
 *
 * Lịch sử lấy đỏ máu đúng như ảnh mẫu người dùng đưa (thumbnail lịch sử Nhật dùng sắc này gần như
 * mặc định). Phật giáo giữ vàng yamabuki: vẫn là chữ áp phích to đậm, nhưng không biến một video
 * podcast nhẹ nhàng thành cái thumbnail giật gân.
 */
function accentColourFor(categoryKey) {
  return categoryKey === 'japanese_history'
    ? 'deep blood red, glowing slightly, each stroke edged with a thin dark outline'
    : 'warm golden yamabuki yellow, each stroke edged with a thin dark outline';
}

/**
 * Khối chỉ dẫn VẼ CHỮ lên ảnh bìa — BỐ CỤC ÁP PHÍCH HAI DẢI ĐEN.
 *
 * Ngược hẳn với slide thường: slide giữ nguyên BUDDHIST_TEXT_RULE ("không có chữ nào trong ảnh") vì
 * chữ lọt vào giữa tranh là lỗi nặng. Ảnh bìa thì cần chữ — nó là thumbnail, người lướt phải hiểu
 * được tập nói gì trước khi bấm vào.
 *
 * BẢN TRƯỚC viết chữ bằng bút lông sumi mực đen, dựng dọc mép trái (16:9) hoặc ngang đỉnh khung
 * (9:16), đặt thẳng lên nền giấy trắng. Đẹp như một bức tranh, nhưng THUA khi thu nhỏ thành ô
 * thumbnail: nét bút mảnh, mực đen trên giấy trắng gần như biến mất, và chữ dọc thì mắt phải dừng
 * lại mới đọc được — đúng thứ người lướt không bao giờ làm.
 *
 * Giờ bám theo ảnh mẫu người dùng đưa (thumbnail lịch sử Nhật):
 *   - Một DẢI ĐEN đặc chạy hết bề ngang ở ĐỈNH khung, trong đó là DÒNG DẪN màu trắng — câu đặt
 *     bối cảnh, gợi tò mò ("chỉ 11 ngày sau biến Honnō-ji").
 *   - Một DẢI ĐEN thứ hai ở ĐÁY khung, trong đó là DÒNG CHỐT — chữ to nhất ảnh, màu nhấn, là câu
 *     trả lời cho dòng trên ("kết cục của gia tộc Akechi").
 *   - Cả hai dòng đều NGANG, chữ gothic khối dày, kéo gần hết bề ngang dải.
 *
 * Ba điều rút ra từ chỗ công cụ sinh ảnh hay hỏng nhất khi phải viết chữ Nhật vẫn giữ nguyên:
 *   1. Nói RÕ TỪNG CHỮ phải vẽ, đặt trong 「」 — đừng để model tự nghĩ ra chữ.
 *   2. Ghim chữ vào ĐÚNG một mảng đã định sẵn — ở đây là hai dải đen đặc, nên chữ không còn cơ hội
 *      đè lên mặt nhân vật như hồi đặt thẳng lên tranh.
 *   3. Càng ít chữ càng đúng nét — vì vậy prompt kịch bản giới hạn dòng chốt 4-8 ký tự.
 *
 * Kịch bản CŨ không có ba khoá này thì rơi về đúng hành vi trước đây: ảnh bìa không chữ.
 */
function coverLetteringClause({ headline, sub, kicker }, isLandscape, accentColour) {
  if (!headline) return BUDDHIST_TEXT_RULE;

  // Dải chiếm bao nhiêu chiều cao phụ thuộc khung: cùng một số ký tự kéo hết bề ngang thì khung
  // 16:9 rộng nên chữ thấp, khung 9:16 hẹp nên chữ cao gấp đôi theo tỉ lệ.
  const topBand = isLandscape ? 'the top fifth' : 'the top eighth';
  const bottomBand = isLandscape ? 'the bottom quarter' : 'the bottom sixth';

  const parts = [
    'Finished as a Japanese YouTube thumbnail poster, with the painting full-bleed behind two solid black horizontal bands.',
  ];

  if (sub) {
    parts.push(`A solid black band runs edge to edge across ${topBand} of the frame. Inside it, centred, one horizontal line of very large heavy white Japanese gothic poster lettering, thick blocky even strokes, tightly spaced, stretched almost the full width of the band, reading exactly: 「${sub}」.`);
  }

  parts.push(`A second solid black band runs edge to edge across ${bottomBand} of the frame. Inside it, centred, one horizontal line of enormous heavy Japanese gothic poster lettering in ${accentColour}, thick blocky even strokes, the biggest lettering in the whole image, stretched almost the full width of the band, reading exactly: 「${headline}」.`);

  if (kicker) {
    parts.push(`Just below the upper band, tucked into the left corner of the painting, one short horizontal line of small plain white characters, reading exactly: 「${kicker}」.`);
  }

  parts.push('All lettering is horizontal, upright and level, printed type rather than brushwork, sharp against the flat black bands. These lines are the whole of the lettering in the picture.');
  return parts.join(' ');
}

export function buildBuddhistCoverPrompts(categoryKey, coverPrompts = {}, input = {}) {
  const accentColour = accentColourFor(categoryKey);
  const textContext = [coverPrompts.headline, coverPrompts.sub, coverPrompts.landscape, coverPrompts.portrait].filter(Boolean).join(' ');
  const worldClause = worldClauseFor(categoryKey, input, textContext);
  const styleClause = styleClauseFor(categoryKey, input, textContext);

  const build = (raw, aspectRatio, composition, isLandscape) => {
    const subject = easternizeScene(stripNegativeClauses(raw));
    if (!subject) return null;
    return [
      `${subject}.`,
      composition,
      worldClause,
      styleClause,
      coverLetteringClause(coverPrompts, isLandscape, accentColour),
      `${aspectRatio} format. Full-bleed artwork: the illustration runs all the way to all four edges of the image.`,
    ].filter(Boolean).join(' ');
  };

  const landscape = build(
    coverPrompts.landscape,
    'Wide 16:9 landscape',
    // Chữ đã dời lên hai DẢI ĐEN ở đỉnh và đáy khung, nên chỗ trống cần chừa cũng dời theo: không
    // còn khoảng trắng bên trái cho hàng chữ dọc nữa, mà là hai mép trên/dưới sẽ bị dải đen phủ.
    // Chủ thể vì thế phải nằm gọn ở KHOẢNG GIỮA, nếu không dải đen cắt mất đầu nhân vật.
    'Thumbnail composition: the main subject sits large across the middle of the frame, centred or a little right of centre, its head and face well inside the middle band of the picture, and the strip along the very top edge and the strip along the very bottom edge stay quiet and simple.',
    true,
  );
  const portrait = build(
    coverPrompts.portrait,
    'Tall 9:16 vertical',
    'Thumbnail composition: one close, centred subject filling the middle of the frame, readable at a glance on a phone, its head and face well inside the middle band of the picture, and the strip along the very top edge and the strip along the very bottom edge stay quiet and simple.',
    false,
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

  // --- Slide người que: nét vẽ tay 2D tối giản, nền giấy sáng, rất ít màu và chi tiết. ---
  if (categoryKey === 'stick_figure_slideshow' || categoryKey === 'article_news_stick_figure') {
    const selectedAspectRatio = input.aspectRatio === '16:9' ? '16:9' : '9:16';
    const isLandscape = selectedAspectRatio === '16:9';

    // Nhận diện mốc thời gian / kỷ nguyên của video (Time Era Pinning)
    const fullNarrationCorpus = segments.map(s => `${s.dialogueOrNarration || ''} ${s.visualDescription || ''}`).join(' ');
    const detectedEra = detectTimeEra({
      explicitEra: input.timeEra,
      title: title || '',
      scenario: input.scenario || '',
      fullText: fullNarrationCorpus
    });

    return segments.map(seg => {
      const rawDesc = seg.visualDescription || seg.dialogueOrNarration || seg.subtitle || `Scene illustration for slide ${seg.segmentNumber}`;
      // Làm sạch mô tả: bỏ thẻ emotion, bỏ ngoặc kép (tránh AI hiểu nhầm chuỗi trong ngoặc kép là text cần in lên ảnh)
      const cleanDesc = String(rawDesc || '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/["“”'‘’]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Tự động phân loại cảnh:
      // 1. Cảnh có nhân vật người que tương tác (character scene) — CẤM TUYỆT ĐỐI Ở THỜI KỲ CHƯA CÓ LOÀI NGƯỜI
      // 2. Cận cảnh đồ vật / biểu tượng (object focus)
      // 3. Cảnh khoa học / địa chất / vũ trụ / mặt cắt / hiện tượng tự nhiên không có người (scientific / environmental focus)
      const hasExplicitNoChar = /(no character|no people|no human|no stick|without character|without people|không có người|thuần cảnh|pure scenery|pure environment|cutaway|cross-section)/i.test(cleanDesc);
      // English phải có ranh giới từ: regex cũ nhận "document" là nhân vật vì có chuỗi "men",
      // làm cảnh đồng hồ/tài liệu bị đẩy nhầm sang prompt có người que.
      const mentionsCharacter = /\b(?:stick figure|stickman|character|person|people|human|humans|man|men|woman|women|cavem[ae]n|neanderthals?|homo sapiens|hunter|hunters|scientist|scientists|explorer|explorers|student|students|worker|workers|boy|boys|girl|girls|kid|kids|child|children|elder|elders|villager|villagers|warrior|warriors|diver|divers|astronaut|astronauts|individual|individuals|figure|figures)\b/i.test(cleanDesc)
        || /(?:người que|nhân vật|con người|người|nhà khoa học|nhà thám hiểm|người tiền sử|thợ săn|thợ lặn|phi hành gia|cư dân|bộ lạc|thổ dân|đứa trẻ|trẻ em)/i.test(cleanDesc);
      const isCharacterScene = !detectedEra.isPreHuman && mentionsCharacter && !hasExplicitNoChar;

      const characterStyle = input.characterStyle || 'stick_figure';
      const isStickFigure = characterStyle !== 'regular_human';

      // Nếu là thời kỳ chưa có loài người (Tuyết cầu, Chicxulub khủng long, Lõi Trái Đất...), làm sạch mọi từ chỉ con người, trang phục, đền đài khỏi mô tả cảnh
      let sanitizedDesc = cleanDesc;
      if (detectedEra.isPreHuman) {
        sanitizedDesc = sanitizedDesc
          .replace(/\b(a\s+)?(cartoon\s+)?(stick\s*figure|stickman|person|people|human|man|woman|character|explorer|scientist|guy)\b(\s+(in\s+a\s+\w+\s+)?(shivering|running|standing|looking|kneeling|panicking|sweating|exploring|walking|sitting|scratching\s+head))?/gi, ' pristine untamed geological terrain ')
          .replace(/\b(ancient\s+)?(greek|roman|egyptian)?\s*(temple|colonnade|pillar|ruin|piazza|monument)s?\b/gi, ' natural rock and ice formation ')
          .replace(/\b(wearing|dressed in)\s+[^,.;]*/gi, '')
          .replace(/\b(tunic|toga|robe|cloak|hoodie|jeans|clothes|clothing|shoes|sandals|hat|cap)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
      } else if (isCharacterScene) {
        // Đồng bộ tuyệt đối kiểu nhân vật: nếu là stick_figure, chuyển mọi từ chỉ cavemen, early humans thành cartoon stick figure
        if (isStickFigure) {
          sanitizedDesc = sanitizedDesc
            .replace(/\b(two|three|several|a group of)?\s*(primitive\s+)?(cavem[ae]n|neanderthals?|homo sapiens|early humans?)\b/gi, (m) => `cartoon stick figure ${m.trim()}`)
            .replace(/\b(a\s+)?(hunter|scientist|explorer|diver|astronaut|student|worker|boy|girl|kid|child|villager|person|human|man|woman)\b/gi, 'a cartoon stick figure $2')
            .replace(/\b(people|humans)\b/gi, 'cartoon stick figures')
            .replace(/\bcartoon stick figure\s+cartoon stick figure\b/gi, 'cartoon stick figure')
            .replace(/\s+/g, ' ')
            .trim();
        } else {
          sanitizedDesc = sanitizedDesc
            .replace(/\b(a\s+)?(cartoon\s+)?(stick\s*figure|stickman)\b/gi, 'a stylized 2D cartoon human')
            .replace(/\b(cartoon\s+)?(stick\s*figures|stickmen)\b/gi, 'stylized 2D cartoon humans')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }

      // visualDescription cũ có thể đã được sinh bằng style Mack nhiều màu. Làm sạch các từ khóa
      // trang trí ở lớp cuối để project cũ khi tạo lại ảnh cũng chuyển được sang nét vẽ tối giản.
      if (isStickFigure) {
        sanitizedDesc = sanitizedDesc
          .replace(/\b(?:vibrant|cinematic|photorealistic|hyperrealistic|highly detailed|intricate|cel[- ]shaded|3d rendered?|cgi)\b/gi, '')
          .replace(/\b(?:glowing|luminous|shimmering|sparkling)\b/gi, 'simple')
          .replace(/\b(?:richly colored|rich colored|dramatic lighting|cinematic lighting|atmospheric depth|detailed textures?)\b/gi, '')
          .replace(/\s+/g, ' ')
          .replace(/\s+([,.;])/g, '$1')
          .trim();
      }

      const isObjectFocus = !isCharacterScene && /(ngọn lửa|đốm lửa|bản đồ|máy móc|máy tính|con chip|bộ não|đồng hồ|hóa thạch|công cụ|vũ khí|lửa trại|tài liệu|báo cáo|dấu chân|chiếc áo|ngôi sao|hành tinh|fire|campfire|flame|map|brain|clock|machine|computer|chip|fossil|tool|shoe|clothes|document|desk|report|microscope|telescope)/i.test(sanitizedDesc);

      const compositionGuide = isLandscape
        ? 'Bright borderless 16:9 horizontal composition: one clear central action, generous airy space, and only 2–4 large light pastel background bands/shapes. At most two distant soft-charcoal silhouette props.'
        : 'Bright borderless 9:16 vertical composition: one clear central action, generous airy space, and only 2–4 large light pastel background bands/shapes. At most two distant soft-charcoal silhouette props.';

      let visualStyle = '';
      let sceneDirective = '';
      let negativePrompt = '';

      const noBorderNegative = 'border, white border, frame, white frame, outer frame, picture frame, border lines, margin, white margin, white edge, borders, padding, matting, vignette, postcard, polaroid, sticker, white outline, card border, comic panel border, blank margin, framed, ';

      if (isCharacterScene) {
        if (isStickFigure) {
          visualStyle = 'Bright polished hand-drawn 2D web-explainer cartoon with clean confident soft-charcoal outlines and airy pastel flat color fills. Every character has a smooth blank ivory-white oval head with no facial features, balanced slim line arms and legs, clean joint connections, simple rounded hands and feet, a neat pastel torso or garment silhouette, and optional tidy hand-drawn hair. Attractive consistent proportions and natural expressive poses. Background uses only 2–4 large light pastel color bands or shapes. Shared high-key palette: light sky blue, sunny cream, fresh mint, peach/coral, light blue-grey and ivory, with one stronger coral/orange focal accent when essential. No shading, highlights, or dimensional rendering.';
          sceneDirective = `MANDATORY POLISHED CHARACTER STYLE — ALL PEOPLE USE THE SAME ATTRACTIVE FACELESS HAND-DRAWN 2D STICK-FIGURE DESIGN: smooth symmetrical ivory-white oval head with absolutely no eyes, nose, mouth, eyebrows, or facial details; balanced slim soft-charcoal line limbs; clean connected joints; simple rounded hands and feet; neat pastel body/clothing silhouette; optional tidy intentional hair strokes. Keep head-to-body scale, limb length, line weight, and silhouette consistent across every character. Use natural readable posture and gesture. Show one action with at most three figures and two essential props. Visual depiction of ${sanitizedDesc}. Reduce the setting to 2–4 broad LIGHT pastel background shapes and at most two distant soft-charcoal silhouettes. Static textless drawing.`;
          negativePrompt = `--no ${noBorderNegative}text, words, letters, font, typography, subtitles, captions, speech bubble, thought bubble, writing, watermark, labels, eyes, nose, mouth, eyebrows, facial expression, detailed face, realistic human, realistic anatomy, malformed body, uneven head, tangled limbs, disconnected joints, extra arms, extra legs, extra hands, extra feet, crude drawing, messy scribbles, dark muddy palette, underexposed, neon colors, anime, 3d, cgi, photorealism, gradient, glow, bloom, shadows, highlights, dramatic lighting, cinematic lighting, volumetric lighting, cel shading, detailed scenery, detailed texture, atmospheric depth, ornate clothes, clutter, blurry`;
        } else {
          visualStyle = 'Mack-style 2D animated documentary cartoon illustration, expressive hand-drawn graphic art with bold clean black ink line work and warm stylized flat color fills. Rich storytelling environment with colored background scenery, textured ground, props, and warm earthy cartoon color palette. Clean 2D cel-shaded animation illustration with stylized cartoon human proportions, borderless full-bleed composition.';
          sceneDirective = `MANDATORY UNIFIED CHARACTER STYLE — 100% STYLIZED 2D CARTOON HUMAN THROUGHOUT ENTIRE VIDEO: All characters, cavemen, hunters, and scientists in every single scene MUST strictly be rendered as stylized 2D cartoon humans with stylized animated features and cartoon human proportions. STRICTLY ZERO stick figures, ZERO stickman wire bodies. Visual depiction of ${sanitizedDesc}. Single static story illustration, borderless edge-to-edge full-bleed artwork extending to all borders with no arrows, no speech bubbles, and absolutely zero text labels.`;
          negativePrompt = `--no ${noBorderNegative}text, words, letters, font, typography, script, calligraphy, subtitles, captions, speech bubble, thought bubble, dialogue box, yellow banner, top banner, caption bar, title bar, headline, writing, watermark, signature, labels, callouts, text overlay, meme caption, stick figure, stickman, stick body, wire limbs, minimalist ball head, meme face, 3d render, cgi, photorealistic, plain blank white void background, airbrushed shading, gradient clip art, blurry`;
        }
      } else if (isObjectFocus) {
        visualStyle = isStickFigure
          ? 'Bright polished hand-drawn 2D explainer-cartoon object illustration, clean soft-charcoal outlines, basic geometric shapes, 5–7 airy pastel flat colors, and only 2–3 large light background color bands. Flat and unshaded.'
          : 'Mack-style 2D animated documentary cartoon illustration, expressive hand-drawn graphic art with bold clean black ink line work and warm stylized flat color fills. Rich storytelling environment with colored scenery, textured surfaces, props, and warm earthy cartoon color palette. Clean 2D cel-shaded animation illustration with stylized cartoon charm.';
        sceneDirective = isStickFigure
          ? `Draw only the essential object or concept from ${sanitizedDesc}, simplified into one clean outlined shape with at most one supporting prop. Use bright airy pastel flat fills and only 2–3 broad LIGHT background color shapes. No characters and absolutely zero text.`
          : `Vibrant symbolic prop or conceptual close-up: visual depiction of ${sanitizedDesc} in bold stylized 2D cartoon illustration with warm colors and bold ink outlines. No characters and absolutely zero text labels.`;
        negativePrompt = `--no ${noBorderNegative}text, words, letters, typography, subtitles, captions, speech bubble, writing, watermark, labels, human, person, stick figure, character, face, 3d, cgi, photorealism, realistic anatomy, rich colors, gradient, glow, bloom, cinematic lighting, detailed scenery, clutter, blurry`;
      } else {
        // Cảnh khoa học, địa chất, mặt cắt, đại dương sâu, vũ trụ, thiên nhiên không có người
        visualStyle = isStickFigure
          ? 'Bright polished hand-drawn 2D educational explainer diagram, clean soft-charcoal contours, only essential layers and shapes, 5–7 airy pastel flat colors, and no shading or dimensional effects.'
          : 'Mack-style 2D animated documentary cartoon illustration with bold black ink line work, warm flat color fills, and a clear educational composition.';
        sceneDirective = isStickFigure
          ? `Reduce ${sanitizedDesc} to a simple outlined diagram with only the 2–4 flat-color shapes needed to understand the phenomenon. No detailed landscape, texture, lighting, or atmosphere. No characters and absolutely zero text.`
          : `Scientific environment or conceptual landscape depicting ${sanitizedDesc} in stylized 2D cartoon art. No characters and absolutely zero text labels.`;
        negativePrompt = `--no ${noBorderNegative}text, words, letters, typography, subtitles, captions, speech bubble, writing, watermark, labels, human, person, stick figure, character, face, 3d, cgi, photorealism, realistic anatomy, rich colors, gradient, glow, bloom, cinematic lighting, detailed texture, atmospheric depth, clutter, blurry`;
      }

      // Ghim mốc thời gian / kỷ nguyên (Time Era Pinning)
      const eraDirective = detectedEra.directive;
      if (detectedEra.negative) {
        negativePrompt = `${negativePrompt}, ${detectedEra.negative}`;
      }

      // Cấm tuyệt đối viền trắng, khung ảnh (Full-bleed mandate)
      const strictBorderlessRule = 'ONE CONTINUOUS BRIGHT FLAT 2D CANVAS: broad light-pastel background shapes reach every edge. Keep the frame high-key and airy. No separate border, frame, card, panel, margin, sticker contour, or vignette.';

      // Cấm tuyệt đối chữ, phụ đề, bong bóng thoại, thanh banner chữ trên ảnh
      const strictNoTextRule = 'ABSOLUTE ZERO TEXT MANDATE: The final artwork must be completely textless, wordless, and letterless. Strictly zero words, zero letters, zero subtitles, zero speech bubbles, zero thought bubbles, zero caption banners, zero dialogue boxes, zero text overlays, zero labels, zero signs anywhere in the image. Pure visual illustration only, 100% clean of any written characters or typography.';

      const jsonPrompt = {
        title: `${title} - Slide ${seg.segmentNumber}`,
        category: 'Animated Documentary Stick Figure',
        image_style: isStickFigure
          ? 'Bright Polished Faceless Hand-Drawn 2D Stick Figure (Clean Charcoal Outline, Airy Pastel Flat Colors, Textless)'
          : 'Mack Explainer 2D Cartoon Style (Textless)',
        aspect_ratio: selectedAspectRatio,
        time_era: detectedEra.key,
        style: {
          visual_style: visualStyle,
          time_era: eraDirective,
          composition: compositionGuide,
          color_palette: isStickFigure
            ? ['#263238 (soft charcoal outlines)', '#FFFDF7 (clean ivory-white heads)', '#BFE3F5 (light sky blue)', '#FFE0A3 (sunny cream)', '#BFE3CC (fresh mint)', '#FFD0C2 (soft peach)', '#D9E2EA (light blue-grey)', '#FF7043 (single focal coral/orange accent when essential)']
            : ['#18181B (bold ink outlines)', 'Warm Earthy Tones', 'Muted stylized accents'],
          render_note: `${eraDirective} ${sceneDirective} ${strictBorderlessRule} ${strictNoTextRule}`
        },
        scene: {
          setting: sanitizedDesc,
          scene_type: isObjectFocus ? 'symbolic_object_focus' : (isCharacterScene ? 'character_action_scene' : 'scientific_environment')
        },
        audio: { dialogue_lines: [seg.dialogueOrNarration] },
        on_screen_captions: { subtitle: seg.subtitle }
      };

      const textPrompt = [
        `${visualStyle}`,
        `${eraDirective}`,
        `Visual scene: ${sanitizedDesc}.`,
        `${sceneDirective}`,
        `${strictBorderlessRule}`,
        `${strictNoTextRule}`,
        `${compositionGuide}`,
        `Format: aspect ratio ${selectedAspectRatio}.`,
        `${negativePrompt}`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        durationSeconds: seg.durationSeconds || 10,
        visualDescription: sanitizedDesc,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        ...(Array.isArray(seg.elements) && seg.elements.length > 0 ? { elements: seg.elements } : {}),
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

      const antiBadgeNote = 'CRITICAL CANVAS INTEGRITY (MANDATORY): The entire background of the image must be completely solid black (#000000) to the very edges of the frame. Strictly NO white background, NO white canvas, NO white border, NO outer white margins, NO sticker contour, NO card, NO badge, NO emblem, NO container box, NO rounded rectangle tile, NO drop shadow. The white figures and symbols must be drawn directly on the seamless full-bleed black background with nothing in between.';
      const negativePrompt = '--no white background, white border, white margins, white frame, card, badge, emblem, sticker outline, border, container, rounded rectangle box, drop shadow, 3d render, gradient, vignette, realistic textures';

      const textPrompt = [
        'Full-bleed solid pure black background (#000000) filling 100% of the entire canvas from edge to edge with zero white borders.',
        'Full-bleed edge-to-edge solid pure pitch black background (#000000) filling 100% of the entire canvas from border to border with zero borders and zero white margins.',
        `${visualStyle}`,
        `Scene description: ${seg.visualDescription}.`,
        landscapeCompositionNote,
        `${antiBadgeNote}`,
        landscapeCompositionNote,
        `Background setting: ${background}`,
        `Color palette: ${paletteList}.`,
        `${sceneRenderNote}`,
        `Format: aspect ratio ${selectedAspectRatio}.`
      ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
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
    const isWar = categoryKey === 'japanese_history' && isJapaneseHistoryWarTopic(input, [title, segments.map(s => s.visualDescription).join(' ')].join(' '));
    const styleClause = styleClauseFor(categoryKey, input, title);
    const worldClause = worldClauseFor(categoryKey, input, title);

    // Tỉ lệ + tràn viền tách thành câu riêng, ĐỨNG CUỐI và ngắn gọn để không bị chìm.
    const formatClause = `Wide ${selectedAspectRatio} landscape format. Full-bleed artwork: the illustration runs all the way to all four edges of the image.`;

    const themeObj = narrativeThemeFor(categoryKey, input);
    const moodClause = themeObj.mood ? `Mood: ${themeObj.mood}` : '';

    const textRule = BUDDHIST_TEXT_RULE;

    return segments.map(seg => {
      let rawScene = easternizeScene(stripNegativeClauses(seg.visualDescription));
      const isChapterTitle = seg.layout === 'chapter-title';
      let scene = rawScene;
      if (isChapterTitle) {
        // Loại bỏ các câu cũ nếu có chỉ định tiêu đề nằm ở mép trên (Across the upper portion...)
        scene = scene
          .replace(/Across the upper\s*(?:top\s*)?portion\s*(?:of the image|of the frame)?[^.]*\./gi, '')
          .trim();
      }

      let chapterTitleIntro = '';
      if (isChapterTitle) {
        const rawTitle = seg.actTitle || (seg.subtitle ? seg.subtitle.split('\n')[0].replace(/\*\*/g, '').trim() : '');
        const bannerDesc = isWar
          ? 'a large, tall traditional Japanese samurai war banner (vertical nobori battle flag made of coarse textured woven hemp cloth, mounted on a tall sturdy wooden pole with horizontal crossbeam)'
          : 'a grand traditional Japanese ceremonial banner (tall vertical hanging silk/linen clan flag on a sturdy wooden pole)';
        const bannerCalligraphy = rawTitle
          ? `Inscribed vertically in bold black brush-and-ink calligraphy directly onto the textured cloth surface of this large foreground banner, the title is painted top-to-bottom: 「${rawTitle}」. The kanji characters are physically painted onto the fabric texture and follow the vertical drape of the cloth. Absolutely NO floating text, NO horizontal text across the screen, NO digital overlay: all lettering is strictly vertical calligraphy brushed on the banner fabric itself.`
          : `Inscribed vertically in bold black brush-and-ink calligraphy directly onto the textured cloth surface of this large foreground banner, the title is painted in traditional vertical kanji. Absolutely NO floating text.`;

        chapterTitleIntro = `Close-up foreground composition: Positioned very close to the camera in the center of the frame, ${bannerDesc} stands large and prominent as the main subject, occupying the central vertical height of the picture. ${bannerCalligraphy} In the soft, distant background far behind the large banner:`;
      }

      const chapterWorldClause = isWar
        ? 'Set in feudal Japan: a quiet, distant background far behind the large foreground banner with faint misty castle ramparts or distant army banners under a soft pale morning sky, kept soft and low-contrast so the large foreground banner dominates.'
        : 'Set in feudal Japan: a quiet, distant background far behind the large foreground banner with soft misty mountains or Japanese temple eaves under a pale morning sky.';

      const jsonPrompt = {
        title: `${title} - Slide ${seg.segmentNumber}`,
        category: categoryKey === 'japanese_history'
          ? 'Japanese History Watercolour Slideshow'
          : 'Buddhist Wisdom Watercolour Slideshow',
        image_style: categoryKey === 'japanese_history'
          ? 'Japanese Historical Ink-and-Watercolour Illustration'
          : 'Loose pen-and-watercolour storybook illustration on white paper',
        aspect_ratio: selectedAspectRatio,
        // scene đứng trước style, cùng lý do với textPrompt ở trên.
        scene: {
          setting: isChapterTitle ? `${chapterTitleIntro} ${scene}` : scene,
          world: isChapterTitle ? chapterWorldClause : worldClause,
          ...(moodClause ? { mood: themeObj.mood } : {})
        },
        style: {
          visual_style: styleClause,
          paper: 'Smooth bright white paper, left bare across large parts of the image.',
          format: formatClause,
          text: isChapterTitle
            ? 'The chapter title is painted vertically in black ink calligraphy directly onto the cloth of the large foreground banner. Absolutely NO floating text, NO horizontal text across the screen, NO digital text overlay.'
            : textRule
        },
        audio: {
          narration: seg.dialogueOrNarration
        },
        on_screen_captions: {
          subtitle: seg.subtitle
        }
      };

      const textPrompt = isChapterTitle
        ? [
            chapterTitleIntro,
            `${scene}.`,
            chapterWorldClause,
            styleClause,
            'The chapter title is painted vertically in black ink calligraphy directly onto the cloth of the large foreground banner. Absolutely NO floating text, NO horizontal text across the screen, NO digital text overlay.',
            formatClause
          ].filter(Boolean).join(' ')
        : [
            `${scene}.`,
            worldClause,
            moodClause,
            styleClause,
            textRule,
            formatClause
          ].filter(Boolean).join(' ');

      return {
        segmentNumber: seg.segmentNumber,
        // Con số ƯỚC LƯỢNG, ghi vào manifest để hiển thị và thống kê.
        durationSeconds: isChapterTitle ? (Number(seg.durationSeconds) || 4) : (seg.durationSeconds || 5),
        visualDescription: seg.visualDescription,
        dialogueOrNarration: seg.dialogueOrNarration,
        subtitle: seg.subtitle,
        aspectRatio: selectedAspectRatio,
        jsonPrompt,
        textPrompt,
        ...(seg.layout ? { layout: seg.layout } : {}),
        ...(seg.act ? { act: seg.act } : {}),
        ...(seg.actTitle ? { actTitle: seg.actTitle } : {})
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
