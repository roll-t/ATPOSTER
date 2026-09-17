/**
 * Xây dựng prompt gửi cho Gemini để sinh kịch bản phân cảnh cho dòng
 * "Video Slide Người Que PNG" — dùng thư viện ảnh PNG sẵn có thay vì sinh ảnh AI.
 * Gemini chọn asset ID + toạ độ (x,y) cho từng slide; Remotion ghép chúng thành cảnh.
 */
import { buildPunctuationRhythmGuidance } from './narrationPacing.js';
import { buildHumanVoiceGuidance } from './humanVoice.js';
import { detectTimeEra } from '../../content/timeEraDetector.js';

const STICK_FIGURE_SLIDE_TIERS = {
  'under_1m': { slides: '20 đến 25', seconds: '2 đến 3 giây' },
  '1_2m': { slides: '30 đến 42', seconds: '2.5 đến 3.5 giây' },
  '2_3m': { slides: '45 đến 60', seconds: '3 đến 4 giây' },
  '3_4m': { slides: '60 đến 80', seconds: '3 đến 4.5 giây' },
  '4_6m': { slides: '75 đến 100', seconds: '3.5 đến 5 giây' },
  '6_8m': { slides: '90 đến 120', seconds: '4 đến 5.5 giây' },
  '8_10m': { slides: '100 đến 140', seconds: '4 đến 6 giây' },
};

