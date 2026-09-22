/**
 * Prompt Template: Báo Chí & Tin Tức — Kịch Bản Người Que (Domain Layer)
 * Chuyển thể bài báo / tin tức thời sự thành video phóng sự hoạt họa Người Que 2D.
 * Tuân thủ nghiêm ngặt tính khách quan báo chí, bám sát sự thật, không văn chương cảm xúc.
 */
import { buildPunctuationRhythmGuidance } from './narrationPacing.js';

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

  // Trích xuất tiêu đề bài báo từ input hoặc nội dung
  let articleTitle = (input.articleTitle || '').trim();
  if (!articleTitle && articleContent) {
    const titleMatch = articleContent.match(/TIÊU ĐỀ:\s*([^\n]+)/i);
    if (titleMatch) {
      articleTitle = titleMatch[1].trim();
    } else {
      const firstLine = articleContent.split('\n')[0].trim();
      if (firstLine.length > 8 && firstLine.length < 180 && !firstLine.includes(':')) {
        articleTitle = firstLine;
      }
    }
  }

  const G = {
    laneL: isLandscape ? 30 : 25,
    laneR: isLandscape ? 70 : 75,
    ground: isLandscape ? 78 : 74,
    charScale: isLandscape ? 0.95 : 1.1,
  };

  const punctuationGuidance = buildPunctuationRhythmGuidance(isVietnamese);

  const journalisticGuidance = isVietnamese
    ? `═══════════════════════════════════════════════════════
QUY TẮC BẮT BUỘC: MỞ ĐẦU HẤP DẪN (HOOK) & NGẮN GỌN TRỌNG TÂM
═══════════════════════════════════════════════════════

1. CẢNH 1 (CÂU ĐẦU TIÊN) — PHẢI GIẬT HOOK HẤP DẪN DỰA TRÊN TIÊU ĐỀ BÀI BÁO:
   - Câu đầu tiên của video là "Hook" quyết định người xem dừng lại hay lướt qua trong 2-3 giây đầu tiên:
     * BẮT BUỘC DÙNG TIÊU ĐỀ BÀI BÁO hoặc BIẾN TẤU SẮC BÉN TỪ TIÊU ĐỀ BÀI BÁO để làm câu mở đầu (dialogueOrNarration của Cảnh 1).
     * Nêu bật mâu thuẫn đỉnh điểm, phát ngôn bất ngờ hoặc tình tiết kịch tính nhất mà tiêu đề bài báo đã nêu.
     * VÍ DỤ CỤ THỂ:
       Nếu tiêu đề bài báo là: "Xét xử vụ ca sĩ Jack khởi kiện đòi xác định quyền làm cha: Thiên An nói một câu về việc nuôi con từ năm 2022"
       -> Cảnh 1 câu mở đầu NÓI NGAY: "Vụ kiện Jack đòi quyền làm cha: Thiên An vừa nói một câu về việc nuôi con khiến cả phiên tòa bất ngờ!"
       HOẶC LẤY NGUYÊN TIÊU ĐỀ: "Xét xử vụ ca sĩ Jack kiện đòi quyền làm cha, và câu nói bất ngờ của Thiên An về việc nuôi con!"
     * CẤM TUYỆT ĐỐI cách mở đầu buồn ngủ, hành chính như: "Hôm nay ngày 22/9, Tòa án nhân dân đã mở phiên xét xử...", "Chào mừng các bạn đến với...", "Sau đây là thông tin về...". Đây là cách mở đầu tệ nhất trên mạng xã hội, người xem sẽ lướt qua ngay lập tức!

2. VIẾT NGẮN GỌN, ĐANH THÉP, ĐI THẲNG VÀO TRỌNG TÂM (CẤM DÀI DÒNG, LAN MAN):
   - ĐỘ DÀI MỖI CÂU THOẠI (dialogueOrNarration): CHỈ TỪ 10 ĐẾN 16 TỪ. Cực kỳ cô đọng, dứt khoát, nhịp điệu nhanh.
   - BỎ TOÀN BỘ TỪ ĐỆM, TỪ NỐI VÔ BỔ:
     * CẤM các từ rườm rà: "được biết thì", "theo như tìm hiểu", "trong khi đó thì", "có thể thấy rằng", "chúng ta đều biết là", "theo ghi nhận của phóng viên".
     * Đi thẳng vào diễn biến: [Nhân vật] + [Làm gì / Nói gì / Tòa phán quyết gì] + [Con số / Chi tiết đắt giá].
   - MỖI CẢNH NÓI 1 Ý RÕ RÀNG:
     * Cảnh 1: Hook giật tít từ tiêu đề bài báo (kích thích tò mò tột độ).
     * Cảnh 2: Hai bên đối mặt tại phiên tòa / bối cảnh thực tế.
     * Cảnh 3: Yêu cầu và lý lẽ của bên nguyên đơn / khởi kiện.
     * Cảnh 4: Phản ứng hoặc tuyên bố đắt giá của bên bị đơn / người bị kiện.
     * Cảnh 5-N: Chứng cứ, số tiền chu cấp, kết quả xét nghiệm, phán quyết của tòa án.
     * Cảnh cuối: Tóm tắt trạng thái hiện tại và đặt câu hỏi thảo luận ngắn gọn.

3. PHỤ ĐỀ (subtitle) NGẮN GỌN, ĐẬP VÀO MẮT (3 đến 6 từ):
   - Phụ đề phải là những cụm từ ngắn gọn, giật điểm tin nổi bật trên màn hình:
     Ví dụ: "Jack kiện đòi quyền làm cha", "Hai bên đối mặt tại tòa", "Thiên An: Tự nuôi con từ 2022", "Phán quyết cuối cùng của HĐXX".

4. TÍNH KHÁCH QUAN & BÁM SÁT 100% SỰ THẬT:
   - Dù nhịp điệu nhanh và hấp dẫn, TOÀN BỘ DỮ KIỆN (tên người, sự việc, số tiền, mốc thời gian, phán quyết) PHẢI 100% CÓ TRONG BÀI BÁO.
   - CẤM bịa đặt tình tiết, CẤM văn chương sướt mướt ("xót xa", "ngậm ngùi"), CẤM triết lý đạo lý ("cuộc đời là...", "bài học đắt giá").`
    : `═══════════════════════════════════════════════════════
MANDATORY RULES: CAPTIVATING HOOK & PUNCHY CONCISE PACING
═══════════════════════════════════════════════════════
1. SCENE 1 (THE HOOK) MUST USE THE ARTICLE HEADLINE:
   - Grab attention in the first 2-3 seconds using the article's headline or a sharp variation.
   - NO boring administrative intro. Start straight with the core conflict or surprising revelation.
2. ULTRA-CONCISE & DIRECT (10-16 words per scene):
   - Fast-paced, punchy, dynamic digital news style.
   - Strictly 100% factual, no filler words.`;

  return `Bạn là Biên tập viên Tin tức Thời sự kiêm Đạo diễn hoạt họa Người Que 2D chuyên nghiệp (phong cách tin tức video ngắn triệu view trên TikTok, Reels, YouTube Shorts).
Nhiệm vụ của bạn là đọc kỹ NỘI DUNG BÀI BÁO dưới đây và CHUYỂN THỂ thành một kịch bản video hoạt họa Người Que 2D thời sự, CỰC KỲ NGẮN GỌN, CUỐN HÚT, ĐẬP THẲNG VÀO TRỌNG TÂM, và CÓ HOOK MỞ ĐẦU HẤP DẪN TỪ TIÊU ĐỀ BÀI BÁO.

═══════════════════════════════════════════════════════
THÔNG TIN BÀI BÁO ĐẦU VÀO
═══════════════════════════════════════════════════════
${articleTitle ? `📌 TIÊU ĐỀ BÀI BÁO GỐC: "${articleTitle}"\n(BẮT BUỘC DÙNG TIÊU ĐỀ NÀY LÀM HOOK MỞ ĐẦU CHO CẢNH 1!)\n` : ''}${articleUrl ? `Nguồn link: ${articleUrl}\n` : ''}Nội dung bài viết:
${articleContent || '(Không có nội dung chi tiết, hãy yêu cầu người dùng cung cấp link hoặc nội dung bài báo)'}

═══════════════════════════════════════════════════════
MỤC TIÊU THỜI LƯỢNG & SỐ PHÂN ĐOẠN (BẮT BUỘC)
═══════════════════════════════════════════════════════
• Mức thời lượng: ${durationLabel}
• Số lượng phân cảnh (Slide) BẮT BUỘC: Tạo đúng ${targetSlides} phân đoạn (slides).
• Thời lượng mỗi slide: ${slideSecondsHint} (nhanh gọn, dứt khoát).
• Tỉ lệ màn hình: ${isLandscape ? '16:9 (Màn ngang YouTube dài)' : '9:16 (Màn dọc TikTok / Shorts / Reels)'}
• Ngôn ngữ thuyết minh: ${isVietnamese ? 'Tiếng Việt' : 'Tiếng Anh (English)'}
• Phong cách nhân vật: ${characterStyle === 'regular_human' ? 'Người thường hoạt họa 2D (Stylized 2D Human)' : 'Người que vẽ tay biểu cảm (2D Stick Figure)'}

${journalisticGuidance}

${punctuationGuidance}

═══════════════════════════════════════════════════════
CẤU TRÚC KỊCH BẢN BÁO CHÍ 3 PHẦN CHUẨN MỰC
═══════════════════════════════════════════════════════
1. PHẦN 1 — HOOK TIÊU ĐIỂM MỞ ĐẦU (Slide 1 đến 2, ~5-7 giây):
   - Slide 1: BẮT BUỘC là câu Hook giật tít dựa trên TIÊU ĐỀ BÀI BÁO, nêu bật điểm nóng gây tò mò nhất.
   - Slide 2: Hai bên đối mặt hoặc sự kiện bắt đầu diễn ra.

2. PHẦN 2 — TƯỜNG THUẬT CÔ ĐỌNG CÁC DIỄN BIẾN CHÍNH (Slide 3 đến N-1):
   - Đi thẳng vào các tình tiết đắt giá: ai yêu cầu gì, ai phản hồi gì, chứng cứ, số tiền chu cấp, phán quyết của tòa.
   - Mỗi slide chỉ nói 1 câu ngắn gọn 10-16 từ.
   - Minh họa Người Que trực quan: phòng xử án, đối thoại, tài liệu pháp lý, bảng biểu số liệu.

3. PHẦN 3 — KẾT LUẬN & KÊU GỌI THẢO LUẬN (Slide cuối):
   - Tóm tắt kết quả hiện tại trong 1 câu ngắn.
   - Đặt 1 câu hỏi trung lập kích thích bình luận: "Bạn nghĩ sao về vụ việc này? Để lại ý kiến bên dưới nhé!".

═══════════════════════════════════════════════════════
QUY TẮC MÔ TẢ HÌNH ẢNH (visualDescription)
═══════════════════════════════════════════════════════
- Mô tả hoàn toàn bằng TIẾNG ANH cho bộ sinh ảnh 2D.
- Phong cách: Clean hand-drawn 2D minimalist black ink on light textured paper, clear expressive stick figures, simple flat pastel accents.
- TUYỆT ĐỐI KHÔNG chứa chữ, văn bản, bong bóng thoại hay chữ in trên ảnh (no text, no letters, no speech bubbles).
- Mỗi cảnh mô tả rõ hành động nhân vật người que hoặc biểu đồ / tài liệu / hiện trường:
  * Ví dụ cảnh tòa án / phóng sự: "A minimalist hand-drawn 2D stick figure standing before a courtroom judge desk, clean charcoal outlines, light off-white paper texture, textless."
  * Ví dụ cảnh phát biểu / đối chất: "Two 2D stick figures facing each other in a courtroom, expressive posture, minimalist ink sketch, pastel accents, textless."

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
  "title": "Tiêu đề video tin tức ngắn gọn, cuốn hút (dưới 60 ký tự)",
  "youtubeTitle": "Tiêu đề giật tít hấp dẫn kèm emoji (dưới 90 ký tự)",
  "hashtags": ["#tintuc", "#thoisu", "#phapluat", "#sukien"],
  "youtubeDescription": "Tóm tắt ngắn gọn nội dung bài báo, nguồn đưa tin và câu hỏi thảo luận",
  "segments": [
    {
      "segmentNumber": 1,
      "layout": "default",
      "visualDescription": "A hand-drawn 2D stick figure reporter holding a microphone in front of a breaking news headline board, clean charcoal lines, pale off-white background, textless.",
      "dialogueOrNarration": "Câu Hook mở màn giật tít dựa trên TIÊU ĐỀ BÀI BÁO (10-16 từ).",
      "subtitle": "Phụ đề ngắn gọn 3-5 từ",
      "durationSeconds": 2.5,
      "elements": [
        { "asset": "sym_warning", "x": ${G.laneR}, "y": 20, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.3 }
      ]
    }
  ],
  "thumbnail": {
    "visualDescription": "High contrast hand-drawn 2D news explainer thumbnail with a stick figure pointing at a headline event, clean charcoal outlines, bright flat colors, textless.",
    "headlineText": "TIÊU ĐỀ THUMBNAIL THỜI SỰ"
  }
}
`;
}
