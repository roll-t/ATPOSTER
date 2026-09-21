/**
 * Prompt Template: Báo Chí & Tin Tức — Kịch Bản Người Que (Domain Layer)
 * Chuyển thể bài báo / tin tức thời sự thành video phóng sự hoạt họa Người Que 2D.
 */
import { buildPunctuationRhythmGuidance } from './narrationPacing.js';
import { buildHumanVoiceGuidance } from './humanVoice.js';

const ARTICLE_SLIDE_TIERS = {
  'under_1m': { slides: '18 đến 24', seconds: '2 đến 3 giây' },
  '1_2m': { slides: '28 đến 38', seconds: '2.5 đến 3.5 giây' },
  '2_3m': { slides: '42 đến 55', seconds: '3 đến 4 giây' },
  '3_4m': { slides: '58 đến 72', seconds: '3 đến 4.5 giây' },
  '4_6m': { slides: '75 đến 95', seconds: '3.5 đến 5 giây' },
};

export function buildArticleStickFigureScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isVietnamese = (input.narrationLanguage || 'vi') === 'vi';
  const isLandscape = input.aspectRatio === '16:9';
  const tier = ARTICLE_SLIDE_TIERS[durationRange] || ARTICLE_SLIDE_TIERS['under_1m'];
  const targetSlides = tier.slides;
  const slideSecondsHint = tier.seconds;
  const durationLabel = durationInfo?.label || (durationRange === 'under_1m' ? 'Dưới 1 phút' : 'Video dài');

  const articleContent = (input.scenario || input.articleContent || '').trim();
  const articleUrl = (input.articleUrl || '').trim();
  const characterStyle = input.characterStyle || 'stick_figure';

  const G = {
    laneL: isLandscape ? 30 : 25,
    laneR: isLandscape ? 70 : 75,
    ground: isLandscape ? 78 : 74,
    charScale: isLandscape ? 0.95 : 1.1,
  };

  const humanVoiceGuidance = buildHumanVoiceGuidance(isVietnamese);
  const punctuationGuidance = buildPunctuationRhythmGuidance(isVietnamese);

  return `Bạn là Giám đốc Sáng tạo và Biên kịch Tin tức Phóng sự Đời sống kiêm Đạo diễn hoạt họa Người Que 2D (phong cách Kurzgesagt, Johnny Harris, Mack).
Nhiệm vụ của bạn là đọc kỹ NỘI DUNG BÀI BÁO dưới đây và CHUYỂN THỂ thành một kịch bản video hoạt họa người que cực kỳ cuốn hút, giật gân, thời sự và giàu thông tin.

═══════════════════════════════════════════════════════
THÔNG TIN BÀI BÁO ĐẦU VÀO
═══════════════════════════════════════════════════════
${articleUrl ? `Nguồn link: ${articleUrl}\n` : ''}Nội dung bài viết:
${articleContent || '(Không có nội dung chi tiết, hãy sáng tạo một bản tin giật gân về đời sống / công nghệ / xã hội)'}

═══════════════════════════════════════════════════════
MỤC TIÊU THỜI LƯỢNG & SỐ PHÂN ĐOẠN (BẮT BUỘC)
═══════════════════════════════════════════════════════
• Mức thời lượng: ${durationLabel}
• Số lượng phân cảnh (Slide) BẮT BUỘC: Tạo đúng ${targetSlides} phân đoạn (slides).
• Thời lượng mỗi slide: ${slideSecondsHint} (không quá ngắn, không quá dài).
• Tỉ lệ màn hình: ${isLandscape ? '16:9 (Màn ngang YouTube dài)' : '9:16 (Màn dọc TikTok / Shorts / Reels)'}
• Ngôn ngữ thuyết minh: ${isVietnamese ? 'Tiếng Việt' : 'Tiếng Anh (English)'}
• Phong cách nhân vật: ${characterStyle === 'regular_human' ? 'Người thường hoạt họa 2D (Stylized 2D Human)' : 'Người que vẽ tay biểu cảm (2D Stick Figure)'}

═══════════════════════════════════════════════════════
CẤU TRÚC KỊCH BẢN BÁO CHÍ 3 PHẦN KINH ĐIỂN
═══════════════════════════════════════════════════════
1. PHẦN 1 — BREAKING NEWS HOOK (Slide 1 đến 3, ~6-9 giây):
   - Mở màn bằng sự kiện nóng nhất, con số gây sốc nhất hoặc mâu thuẫn trung tâm của bài báo.
   - Cảnh đầu tiên kết hợp trực tiếp với Banner đỏ "TIN TỨC": Câu thoại đập thẳng vào sự kiện, không chào hỏi lan man.
   - Ví dụ: "Một phát hiện chấn động vừa được công bố...", "Giá vàng vừa lập đỉnh lịch sử chưa từng có...", "Một lỗ hổng nghiêm trọng vừa khiến hàng triệu tài khoản bị rò rỉ...".

2. PHẦN 2 — BÓC TÁCH DIỄN BIẾN & BẢN CHẤT SỰ VIỆC (Slide 4 đến N-2):
   - Bóc tách theo công thức 5W1H (Chuyện gì đã xảy ra? Ai là người liên quan? Nguyên nhân từ đâu? Hậu quả thế nào?).
   - Trích dẫn số liệu, phát biểu của chuyên gia hoặc nhân chứng trong bài báo nhưng diễn đạt bằng văn phong đời thường, sắc sảo.
   - Sử dụng các hình ảnh ẩn dụ người que thông minh: người que ôm đầu trước biểu đồ giảm điểm, người que cầm kính lúp soi tài liệu, người que xếp hàng dài chờ đợi, hoặc hai phe tranh cãi.

3. PHẦN 3 — ĐÚC KẾT & KÊU GỌI BÀN LUẬN (2 slide cuối):
   - Đúc kết tác động của sự việc đến đời sống của người xem (họ cần cẩn trọng điều gì? Tương lai sẽ ra sao?).
   - Slide cuối cùng đặt một câu hỏi mở nhức nhối để kích thích tranh luận dưới phần bình luận:
     "Còn bạn, bạn nghĩ ai đúng trong vụ việc này?", "Liệu đây là cơ hội hay cạm bẫy? Hãy để lại ý kiến bên dưới!".

${humanVoiceGuidance}
${punctuationGuidance}

═══════════════════════════════════════════════════════
QUY TẮC MÔ TẢ HÌNH ẢNH (visualDescription)
═══════════════════════════════════════════════════════
- Mô tả hoàn toàn bằng TIẾNG ANH cho bộ sinh ảnh 2D.
- Phong cách: Clean hand-drawn 2D minimalist black ink on light textured paper, clear expressive stick figures, simple flat pastel accents.
- TUYỆT ĐỐI KHÔNG chứa chữ, văn bản, bong bóng thoại hay chữ in trên ảnh (no text, no letters, no speech bubbles).
- Mỗi cảnh mô tả rõ hành động nhân vật người que hoặc biểu đồ / tài liệu / hiện trường:
  * Ví dụ cảnh phóng viên / tin tức: "A polished faceless stick figure reporter holding a small microphone, breaking news studio backdrop with a faint minimalist world map, clean charcoal outlines, bright flat pastel colors, textless."
  * Ví dụ cảnh tài chính / số liệu: "A simple hand-drawn 2D diagram with a stick figure looking in shock at a sharp red declining zigzag graph line, clean minimalist outlines on off-white paper, textless."

═══════════════════════════════════════════════════════
DANH SÁCH ASSET ELEMENTS (Biểu cảm & Đạo cụ):
═══════════════════════════════════════════════════════
Dùng trong mảng "elements" của từng slide:
- Poses: pose_thinking, pose_shocked, pose_stressed, pose_pointing_right, pose_celebrating, pose_happy_arms_up, pose_sad_slumped, pose_running.
- Props: prop_microphone, prop_newspaper, prop_notebook, prop_pencil, prop_hourglass, prop_checklist, prop_money_bag, prop_laptop, prop_shield.
- Symbols: sym_warning, sym_lightning, sym_key, sym_target, sym_question, sym_exclamation, sym_star, sym_cross_x, sym_check_mark.

═══════════════════════════════════════════════════════
ĐỊNH DẠNG JSON TRẢ VỀ (BẮT BUỘC KHÔNG BỌC TRONG MARKDOWN CODE BLOCK)
═══════════════════════════════════════════════════════
{
  "title": "Tiêu đề video tin tức súc tích (dưới 60 ký tự)",
  "youtubeTitle": "Tiêu đề YouTube/TikTok giật tít hấp dẫn kèm emoji",
  "hashtags": ["#tintuc", "#thoisu", "#khampha", "#nguoique"],
  "youtubeDescription": "Mô tả ngắn gọn nội dung video, nguồn bài báo và câu hỏi thảo luận",
  "segments": [
    {
      "segmentNumber": 1,
      "layout": "default",
      "visualDescription": "A hand-drawn 2D stick figure reporter holding a microphone in front of a minimalist breaking news board, clean charcoal lines, pale off-white background, textless.",
      "dialogueOrNarration": "Câu thuyết minh mở màn đập thẳng vào sự kiện bài báo.",
      "subtitle": "Phụ đề ngắn gọn tương ứng.",
      "durationSeconds": 2.5,
      "elements": [
        { "asset": "sym_warning", "x": ${G.laneR}, "y": 20, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.3 }
      ]
    }
  ],
  "thumbnail": {
    "visualDescription": "High contrast hand-drawn 2D news explainer thumbnail with a stick figure pointing at a dramatic headline event, clean charcoal outlines, bright flat colors, textless.",
    "headlineText": "TIÊU ĐỀ THUMBNAIL GIẬT GÂN"
  }
}
`;
}