function buildMackStickFigureStorytellingGuidance({ isVietnamese, topic, G, detectedEra, durationRange = 'under_1m', durationInfo, targetSlides = '20 đến 25', slideSecondsHint = '2 đến 3 giây' }) {
  const isPreHuman = Boolean(detectedEra?.isPreHuman);
  const isShort = durationRange === 'under_1m';
  const durationLabel = durationInfo?.label || (isShort ? 'Dưới 1 phút' : 'Video dài');

  if (isVietnamese) {
    return `═══════════════════════════════════════════════════════
TIÊU CHUẨN KỊCH BẢN: ĐẬM ĐẶC TRI THỨC & GIẢI MÃ KHOA HỌC (BẮT BUỘC)
═══════════════════════════════════════════════════════
ĐÂY LÀ VIDEO PHỔ BIẾN KIẾN THỨC, KHOA HỌC & LỊCH SỬ THỰC THỤ (phong cách Kurzgesagt, Mack, TED-Ed, MinutePhysics):
Mục tiêu tối thượng: Người xem xem xong video ${durationLabel} PHẢI HỌC ĐƯỢC KIẾN THỨC THẬT, số liệu chuẩn xác, hiểu thấu bản chất cơ chế — TUYỆT ĐỐI KHÔNG NÓI THUYÊN THUYÊN, KHÔNG CẢM THÁN CÂU GIỜ, KHÔNG DÙNG VĂN SÁO RỖNG!

1. NGUYÊN TẮC "MẬT ĐỘ KIẾN THỨC CAO" (HIGH INFORMATION DENSITY):
   • MỖI PHÂN ĐOẠN (SLIDE) PHẢI MANG 1 THÔNG TIN CÓ GIÁ TRỊ:
     - Chứa ít nhất một trong các yếu tố: Con số thực tế (độ sâu, nhiệt độ, năm, áp suất, tỉ lệ %), Thuật ngữ/Khái niệm khoa học chuẩn, Cơ chế nguyên nhân - kết quả, hoặc Bằng chứng nghiên cứu/khảo cổ/sinh học.
     - Người xem nghe xong từng câu phải hiểu thêm một điều mới lạ về chủ đề "${topic || 'kiến thức'}".
   • CẤM TUYỆT ĐỐI NÓI THUYÊN THUYÊN / CÂU GIỜ / CẢM THÁN SUÔNG:
     - ⛔ CẤM CÁC CÂU RỖNG TUẾCH: "Nơi này vô cùng bí ẩn và đáng sợ...", "Có những điều bạn không thể ngờ tới...", "Hãy cùng tôi khám phá...", "Bạn có tò mò không...", "Và rồi mọi chuyện trở nên kỳ lạ...", "Điều đó làm ta phải suy ngẫm...". Những câu này không hề có kiến thức, xoá đi người xem không mất một thông tin nào -> BỊ CẤM HOÀN TOÀN!
     - ✅ PHẢI NÓI THẲNG VÀO SỰ THẬT & CƠ CHẾ:
       * Về Đại dương / Vũ trụ / Thiên nhiên: Nêu con số mét độ sâu, áp suất atmosphere, nhiệt độ độ C, ánh sáng quang phổ, chất sinh học (ví dụ áp suất 1.000 atm nghiền nát kim loại, sinh vật dùng protein đặc biệt chống đông).
       * Về Tâm lý / Thói quen / Não bộ: Nêu tên vùng não (hạch hạnh nhân amygdala, vỏ não trước trán prefrontal cortex), chất dẫn truyền thần kinh (dopamine, cortisol, adenosine), cơ chế phản xạ sinh tồn.
       * Về Lịch sử / Sinh tồn / Tiến hóa: Nêu bằng chứng giải phẫu (xương ngón chân, men răng), niên đại năm, công cụ phát minh cụ thể, phân tích ADN.

${isShort ? `2. CẤU TRÚC PHÂN PHỐI KIẾN THỨC THEO NHỊP ${targetSlides} PHÂN ĐOẠN (${durationLabel}):
   • BƯỚC 1: HOOK NGHỊCH LÝ & GỌI ĐÍCH DANH TÊN CHỦ THỂ (Slide 1 đến 3, ~6-8 giây):
     - 🚨 BẮT BUỘC GỌI ĐÍCH DANH TÊN CHỦ THỂ / ĐỊA DANH / HIỆN TƯỢNG NGAY TỪ SLIDE 1 HOẶC 2:
       Khán giả nghe câu đầu tiên PHẢI BIẾT NGAY ĐANG NÓI VỀ CÁI GÌ!
       * Đang nói về chủ đề "${topic || 'kiến thức'}": Slide 1 (hoặc slide 2) BẮT BUỘC PHẢI PHÁT ÂM RÕ TỪ KHÓA TÊN CHỦ THỂ NÀY (Ví dụ: nói về "Rãnh Mariana" thì PHẢI NÓI RÕ "Dưới đáy Rãnh Mariana...", nói về "Thiên thạch Chicxulub" thì PHẢI NÓI RÕ "Thiên thạch Chicxulub...", nói về "Tuyết Cầu Trái Đất" thì PHẢI NÓI RÕ "Kỷ Tuyết Cầu Trái Đất...").
       * TUYỆT ĐỐI CẤM mở đầu mập mờ, vô danh kiểu: "Ở độ sâu 11.000m...", "Tại một nơi bí ẩn...", "Vật thể này..." mà từ đầu đến cuối không ai biết là ở đâu hay cái gì!
     - Đập ngay vào tai người nghe một con số hoặc sự thật nghịch lý lớn nhất của chủ đề "${topic || 'kiến thức'}".
     - Nêu ngay câu hỏi mâu thuẫn cốt lõi: Vì sao hiện tượng này tồn tại? Làm thế nào vật chất / sinh vật chịu đựng được điều đó?
   • BƯỚC 2: BÓC TÁCH CƠ CHẾ & BẰNG CHỨNG KHOA HỌC (Slide 4 đến 18, ~35-40 giây):
     - Mỗi 2-3 slide giải quyết trọn vẹn 1 mắt xích kiến thức cụ thể:
       + Mắt xích 1: Bản chất vật lý / hóa học / sinh học thực sự đằng sau hiện tượng là gì?
       + Mắt xích 2: Bằng chứng khoa học hoặc thí nghiệm đo đạc thực tế chứng minh điều đó.
       + Mắt xích 3: Sự thật bất ngờ mà người bình thường luôn hiểu sai.
     - Dùng các phép so sánh hình tượng dễ nhớ (ví dụ: áp suất đáy biển = 50 máy bay đè lên đầu; trì hoãn = não bộ bấm còi báo cháy giả).
   • BƯỚC 3: ĐÚC KẾT TRI THỨC & GIÁ TRỊ THỰC TIỄN (Slide 19 đến ${targetSlides}, ~8-10 giây):
     - Kết lại bằng 1 chân lý khoa học hoặc quy luật sâu sắc. Người xem cảm thấy được mở mang tầm mắt thực sự.` : `2. CẤU TRÚC PHÂN PHỐI KIẾN THỨC VIDEO DÀI ${durationLabel.toUpperCase()} (${targetSlides.toUpperCase()} PHÂN ĐOẠN LIÊN TỤC):
   • 🚨 YÊU CẦU ĐỘ DÀI: BẮT BUỘC tạo đủ ${targetSlides} phân đoạn (slides). KHÔNG được dừng sớm ở 20-25 slide của video ngắn!
   • BƯỚC 1: MỞ ĐẦU ĐẶT VẤN ĐỀ & HOOK NGHỊCH LÝ (Slide 1 đến 5):
     - 🚨 BẮT BUỘC GỌI ĐÍCH DANH TÊN CHỦ THỂ / ĐỊA DANH / HIỆN TƯỢNG NGAY TỪ SLIDE 1 HOẶC 2:
       Khán giả nghe câu đầu tiên PHẢI BIẾT NGAY ĐANG NÓI VỀ CÁI GÌ!
       * Đang nói về chủ đề "${topic || 'kiến thức'}": Slide 1 hoặc 2 PHẢI PHÁT ÂM RÕ TỪ KHÓA TÊN CHỦ THỂ NÀY.
     - Nêu ngay nghịch lý khoa học / câu đố tiến hóa lớn nhất để cuốn hút người xem xuyên suốt video dài.
   • BƯỚC 2: BÓC TÁCH TOÀN DIỆN QUA 4 ĐẾN 6   CHƯƠNG CHUYÊN SÂU (Từ Slide 6 đến gần cuối):
     - Chia chủ đề thành 4 - 6 chương/mắt xích kiến thức lớn liên hoàn (mỗi chương dài 15 đến 25 slide phân tích cặn kẽ):
       + Chương 1: Bối cảnh khởi nguồn / Điều kiện môi trường sinh tồn khắc nghiệt buộc phải thay đổi.
       + Chương 2: Cơ chế sinh học, giải phẫu hoặc vật lý then chốt (các tuyến cơ thể, mô, xương, enzyme, tế bào...).
       + Chương 3: Thí nghiệm thực chứng, khảo cổ hoặc phân tích di truyền ADN chứng minh điều đó.
       + Chương 4: Nghịch lý phụ hoặc câu hỏi bí ẩn tiếp theo (ví dụ: mất lông toàn thân nhưng vì sao vẫn giữ lại tóc?).
       + Chương 5: So sánh với các loài lân cận và các trường phái giả thuyết khoa học đối nghịch.
     - Mỗi slide đi sâu vào một chi tiết, con số, lập luận hoặc bằng chứng cụ thể.
   • BƯỚC 3: ĐÚC KẾT TRI THỨC VÀ TẦM NHÌN TIẾN HÓA / KHOA HỌC (8-12 slide cuối):
     - Kết nối toàn bộ các mắt xích ở trên thành một bức tranh chân lý khoa học hoàn chỉnh, mang lại giá trị nhận thức sâu sắc cho khán giả.`}

3. BIÊN ĐẠO HÌNH ẢNH & ĐẠO CỤ THÔNG MINH:${isPreHuman ? `
   🚨 CẢNH BÁO ĐẶC BIỆT — KỶ NGUYÊN NÀY CHƯA CÓ CON NGƯỜI (PRE-HUMAN ERA):
   - Kỷ nguyên này (${detectedEra.label}) diễn ra cách đây hàng chục triệu đến hàng tỷ năm trước. LOÀI NGƯỜI CHƯA TỒN TẠI!
   - TUYỆT ĐỐI CẤM (100% FORBIDDEN) trong visualDescription:
     * CẤM TẤT CẢ mô tả người que (stick figure), con người, nhân vật (character), người run rẩy vì rét, người gãi đầu, thám hiểm, nhà khoa học!
     * CẤM trang phục, quần áo, áo choàng, áo tunic, giày dép, mũ snapback!
     * CẤM đền đài Hy Lạp / La Mã (Greek/Roman temples, Parthenon, colonnades, pillars), đường đá, công trình xây dựng, nhà cửa, xe cộ!
   - 100% visualDescription PHẢI LÀ CẢNH THIÊN NHIÊN HOANG SƠ / LÁT CẮT ĐỊA CHẤT / VŨ TRỤ / KHỦNG LONG:
     * Ví dụ: Bề mặt Trái Đất đóng băng tuyết cầu trắng xóa, sông băng nứt toác, khói bụi núi lửa phun trào dung nham đỏ rực, lát cắt địa chất lòng đất sâu 600km, tinh thể khoáng vật, Trái Đất nhìn từ vũ trụ... Luôn ghi rõ: "Pure primeval geological landscape, NO humans, NO stick figures, textless."
   - Trong mảng "elements" của từng slide: TUYỆT ĐỐI KHÔNG dùng bất kỳ asset "pose_*" nào! Chỉ để mảng rỗng [] hoặc dùng biểu tượng khoa học/tự nhiên (sym_warning, sym_lightning, sym_fire, sym_target).` : `
   - CÁC CẢNH HIỆN TƯỢNG KHOA HỌC / ĐỊA CHẤT / CẮT LỚP / VŨ TRỤ (ví dụ: tầng manti, đại dương ngầm 600km, tinh thể khoáng vật, lõi Trái Đất, magma, rãnh sâu, vũ trụ):
     * Trong "visualDescription": MÔ TẢ TRỰC TIẾP MẶT CẮT KHOA HỌC / HIỆN TƯỢNG ĐÓ (ghi rõ "NO characters, pure scientific environment").
     * Trong "elements": KHÔNG CẦN đặt pose người que, chỉ cần đặt biểu tượng (sym_warning, sym_lightning, sym_target, sym_key) hoặc để mảng elements rỗng [] để tôn trọn bức tranh minh hoạ khoa học!
   - CHỈ ĐẶT NGƯỜI QUE ở các cảnh thực sự cần hành động/biểu cảm con người:
     * Khi nói về số liệu / nghiên cứu / suy luận: pose_thinking, prop_notebook, prop_pencil, prop_hourglass.
     * Khi nói về áp lực / nguy hiểm / hiện tượng khắc nghiệt: pose_shocked, pose_stressed, sym_warning, sym_lightning.
     * Khi nói về giải mã / chìa khóa cơ chế: pose_pointing_right, sym_key, sym_target, prop_checklist.
     * Khi đúc kết chân lý / làm chủ kiến thức: pose_celebrating, sym_star, sym_trophy, pose_happy_arms_up.`}`;
  }

  return `═══════════════════════════════════════════════════════
HIGH KNOWLEDGE DENSITY & FACT-BASED EXPLAINER (MANDATORY)
═══════════════════════════════════════════════════════
This video is a genuine educational documentary in the style of Kurzgesagt, Mack, and TED-Ed:
The viewer MUST LEARN REAL KNOWLEDGE, accurate numbers, and scientific mechanisms — STRICTLY ZERO FLUFF, ZERO VAGUE CHATTER, AND ZERO TIME-WASTING FILLER!

1. HIGH INFORMATION DENSITY MANDATE:
   • EVERY SINGLE SLIDE MUST DELIVER A CONCRETE VALUE:
     - Include at least one of: Exact numbers (depth, temperature, pressure, percentages, dates), Scientific terminology, Cause-and-effect biological/physical mechanisms, or Verified research/fossil/DNA evidence.
     - The listener must learn genuine insights about "${topic || 'the topic'}", not empty dramatization.
   • STRICT BAN ON VAGUE FILLER:
     - ⛔ BANNED: "This place is full of terrifying mysteries...", "You won't believe what happens next...", "Let us dive deeper together...", "It makes us wonder...". These say nothing and are completely forbidden!
     - ✅ STATE HARD FACTS AND MECHANISMS:
       * For Nature / Deep Sea / Space: state actual depths (meters), atmospheres (atm), temperatures (°C), biochemical adaptations.
       * For Psychology / Habits: state brain areas (amygdala, prefrontal cortex), neurotransmitters (dopamine, cortisol), cognitive feedback loops.
       * For History / Evolution: state anatomical fossil proof, precise archaeological dates, survival adaptations.

${isShort ? `2. FAST-PACED KNOWLEDGE PROGRESSION (${targetSlides} SLIDES / ${durationLabel}):
   • PHASE 1: HOOK PARADOX & EXPLICIT TOPIC NAMING (Slides 1 to 3, ~6-8s):
     - 🚨 MANDATORY: EXPLICITLY NAME THE TOPIC IN SLIDE 1 OR 2!
       The listener must know immediately what place or subject is being discussed.
       * If the topic is "${topic || 'the topic'}", Slide 1 or 2 MUST explicitly state the exact subject name (e.g. "At the bottom of the Mariana Trench...", "When the Chicxulub asteroid struck...").
       * NEVER speak vaguely without naming the subject (e.g. DO NOT say "At 11,000 meters deep..." or "In a mysterious place..." without ever mentioning the real name!).
     - Open directly with the most astonishing hard metric or counter-intuitive paradox of "${topic || 'the topic'}".
   • PHASE 2: SCIENTIFIC MECHANISM BREAKDOWN (Slides 4 to 18, ~35-40s):
     - Unpack 2 to 3 distinct evidence-backed scientific clues. Explain WHY and HOW it works using vivid analogies.
   • PHASE 3: PROFOUND TAKEAWAY (Slides 19 to ${targetSlides}, ~8-10s):
     - Conclude with a deep factual insight bridging the phenomenon to modern human understanding.` : `2. EXTENDED DOCUMENTARY KNOWLEDGE PROGRESSION (${durationLabel.toUpperCase()} — ${targetSlides.toUpperCase()} CONTINUOUS SLIDES):
   • 🚨 MANDATORY LENGTH: You MUST deliver full ${targetSlides} slides! Do NOT stop early at 20-25 slides!
   • PHASE 1: HOOK & PARADOX (Slides 1 to 5):
     - 🚨 MANDATORY: Name the topic explicitly in Slide 1 or 2.
     - Establish the central evolutionary/scientific mystery.
   • PHASE 2: IN-DEPTH MULTI-CHAPTER BREAKDOWN (Slides 6 through ~85% of script):
     - Structure the script across 4 to 6 continuous chapters (each 15-25 slides):
       + Chapter 1: Environmental catalyst / ancestral survival pressures.
       + Chapter 2: Key physiological, anatomical, or physical mechanisms.
       + Chapter 3: Empirical scientific tests, fossil record, or DNA genetic evidence.
       + Chapter 4: Secondary paradoxes and specialized adaptations.
       + Chapter 5: Counter-arguments, alternative hypotheses, and comparative analysis.
   • PHASE 3: SYNTHESIS & PROFOUND TAKEAWAY (Final 8-12 slides):
     - Unify the clues into a coherent scientific truth and broad perspective.`}

3. SMART VISUAL CHOREOGRAPHY:${isPreHuman ? `
   🚨 SPECIAL ERA RESTRICTION — PRE-HUMAN ERA (NO HUMANS EVER EXISTED):
   - This era (${detectedEra.label}) is set tens of millions to billions of years ago. Humans have NOT evolved yet.
   - STRICTLY FORBIDDEN in visualDescription:
     * NO stick figures, NO humans, NO characters, NO shivering people, NO scratching head, NO explorers!
     * NO clothes, NO tunics, NO cloaks, NO snapback caps!
     * NO Greek/Roman temples, NO colonnades, NO pillars, NO ruins, NO stone plazas, NO cities!
   - 100% visualDescription MUST BE PURE PRIMAL NATURE / GEOLOGICAL CUTAWAYS / SPACE / DINOSAURS:
     * Always end visualDescription with: "Pure primeval geological landscape, NO humans, NO characters, textless."
   - In "elements": STRICTLY ZERO "pose_*" assets! Leave empty [] or use scientific symbols (sym_warning, sym_lightning, sym_target).` : `
   - FOR SCIENTIFIC / GEOLOGICAL / CUTAWAY / COSMIC SLIDES (e.g. Earth mantle at 600km, subterranean ocean, magma, crystals, core, space):
     * In "visualDescription": describe the pure scientific cutaway or environment directly (explicitly state "NO characters").
     * In "elements": omit stick figure poses, use only relevant scientific symbols (sym_warning, sym_lightning, sym_target, sym_key) or leave empty [] to showcase the pure scientific illustration!
   - ONLY INCLUDE STICK FIGURE CHARACTERS when human action/emotion is genuinely relevant:
     * For metrics/investigation: pose_thinking, prop_notebook, prop_pencil, prop_hourglass.
     * For extreme danger/pressure: pose_shocked, pose_stressed, sym_warning, sym_lightning.
     * For core mechanism unlock: pose_pointing_right, sym_key, sym_target.
     * For triumph/takeaway: pose_celebrating, sym_star, sym_trophy.`}`;
}

export function buildImageSlideshowScriptPrompt(input, durationInfo, durationRange = 'under_1m') {
  const isBilingual = false;
  const isVietnamese = (input.narrationLanguage || 'vi') !== 'en';

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
    ? {
      frame: '16:9 landscape (1920×1080 px)', ground: 82, charScale: 1.35, charRange: '1.30 – 1.40',
      laneFarL: 8, laneL: 22, laneR: 78, laneFarR: 92, centerLo: 36, centerHi: 64,
      skyLo: 8, skyHi: 30, groundOK: true
    }
    : {
      frame: '9:16 portrait (1080×1920 px)', ground: 76, charScale: 1.05, charRange: '1.00 – 1.10',
      laneFarL: 12, laneL: 25, laneR: 75, laneFarR: 88, centerLo: 20, centerHi: 80,
      skyLo: 12, skyHi: 32, groundOK: false
    };

  const detectedEra = detectTimeEra({
    explicitEra: input.timeEra,
    title: input.title || '',
    scenario: input.scenario || '',
    fullText: ''
  });

  return `
You are a professional scriptwriter creating a narrated story video using a library of pre-built PNG stick-figure assets.
Your job: write the narration AND choose which assets to place on screen for each slide.

NARRATION STYLE:
- ONE narrator's voiceover (third-person, documentary/storytelling tone) — NOT dialogue between characters.
- The stick figure simply ACTS OUT what the narration describes. It is silent — no speech, no dialogue.

SIMPLE HAND-DRAWN 2D EXPLAINER STYLE (APPLIES TO EVERY visualDescription):
- Describe only the SUBJECT, readable pose, one focal prop, and simple placement. Prefer 1–3 figures and 1–2 props; every frame must be understood in one glance.
- Character design is fixed: a smooth blank white oval head with NO eyes, NO nose, NO mouth; slim black-ink arms and legs; a neat flat-color torso/clothing shape; optional tidy hand-drawn hair or one basic period-specific garment silhouette.
- Make every figure attractive and well-proportioned: consistent oval heads, balanced torso and limb lengths, clean joint connections, simple rounded hands/feet, clear natural poses, and a readable silhouette. Emotion comes from posture and gesture, never facial details.
- Use clean confident black outlines with only slight organic variation, like a polished hand-drawn web explainer cartoon — charming, not messy or crude.
- Use a bright high-key pastel palette of about 5–7 colors across the frame: soft charcoal/navy outlines, clean ivory-white heads, light sky blue, sunny cream/yellow, fresh mint, peach/coral and light blue-grey. Colors should feel cheerful and airy, never dark, muddy or neon. Use one stronger coral/orange focal accent only when needed.
- Background = 2–4 large LIGHT flat color areas only, such as pale-blue sky + sunny-cream wall/land + light-grey ground line. Keep generous bright space. No small decorative details; distant scenery may use one or two simple soft-charcoal silhouettes.
- Flat color fills only. NEVER request gradients, glow, bloom, dramatic/cinematic lighting, 3D, realistic rendering, cel-shaded volume, shadows, highlights, complex texture, atmospheric depth, detailed environments, or detailed facial anatomy.
- No text, labels, speech bubbles, borders, panels, or watermarks inside the generated image.

${buildHumanVoiceGuidance({ isVietnamese })}
${!isVietnamese ? '- Vocabulary constraint: simple A2/B1 English. Short, clear sentences. No advanced expressions.' : '- Ngôn ngữ: tự nhiên, gần gũi, khẩu ngữ. Câu ngắn rõ. Tránh văn viết hàn lâm.'}

${buildMackStickFigureStorytellingGuidance({
    isVietnamese,
    topic: input.scenario,
    G,
    detectedEra,
    durationRange,
    durationInfo,
    targetSlides,
    slideSecondsHint,
  })}

═══════════════════════════════════════════════════════
GHIM MỐC THỜI GIAN & ĐỒNG BỘ KỶ NGUYÊN (TIME ERA PINNING — BẮT BUỘC):
═══════════════════════════════════════════════════════
• KỶ NGUYÊN XÁC ĐỊNH CHO TOÀN BỘ VIDEO: ${detectedEra.label}
• YÊU CẦU THỐNG NHẤT BỐI CẢNH (MANDATORY ERA CONSISTENCY):
  - ${detectedEra.directive}
  - MỌI câu mô tả "visualDescription" cho từng slide PHẢI TUÂN THỦ kỷ nguyên này!
${detectedEra.isPreHuman ? `  - 🚨 ĐÂY LÀ THỜI KỲ CHƯA CÓ CON NGƯỜI (PRE-HUMAN ERA):
    * TUYỆT ĐỐI CẤM (100% FORBIDDEN): KHÔNG mô tả bất kỳ người que (stick figure), con người, nhân vật, người run rẩy, người gãi đầu, quần áo, áo choàng, áo tunic, hay đền đài Hy Lạp/La Mã cổ đại nào trong visualDescription!
    * visualDescription của MỌI SLIDE PHẢI LÀ CẢNH ĐỊA CHẤT / VŨ TRỤ / THIÊN NHIÊN NGUYÊN SINH HOẶC KHỦNG LONG KHÔNG CÓ NGƯỜI!
    * Trong mảng "elements" của mọi slide: CẤM DÙNG các asset "pose_*", chỉ dùng mảng rỗng [] hoặc biểu tượng khoa học!` : `  - TUYỆT ĐỐI KHÔNG để lẫn lộn thời đại (ví dụ: đang kể về thời Khủng Long Chicxulub hay Kỷ Băng Hà thì CẤM TUYỆT ĐỐI mô tả xe cộ, ô tô, đường nhựa, nhà gạch hiện đại, quần jeans, áo hoodie!).`}

═══════════════════════════════════════════════════════
QUY TẮC ĐỒNG BỘ KIỂU NHÂN VẬT XUYÊN SUỐT TOÀN BỘ VIDEO (100% UNIFIED CHARACTER STYLE):
═══════════════════════════════════════════════════════
• KIỂU NHÂN VẬT ĐÃ CHỌN: ${(input.characterStyle || 'stick_figure') === 'regular_human' ? 'NGƯỜI THƯỜNG HOẠT HỌA 2D (Stylized 2D Cartoon Human)' : 'NGƯỜI QUE BIỂU CẢM (Cartoon Stick Figure)'}
🚨 BẮT BUỘC ĐỒNG BỘ 100% XUYÊN SUỐT MỌI SLIDE:
- TUYỆT ĐỐI CẤM (100% FORBIDDEN): KHÔNG ĐƯỢC LÚC NÀY LÚC KIA! Không được cảnh trước vẽ người que, cảnh sau lại mô tả người thường tả thực (caveman, Neanderthal tả thực, người thật)!
${(input.characterStyle || 'stick_figure') === 'regular_human' ? `
- MỌI cảnh có nhân vật: Trong "visualDescription" BẮT BUỘC mô tả là "a stylized 2D cartoon human [caveman / hunter / scientist / explorer / child / student]".
- TUYỆT ĐỐI KHÔNG dùng từ "stick figure" hay "stickman"! Mọi con người đều phải là người hoạt họa 2D hoàn chỉnh thống nhất từ đầu đến cuối.` : `
- MỌI cảnh có nhân vật: Trong "visualDescription" BẮT BUỘC mô tả rõ là "a simple faceless hand-drawn 2D stick figure with a blank white oval head and thin black line limbs".
- Khuôn mặt phải để trắng hoàn toàn: không mắt, không mũi, không miệng. Đầu oval đều và đẹp; tỉ lệ đầu, thân, tay chân cân đối; khớp nối sạch; bàn tay/bàn chân bo tròn đơn giản; dáng đứng/ngồi tự nhiên. Thân/quần áo là một mảng màu pastel phẳng gọn; tóc là vài nét vẽ có chủ ý, không rối. Nếu cần chỉ nghề nghiệp/thời đại, dùng đúng MỘT đạo cụ hoặc dáng áo nhận diện.
- DÙ KỂ VỀ THỜI ĐỒ ĐÁ, NGƯỜI VƯỢN HAY HIỆN ĐẠI: mọi con người đều phải giữ cùng kiểu người que nét vẽ 2D này. Không dùng từ trống như "caveman" hoặc "scientist" nếu chưa có tiền tố "simple hand-drawn 2D stick figure".`}

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

DURATION & PACING (NHỊP DỒN DẬP - NHIỀU ẢNH):
- Target total video duration: ${durationInfo.label} (~${durationInfo.targetSeconds} seconds total).
- BẮT BUỘC: chia kịch bản thành ${targetSlides} phân đoạn (tương ứng ${targetSlides} ảnh/slide) liên tục.
${durationRange === 'under_1m'
      ? `- Với video 1 phút (under_1m): BẮT BUỘC tạo 20 đến 25 ảnh/phân đoạn, nhịp chuyển cảnh dồn dập, trung bình mỗi ảnh hiển thị ${slideSecondsHint}.`
      : `- Với video dài ${durationInfo.label}: BẮT BUỘC tạo đủ ${targetSlides} phân đoạn (tương ứng ${targetSlides} ảnh/slide) liên tục phân bố đều qua các chương chuyên sâu, trung bình mỗi ảnh hiển thị ${slideSecondsHint}. KHÔNG ĐƯỢC dừng sớm ở 20-25 slide!`
    }
- Thời lượng đọc mỗi segment: ${slideSecondsHint}.
- QUY TẮC ĐỘ DÀI LỜI NÓI (CỰC KỲ QUAN TRỌNG): Để đảm bảo mỗi ảnh lướt nhanh từ ${slideSecondsHint}, câu thoại/thuyết minh (dialogueOrNarration) của mỗi phân đoạn PHẢI rất ngắn gọn, cô đọng (chỉ khoảng 6 đến 12 từ mỗi segment), nói dứt khoát chuyển cảnh liên tục. Tuyệt đối không viết câu dài dòng làm chậm nhịp video.
- QUY TẮC NÓI LIỀN MẠCH, KHÔNG PHẨY VỤN: Mỗi phân đoạn vốn đã rất ngắn gọn (6 đến 12 từ), do đó câu văn PHẢI nói liền mạch trong một hơi, tự nhiên trôi chảy. TUYỆT ĐỐI KHÔNG chèn dấu phẩy vụn vặt cắt đôi câu ngắn (ví dụ SAI: "Sau một tuần, mức nhiệt trung bình, giảm xuống âm 17 độ C." -> ĐÚNG: "Sau một tuần, mức nhiệt trung bình giảm xuống âm 17 độ C."). Chỉ dùng dấu phẩy khi câu thực sự dài hoặc có 2 vế rõ ràng; tuyệt đối không ngắt giữa chủ ngữ và vị ngữ làm giọng đọc giật cục khó chịu.

USER'S TOPIC:
"${input.scenario || 'No specific topic given'}"
Draft content / narration suggestion (if any):
"${input.script || 'Freely write a natural narration about this topic'}"

NARRATION GUIDELINES (BẮT BUỘC ĐẬM ĐẶC TRI THỨC & GỌI ĐÍCH DANH CHỦ THỂ):
1. 🚨 BẮT BUỘC GỌI ĐÍCH DANH TÊN CHỦ THỂ NGAY TỪ SLIDE 1-2 (MANDATORY TOPIC NAMING):
   - NGUYÊN TẮC CỐT LÕI: Khán giả xem video phải biết ngay mình đang nghe về cái gì!
   - Ngay ở Slide 1 (hoặc muộn nhất Slide 2), câu thuyết minh (dialogueOrNarration) BẮT BUỘC PHẢI CHỨA TỪ KHÓA CHÍNH / TÊN ĐÍCH DANH của chủ đề: "${input.scenario || 'No specific topic given'}".
     * Đang nói về "Rãnh Mariana" thì Slide 1 PHẢI xướng tên "Rãnh Mariana" (ví dụ: "Dưới đáy vực sâu 11.000m của Rãnh Mariana..."), TUYỆT ĐỐI KHÔNG nói trống không "Ở độ sâu 11.000m..." mà người xem không biết là ở đâu!
     * Đang nói về "Thiên thạch Chicxulub" thì Slide 1 PHẢI gọi tên "Thiên thạch Chicxulub"!
     * Đang nói về "Tuyết Cầu Trái Đất" thì Slide 1 PHẢI gọi tên "Kỷ Tuyết Cầu Trái Đất"!
     * Đang nói về "Hội chứng Brain Rot" thì Slide 1 PHẢI gọi tên "Hội chứng Brain Rot"!
   - Trong suốt các slide tiếp theo và kết bài, tiếp tục gắn liền các cơ chế giải thích với tên chủ thể để người xem luôn nắm rõ mạch truyện và bối cảnh.
2. MỖI CÂU NÓI PHẢI CUNG CẤP KIẾN THỨC THỰC THỤ:
   - Viết chính xác theo chủ đề: "${input.scenario || 'No specific topic given'}".
   - Khán giả xem để HỌC HỎI ĐIỀU MỚI. Tuyệt đối KHÔNG viết chung chung, cảm thán suông ("nơi này rất đáng sợ", "điều này thật bí ẩn", "bạn có biết không").
   - Mỗi phân đoạn PHẢI chứa: con số đo đạc, thuật ngữ khoa học/y học/lịch sử, cơ chế sinh học/vật lý/tâm lý cụ thể, hoặc bằng chứng thực nghiệm giải thích vì sao hiện tượng xảy ra.
   - Bỏ toàn bộ các câu dạo đầu dẫn chuyện lan man; mỗi slide đưa ra MỘT sự thật/chi tiết kiến thức mới mẻ.
3. ${isVietnamese
      ? 'Lời thuyết minh (dialogueOrNarration) PHẢI bằng tiếng Việt tự nhiên, súc tích, gãy gọn — như một chuyên gia khoa học thông minh đang giải thích ngắn gọn, cuốn hút.'
      : 'Content MUST be in simple, basic English (A2/B1). Short, impactful, highly factual sentences.'}
4. ${isVietnamese
      ? 'Phụ đề (subtitle): CHỈ viết ĐƠN NGỮ TIẾNG VIỆT (1 dòng duy nhất, khớp với lời thuyết minh). TUYỆT ĐỐI KHÔNG thêm dòng dịch tiếng Anh, KHÔNG có ký tự "\\n" xuống dòng dịch phụ đề.'
      : 'Subtitle (subtitle): ENGLISH ONLY (single line matching narration). Strictly DO NOT include any Vietnamese translation line, DO NOT include "\\n".'}
5. Do NOT include emotion tags like [sighs], [softly], [pause] — they have no effect and just clutter the text.
6. ${buildPunctuationRhythmGuidance()}
7. CRITICAL RULE FOR "visualDescription" (MINH HOẠ CHUẨN XÁC NỘI DUNG KHOA HỌC & ĐÚNG KỶ NGUYÊN):
${detectedEra.isPreHuman ? `🚨 ĐẶC BIỆT: VÌ ĐÂY LÀ KỶ NGUYÊN CHƯA CÓ LOÀI NGƯỜI (${detectedEra.label}):
- 100% CÁC CẢNH PHẢI LÀ THIÊN NHIÊN / ĐỊA CHẤT / VŨ TRỤ HOẶC KHỦNG LONG HOÀN TOÀN KHÔNG CÓ BẤT KỲ CON NGƯỜI NÀO!
- TUYỆT ĐỐI CẤM (100% FORBIDDEN): KHÔNG mô tả người que, con người, nhân vật, người run rẩy, người gãi đầu, quần áo tunic, và KHÔNG mô tả đền đài Hy Lạp/La Mã cổ đại, cột đá, công trình xây dựng!
- Mỗi slide visualDescription đều kết thúc bằng: "Pure primeval geological landscape, NO humans, NO stick figures, textless."` : `- TUYỆT ĐỐI KHÔNG BẮT BUỘC CẢNH NÀO CŨNG PHẢI CÓ NGƯỜI QUE!
  * Khi lời thuyết minh nói về cấu trúc địa chất, hiện tượng tự nhiên, vũ trụ, lớp đất đá, đại dương, phân tử, đồ thị, mặt cắt Trái Đất (ví dụ: tầng manti sâu 600km, đại dương ngầm, tinh thể ringwoodite, dung nham magma, mảng kiến tạo, rãnh Mariana, từ trường Trái Đất, vụ nổ Big Bang, thiên thạch, vành đai bức xạ):
    -> MÔ TẢ TRỰC DIỆN CẢNH KHOA HỌC / MẶT CẮT / HIỆN TƯỢNG ĐÓ KHÔNG CÓ NGƯỜI (ví dụ: "Scientific cutaway diagram of Earth's crust and mantle down to 600km depth showing glowing blue subterranean water crystals trapped inside porous mantle rock, glowing magma below. Pure geological cross-section, NO characters, NO people, textless.").
  * CHỈ cho nhân vật người que xuất hiện ở những cảnh thực sự cần con người:
    -> Nhà khoa học đang quan sát kính hiển vi/máy đo, người tiền sử chế tạo công cụ, nhân vật biểu cảm kinh ngạc/áp lực, hoặc so sánh kích thước con người với hiện tượng khổng lồ.
  * TỈ LỆ PHÂN BỔ: Khoảng 40% đến 50% số cảnh khoa học nên là cảnh mặt cắt khoa học, vũ trụ, địa chất hoặc hiện tượng thuần túy (NO character), giúp video đậm chất tài liệu khoa học chuyên nghiệp giống Kurzgesagt và Mack!`}
- STRICT PROHIBITION: The image generator must produce 100% textless illustrations. DO NOT include any dialogue, speech bubbles, thought bubbles, words, letters, or caption bars in "visualDescription". Describe ONLY the physical visual scene.

═══════════════════════════════════════════════════════
RETURN FORMAT — raw JSON only, no markdown code fences
═══════════════════════════════════════════════════════

{
  "title": "${isVietnamese ? 'Bí Ẩn Sinh Học Ở Rãnh Sâu Đại Dương Mariana' : 'The Deepest Ocean Trench Biological Mysteries'}",
  "segments": [
    {
      "segmentNumber": 1,
      "layout": "default",
      "visualDescription": "Simple hand-drawn 2D cutaway of the Mariana Trench using clean charcoal outlines, layered light sky-blue water bands, pale blue-grey seabed and one coral pressure symbol, bright pastel flat colors only.",
      "dialogueOrNarration": "${isVietnamese ? 'Ở độ sâu 11.000 mét tại rãnh Mariana, ánh sáng mặt trời biến mất hoàn toàn.' : 'At 11,000 meters deep in the Mariana Trench, sunlight completely vanishes.'}",
      "subtitle": "${isVietnamese ? 'Ở độ sâu 11.000m tại rãnh Mariana, ánh sáng mặt trời biến mất hoàn toàn.' : 'At 11,000 meters deep in the Mariana Trench, sunlight completely vanishes.'}",
      "durationSeconds": 2.5,
      "elements": [
        { "asset": "sym_warning", "x": ${G.laneR}, "y": 20, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.4 }
      ]
    },
    {
      "segmentNumber": 2,
      "layout": "caption-left",
      "visualDescription": "A polished faceless hand-drawn 2D stick figure with a smooth blank ivory oval head, balanced slim charcoal limbs and a mint torso bends naturally under one coral pressure slab; pale-blue background and light-grey ground, clean outlines, bright flat colors.",
      "dialogueOrNarration": "${isVietnamese ? 'Áp suất tại đây lên tới 1.000 atmosphere, tương đương 50 máy bay đè lên đầu.' : 'Water pressure reaches 1,000 atmospheres, equal to 50 jumbo jets on your head.'}",
      "subtitle": "${isVietnamese ? 'Áp suất lên tới 1.000 atmosphere, tương đương 50 máy bay đè lên đầu.' : 'Water pressure reaches 1,000 atmospheres, equal to 50 jumbo jets on your head.'}",
      "durationSeconds": 2.5,
      "elements": [
        { "asset": "pose_stressed", "x": 50, "y": ${G.ground}, "scale": ${G.charScale}, "anchor": "bottom", "zIndex": 2, "flip": false, "delay": 0 },
        { "asset": "sym_lightning", "x": ${G.laneR}, "y": 25, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.3 }
      ]
    },
    {
      "segmentNumber": 3,
      "layout": "caption-left",
      "visualDescription": "A simple hand-drawn diagram of three ivory molecule circles forming a shield around one coral protein coil, clean charcoal outlines over two large pale-blue background bands, bright flat colors only.",
      "dialogueOrNarration": "${isVietnamese ? 'Sinh vật nơi đây sống được nhờ hợp chất TMAO bảo vệ cấu trúc tế bào.' : 'Creatures survive here thanks to TMAO molecules protecting cellular structures.'}",
      "subtitle": "${isVietnamese ? 'Sinh vật nơi đây sống sót nhờ hợp chất TMAO bảo vệ cấu trúc tế bào.' : 'Creatures survive here thanks to TMAO molecules protecting cellular structures.'}",
      "durationSeconds": 3,
      "elements": [
        { "asset": "sym_key", "x": ${G.laneR}, "y": 25, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.3 }
      ]
    },
    {
      "segmentNumber": 4,
      "layout": "default",
      "visualDescription": "A polished faceless hand-drawn 2D scientist stick figure with a smooth blank ivory oval head and balanced slim limbs looks naturally through one small telescope at an ivory moon; light sky-blue background, sunny-cream ground and clean charcoal outlines.",
      "dialogueOrNarration": "${isVietnamese ? 'Khám phá này giúp con người mở ra hy vọng tìm thấy sự sống trên mặt trăng Europa.' : 'This discovery gives scientists hope of finding life on Jupiter ocean moon Europa.'}",
      "subtitle": "${isVietnamese ? 'Khám phá này mở ra hy vọng tìm thấy sự sống trên mặt trăng Europa.' : 'This discovery gives scientists hope of finding life on Jupiter ocean moon Europa.'}",
      "durationSeconds": 3,
      "elements": [
        { "asset": "pose_celebrating", "x": 50, "y": ${G.ground}, "scale": ${G.charScale}, "anchor": "bottom", "zIndex": 2, "flip": false, "delay": 0 },
        { "asset": "sym_star", "x": ${G.laneR}, "y": 20, "scale": 0.5, "anchor": "center", "zIndex": 4, "flip": false, "delay": 0.3 }
      ]
    }
  ],
  "thumbnail": {
    "visualDescription": "Bright polished hand-drawn 2D explainer-cartoon thumbnail with 1–3 attractive well-proportioned faceless stick figures, smooth blank ivory oval heads, balanced slim charcoal limbs, one clear focal prop, 5–7 airy pastel flat colors, two light background bands, clean confident outlines, no text.",
    "headlineText": "CATCHY HOOK TEXT!"
  }
}
`;
}
