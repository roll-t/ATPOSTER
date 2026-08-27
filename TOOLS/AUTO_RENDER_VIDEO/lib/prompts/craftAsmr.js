/**
 * Bộ sinh prompt cho dòng video ASMR/satisfying "chế tác thủ công": lấy MỘT vật liệu phế liệu
 * (vỏ lon, ống nhựa, gỗ vụn...) cắt gọt thành MỘT mô hình/nhân vật, quay dọc, nhịp quick-cut.
 * Khác hẳn mọi category còn lại trong app: đầu ra KHÔNG đi qua Remotion, không có TTS, không có
 * phân đoạn ảnh — nó là văn bản để dán thẳng vào công cụ sinh video (Veo/Sora/Kling), nên nó sống
 * ở tab riêng chứ không nằm trong PROMPT_CATEGORIES.
 *
 * VÌ SAO TÁCH LÀM 2 NỬA (Gemini + JS):
 * Cái làm nên chất lượng của dòng prompt này là bộ KHUNG cố định — mốc thời gian chuẩn, khối
 * "yêu cầu bắt buộc về tính nhất quán vật liệu", quy ước số bước lắp ghép / số pose. Nếu để Gemini
 * viết cả khung, mỗi lần sinh ra một kiểu: lệch mốc giây, quên khối nhất quán, đổi số bước. Nên:
 * Gemini CHỈ trả về phần phụ thuộc chủ đề (tên bộ phận, thao tác cắt, thao tác ghép, pose), còn
 * buildCraftAsmrClips() ráp khung và tự tính mốc thời gian. Khung không bao giờ trôi.
 *
 * VÌ SAO CÓ "NHIỀU CLIP" (clipCount):
 * Mọi công cụ sinh video hiện tại đều chặn ~8-10 giây mỗi lượt. Muốn một video 30 giây thì phải
 * sinh 3 lượt rồi ghép. Vấn đề: mỗi lượt sinh là một lần model "tưởng tượng lại từ đầu" — đổi
 * sắc vật liệu, đổi bàn tay, đổi ánh sáng, và tệ nhất là đổi luôn hình dạng mô hình đang lắp dở.
 * Nên khi clipCount > 1, mỗi clip nhận thêm:
 *   1. Khối ⚠️ nhất quán vật liệu LẶP LẠI NGUYÊN VĂN (không diễn đạt lại) — cùng một câu chữ thì
 *      model cho ra cùng một chất liệu; đổi chữ là đổi kết quả.
 *   2. Khối 🔗 NỐI CLIP: mô tả CHÍNH XÁC khung hình đầu (= khung cuối của clip trước) và khung
 *      hình cuối phải dừng ở đâu.
 *   3. Mốc thời gian tính lại từ 0 cho TỪNG clip — model chỉ nhìn thấy cửa sổ 10 giây của nó,
 *      ghi "20-30s" vào prompt clip 3 chỉ làm nó bối rối.
 * Thủ thuật quan trọng nhất nằm ở khung nối: mỗi clip kết thúc bằng "hai tay rút hẳn khỏi khung,
 * máy quay tĩnh" — nhờ vậy khung cuối clip N và khung đầu clip N+1 gần như trùng khít, vết cắt
 * biến mất kể cả khi model có lệch nhẹ.
 */

import { fmt, fmt1, clamp, buildClipPlan, previousEndAct, sliceBeats, inlineText } from './clipPlan.js';

export const CRAFT_ASMR_CLIP_DURATIONS = [8, 10, 12];

export const CRAFT_ASMR_CLIP_COUNTS = [
  { value: 1, label: '1 clip — video ngắn, sinh 1 lượt' },
  { value: 2, label: '2 clip — nối lại thành video dài gấp đôi' },
  { value: 3, label: '3 clip — nối lại thành video dài gấp ba' },
];

export const CRAFT_ASMR_ASPECT_RATIOS = [
  { value: '9:16', label: '📱 Dọc 9:16 (TikTok / Shorts / Reels)', orientationWord: 'dọc' },
  { value: '16:9', label: '💻 Ngang 16:9 (YouTube)', orientationWord: 'ngang' },
  { value: '1:1', label: '⬜ Vuông 1:1 (Feed)', orientationWord: 'vuông' },
];

export const CRAFT_ASMR_FPS = [24, 30];

/**
 * ĐỘ THÔ MỘC — cái nút quan trọng nhất của cả bộ prompt này.
 *
 * Mặc định của mọi model sinh ảnh/video khi nghe "mô hình rồng bằng kim loại" là vẽ ra một BỘ MÔ
 * HÌNH KIM LOẠI 3D CẮT LASER BÁN SẴN: hàng trăm chiếc vảy nhỏ đều tăm tắp, mép cắt hoàn hảo, hai
 * cánh đối xứng tuyệt đối. Đẹp, nhưng sai hoàn toàn tinh thần "cắt tay từ vỏ lon" — người xem nhìn
 * là biết ngay không phải đồ tự làm, và cả video mất giá trị.
 *
 * Cách chữa hiệu quả nhất không phải là mô tả thêm cái đúng, mà là GỌI TÊN CÁI SAI: nói thẳng
 * "đây KHÔNG phải bộ mô hình kim loại cắt laser" rồi ép các đặc điểm ngược lại — ít mảnh, mảnh to,
 * mép răng cưa, vênh, lệch, mối ghép lộ. Đó là nội dung các khối bên dưới.
 */
export const CRAFT_ASMR_FIDELITY = {
  /**
   * Phong cách của dòng video "mô hình lon" thật sự đang viral — dựng theo ảnh mẫu người dùng đưa
   * (T-Rex đỏ từ vỏ lon). Nó KHÔNG phải "thô mộc" mà cũng không phải "mô hình cắt laser":
   *
   *   - Thân ghép từ các TẤM nhôm cong, nhẵn, như vỏ máy bay mô hình — không móp, không nhàu.
   *   - ĐINH TÁN BẠC LỘ THIÊN ở mọi mối nối. Đây là dấu hiệu nhận dạng mạnh nhất của cả phong cách.
   *   - Chia ĐỐT ở đuôi và chi, trông như khớp cử động được.
   *   - Hai tông ĐỎ–BẠC: sơn lon còn bóng ở mảng lớn, nhôm trần lộ ở răng/vuốt/gai/mép cắt.
   *
   * Vì sao phải tách khỏi 'handmade': handmade ép móp méo, nhàu nát, giọt keo, 5 mảnh to, hình
   * khối 2.5D — áp vào đây sẽ phá đúng những thứ làm nên phong cách này (bề mặt sạch, nhiều tấm,
   * mối ghép cơ khí gọn). Hai cái là hai thể loại khác nhau, không phải hai nấc của một thang.
   */
  riveted: {
    value: 'riveted',
    label: '🔩 Tấm nhôm ghép đinh tán — kiểu mô hình lon thật (khuyên dùng)',
    partsRange: '8 đến 12',
    partSizeHint:
      'mỗi bộ phận là MỘT TẤM NHÔM CONG hoặc MỘT ĐỐT ống, cỡ 2-6cm, sẽ được ghép với nhau bằng đinh tán lộ thiên — không phải một cụm vảy nhỏ',
    geminiNote:
      'PHONG CÁCH CHẾ TÁC — TẤM GHÉP ĐINH TÁN: mô hình được dựng như vỏ máy bay mô hình thu nhỏ. Thân/chi/đuôi chia thành các TẤM nhôm cong nhẵn và các ĐỐT ống, ghép với nhau bằng ĐINH TÁN NHỎ BẠC LỘ THIÊN tại mọi mối nối (đây là đặc điểm nhận dạng, phải xuất hiện dày đặc). Đuôi và các chi chia thành nhiều đốt nối tại điểm xoay, trông như khớp cử động được. Các chi tiết nhọn (răng, vuốt, gai lưng, sừng) là những mảnh tam giác nhỏ bằng NHÔM BẠC TRẦN cắt sắc, gắn thành hàng đều — tương phản với các mảng lớn giữ nguyên lớp sơn đỏ bóng của vỏ lon. Vì vậy: "accessories" phải là đinh tán/ốc vít mini bằng kim loại (không phải dây buộc hay keo); các bước lắp ghép phải là bấm/tán đinh, chồng mép tấm, luồn trục xoay — không phải dán keo; bề mặt thành phẩm SẠCH và bóng, không móp méo nhàu nát.',
    promptBlock: [
      '',
      '🔩 PHONG CÁCH CHẾ TÁC — TẤM NHÔM GHÉP ĐINH TÁN (BẮT BUỘC, quan trọng ngang khối vật liệu ở trên):',
      '* Mô hình được dựng theo lối VỎ MÁY BAY MÔ HÌNH: thân, chi và đuôi chia thành các TẤM nhôm cong ghép chồng mép lên nhau, mỗi tấm cỡ 2-6cm, bề mặt NHẴN và cong đều.',
      '* ĐINH TÁN BẠC LỘ THIÊN LÀ ĐẶC ĐIỂM NHẬN DẠNG: đầu đinh tán tròn nhỏ màu bạc phải nhìn thấy rõ ở MỌI mối nối giữa các tấm, đặt đều đặn dọc theo các đường ghép. Đây là chi tiết không được thiếu.',
      '* CHIA ĐỐT, TRÔNG CỬ ĐỘNG ĐƯỢC: đuôi gồm nhiều đốt vòng thuôn nhỏ dần; các chi gồm những ống/tấm ngắn nối nhau tại điểm xoay có đinh tán làm trục. Nhìn vào phải có cảm giác đây là mô hình khớp động, không phải một khối liền.',
      '* HAI TÔNG ĐỎ–BẠC: các mảng lớn giữ nguyên lớp SƠN ĐỎ BÓNG của vỏ lon; nhôm BẠC TRẦN lộ ra ở răng, vuốt, gai lưng, đầu đinh tán và toàn bộ mép cắt. Sự tương phản đỏ–bạc này là linh hồn của phong cách.',
      '* Chi tiết nhọn (răng, vuốt, gai lưng, sừng) là các mảnh TAM GIÁC NHỎ bằng nhôm bạc trần, cắt sắc, gắn thành hàng đều nhau.',
      '* BỀ MẶT SẠCH: sơn đỏ còn bóng, chỉ vài vết xước nhỏ tự nhiên. KHÔNG móp méo, KHÔNG nhàu nát, KHÔNG giọt keo lem, KHÔNG rỉ sét.',
      '* Số mảnh ở mức VỪA: khoảng 15-25 tấm/đốt nhìn đếm được. Không phải 5 mảnh to thô, cũng không phải hàng trăm vảy li ti đều tăm tắp kiểu mô hình cắt laser bán sẵn.',
      '* Vẫn là ĐỒ TỰ LÀM: các tấm không đối xứng tuyệt đối, khoảng cách đinh tán không đều răm rắp, vài mép cắt hơi lệch — nhìn kỹ mới thấy, chứ không lộ liễu.',
    ],
  },

  handmade: {
    value: 'handmade',
    label: '🪵 Thủ công thô mộc — ít mảnh, to bản, vụng về có duyên',
    partsRange: '5 đến 7',
    partSizeHint: 'MỖI bộ phận là MỘT MẢNH LỚN cỡ 3-8cm cắt ra từ thân lon, không phải một cụm mảnh nhỏ ghép lại',
    geminiNote:
      'ĐỘ THÔ MỘC: đây là đồ CẮT TAY BẰNG KÉO từ vỏ lon, KHÔNG phải bộ mô hình kim loại 3D cắt laser bán sẵn. Vì vậy: tổng số mảnh phải ÍT và mỗi mảnh phải TO; mọi chi tiết dạng vảy/lông/răng cưa đều tạo bằng cách CẮT KHÍA vào mép của một mảnh lớn chứ KHÔNG ghép từ hàng chục mảnh nhỏ rời; các thao tác lắp ghép là gập tai, chồng mép, xoắn dây, chấm keo — thô và nhìn thấy được, không phải khớp mộng khít như đúc. Khi mô tả thành phẩm, hãy tả một vật ĐƠN GIẢN, hơi vụng, có nét duyên của đồ tự làm — đừng tả một mô hình tinh xảo.',
    promptBlock: [
      '',
      '🪵 ĐỘ THÔ MỘC — ĐỒ CẮT TAY THẬT (BẮT BUỘC, quan trọng ngang khối vật liệu ở trên):',
      '* Đây là đồ CẮT TAY TỪ VỎ LON bằng kéo, KHÔNG PHẢI bộ mô hình kim loại 3D cắt laser bán sẵn. Nếu nhìn vào mà nghĩ "cái này mua ở tiệm mô hình" thì đã SAI hoàn toàn.',
      '* ÍT MẢNH VÀ MẢNH TO: cả mô hình chỉ ghép từ 5-8 mảnh lớn, mỗi mảnh cỡ 3-8cm — đủ to để nhìn là biết vừa cắt ra từ thân một cái lon. TUYỆT ĐỐI KHÔNG có hàng trăm vảy nhỏ đều tăm tắp, không có hàng chục mảnh vụn li ti giống nhau.',
      '* Chi tiết dạng vảy / gai / lông / răng cưa phải tạo bằng cách CẮT KHÍA hoặc BẺ GẬP mép của một mảnh lớn, không phải ghép từng mảnh nhỏ rời lại với nhau.',
      // "răng cưa nhỏ" ở bản trước bị model thổi thành mép sứt sẹo dày cộm như tôn bị xé. Với tấm
      // 0.1mm thì ba-via chỉ cỡ vụn giấy, và cả đường mép phải đọc ra là một VẠCH, không phải một mặt.
      '* Mọi đường cắt là đường KÉO CẮT TAY: hơi run, không thẳng tuyệt đối, chỗ lẹm chỗ dư. Nhưng mép vẫn phải MỎNG — ba-via chỉ li ti cỡ vụn giấy, giống mép giấy bị xé hơn là mép tôn dày bị nghiến.',
      '* Tấm kim loại MỎNG và MỀM: cầm một đầu là oặt xuống, rung khi lắc, bẻ cong được bằng tay không cần dụng cụ. Nó vẫn NHỚ độ cong của vỏ lon nên bề mặt hơi vênh và gợn sóng, không phẳng lì; có vết móp, nếp gấp, vết xước và dấu vân tay.',
      '* Lớp sơn/in gốc của lon còn sót lại không đều: chỗ đậm chỗ nhạt, chỗ tróc lộ nhôm bạc bên dưới, vệt xước bạc chạy ngang thân.',
      '* Mối ghép LỘ RÕ VÀ THÔ: tai gập quặp lại, hai mảnh chồng mép lên nhau, dây kim loại xoắn nút, giọt keo còn nhìn thấy. Không có mối nối vô hình, không có khớp khít như đúc khuôn.',
      '* KHÔNG ĐỐI XỨNG TUYỆT ĐỐI: hai bên trái/phải lệch nhau chút ít về kích thước, góc và độ cong — đồ cắt tay không bao giờ đối xứng hoàn hảo.',
      '* Hình khối tổng thể ĐƠN GIẢN HOÁ, thiên về các tấm phẳng ghép lại (2.5D) hơn là một pho tượng đầy đặn nhiều chi tiết.',
    ],
  },

  balanced: {
    value: 'balanced',
    label: '⚖️ Cân bằng — gọn gàng nhưng vẫn thấy dấu tay',
    partsRange: '6 đến 8',
    partSizeHint: 'mỗi bộ phận là một mảnh cỡ 2-6cm cắt ra từ thân lon',
    geminiNote:
      'ĐỘ THÔ MỘC: đồ thủ công làm khéo nhưng vẫn là cắt tay — số mảnh vừa phải, không chi li tới mức như mô hình công nghiệp cắt laser.',
    promptBlock: [
      '',
      '🪵 ĐỘ THÔ MỘC — THỦ CÔNG LÀM KHÉO (BẮT BUỘC):',
      '* Đồ cắt tay làm cẩn thận, KHÔNG phải bộ mô hình kim loại cắt laser bán sẵn.',
      '* Số mảnh vừa phải (6-10 mảnh nhìn đếm được), không có hàng trăm chi tiết vụn giống hệt nhau.',
      '* Mép cắt gọn nhưng vẫn thấy dấu kéo tay; bề mặt còn vết xước nhẹ và chút vênh của vỏ lon.',
      '* Mối ghép chắc chắn nhưng vẫn nhìn ra được (mép chồng, tai gập, dây xoắn); hai bên trái phải lệch nhau rất nhẹ.',
    ],
  },

  refined: {
    value: 'refined',
    label: '💎 Tinh xảo — như mô hình kim loại bán sẵn',
    partsRange: '6 đến 10',
    partSizeHint: 'mỗi bộ phận là một mảnh hoặc cụm mảnh cắt ra từ thân lon',
    geminiNote: '',
    promptBlock: [],
  },
};

export const CRAFT_ASMR_FIDELITY_OPTIONS = Object.values(CRAFT_ASMR_FIDELITY).map((f) => ({
  value: f.value,
  label: f.label,
}));

export const CRAFT_ASMR_DEFAULTS = {
  durationSeconds: 10,
  clipCount: 1,
  aspectRatio: '9:16',
  fps: 24,
  fidelity: 'riveted',
};

function resolveFidelity(key) {
  return CRAFT_ASMR_FIDELITY[key] || CRAFT_ASMR_FIDELITY[CRAFT_ASMR_DEFAULTS.fidelity];
}

/**
 * 4 HỒI của khuôn, kèm trọng số thời lượng. Bộ số 10/40/30/20 lấy đúng từ bản mẫu 10 giây đã được
 * kiểm chứng (0-1s cắt phôi, 1-5s tạo hình, 5-8s lắp ghép, 8-10s khoe thành phẩm) — giữ nguyên để
 * video 1 clip vẫn ra y hệt như trước khi có tính năng nhiều clip.
 */
const ACTS = {
  A: { title: null, kind: 'paragraph', weight: 10 }, // title lấy từ spec.scene1Title
  B: { title: 'VẼ MẪU, CẮT THÀNH PHẦN, SHOW TOÀN BỘ', kind: 'beats', weight: 40 },
  C: { title: 'LẮP GHÉP', kind: 'beats', weight: 30, beatWord: 'bước' },
  D: { title: 'CẦM TRÊN TAY, POSE DÁNG, KẾT', kind: 'intro+beats', weight: 20, beatWord: 'pose' },
};

/**
 * Hồi nào rơi vào clip nào. Ranh giới clip LUÔN trùng ranh giới hồi — đó là điều kiện để mô tả
 * được "khung hình cuối clip" bằng một trạng thái bàn rõ ràng (mảnh đã cắt xong / mô hình đã lắp
 * xong). Nếu cắt giữa hồi thì trạng thái bàn là một khoảnh khắc dở dang, gần như không tả nổi cho
 * model hiểu, và clip sau chắc chắn lệch.
 */
const CLIP_PLANS = {
  1: [['A', 'B', 'C', 'D']],
  2: [['A', 'B'], ['C', 'D']],
  3: [['A', 'B'], ['C'], ['D']],
};

// fmt/fmt1/clamp + phép chia thời lượng nằm ở clipPlan.js — dùng chung với cozyStopMotion.js để
// hai dòng video không lệch nhịp nhau khi một bên chỉnh cách chia.

/**
 * Số nhịp của từng hồi, co giãn theo thời lượng hồi đó nhận được.
 *
 * Có TRẦN TRÊN vì một lý do rất thực tế: khi một hồi được kéo lên 10 giây (video 3 clip), chia đều
 * 0.5s/nhịp sẽ ra 20 nhịp — vừa quá vụn để xem, vừa vượt xa khả năng bám prompt của model. Chạm
 * trần thì mỗi nhịp tự dài ra (0.8-1.2s), hợp hơn với một clip dài.
 */
function beatCountsFor(actKey, seconds) {
  if (actKey === 'B') return clamp(seconds / 2, 1, 6); // số nhịp CẮT (chưa tính nhịp vẽ mẫu & flat-lay)
  if (actKey === 'C') return clamp(seconds / 0.5, 4, 12);
  if (actKey === 'D') return clamp(seconds / 0.5, 3, 8);
  return 1;
}

/**
 * Bản kế hoạch đầy đủ: mỗi clip gồm những hồi nào, mỗi hồi dài bao nhiêu giây (tính từ 0 của
 * CHÍNH clip đó) và cần bao nhiêu nhịp. Dùng chung cho cả lúc soạn prompt gửi Gemini (để xin đúng
 * số nhịp) lẫn lúc ráp văn bản cuối.
 */
export function buildCraftAsmrPlan({ durationSeconds, clipCount }) {
  const plan = buildClipPlan({
    acts: ACTS,
    clipPlans: CLIP_PLANS,
    beatCountsFor,
    beatKeys: ['B', 'C', 'D'],
    durationSeconds,
    clipCount,
    defaultDuration: CRAFT_ASMR_DEFAULTS.durationSeconds,
  });

  // Giữ nguyên tên cũ của các tổng số nhịp — buildCraftAsmrGeminiPrompt đọc theo tên này.
  return {
    ...plan,
    totals: {
      cutBeats: plan.totals.B,
      assemblyBeats: plan.totals.C,
      poseBeats: plan.totals.D,
    },
  };
}

/**
 * Prompt gửi Gemini. Cố tình KHÔNG yêu cầu Gemini viết ra khung/mốc giây — chỉ xin đúng những
 * mảnh phụ thuộc vào (vật liệu × chủ thể), trả về JSON các chuỗi MỘT DÒNG (ràng buộc JSON an toàn
 * của callGeminiApi.js cấm ký tự xuống dòng trong giá trị chuỗi).
 */
export function buildCraftAsmrGeminiPrompt({ subject, material, notes, durationSeconds, clipCount, fidelity }) {
  const plan = buildCraftAsmrPlan({ durationSeconds, clipCount });
  const fid = resolveFidelity(fidelity);
  const notesLine = notes ? `- YÊU CẦU RIÊNG CỦA NGƯỜI DÙNG (phải tôn trọng): ${notes}` : '';

  const multiClipNote =
    plan.clipCount > 1
      ? `
LƯU Ý QUAN TRỌNG — VIDEO NÀY SẼ ĐƯỢC SINH LÀM ${plan.clipCount} LƯỢT RỒI GHÉP LẠI:
Tổng video dài ${fmt(plan.totalDuration)} giây, chia thành ${plan.clipCount} clip mỗi clip ${fmt(plan.clipDuration)} giây, sinh riêng từng clip rồi nối liền. Vì vậy bạn PHẢI viết thêm các trường "stateStart", "stateAfterA", "stateAfterB", "stateAfterC" — đó là mô tả BỐ CỤC MẶT BÀN tại đúng các khoảnh khắc chuyển clip. Mỗi mô tả phải cụ thể tới mức người khác đọc xong dựng lại được y hệt khung hình đó: vật gì nằm ở đâu, đã lắp tới đâu, còn thiếu bộ phận nào. Đây là thứ giữ cho 3 clip trông như một cú quay liên tục.`
      : '';

  return `Bạn là chuyên gia viết prompt cho công cụ sinh video AI (Veo/Sora/Kling), chuyên dòng video ASMR/satisfying "chế tác thủ công từ phế liệu" đang viral trên TikTok/Shorts.

NHIỆM VỤ: người dùng muốn một video ${fmt(plan.totalDuration)} giây quay cảnh CHẾ TÁC:
- VẬT LIỆU ĐẦU VÀO: ${material}
- THÀNH PHẨM CẦN LÀM RA: ${subject}
${notesLine}${multiClipNote}

Hãy trả về JSON đúng schema dưới đây. TOÀN BỘ giá trị viết bằng TIẾNG VIỆT, giọng mô tả kỹ thuật cho máy đọc (như mô tả phân cảnh trong kịch bản quay), không phải văn nói.

{
  "title": "Tên ngắn gọn của video, tối đa 8 từ, để lưu vào lịch sử. Ví dụ: 'Giáp samurai từ vỏ lon đỏ'",
  "topicLine": "Một mệnh đề mô tả nội dung video, dạng 'biến <vật liệu> thành <thành phẩm>'. Ví dụ: 'biến vỏ lon đỏ thành mô hình giáp samurai Nhật Bản'",
  "scene1Title": "Tiêu đề cảnh mở màn VIẾT HOA, 3-5 từ, nêu đúng hành động mở màn với chính vật liệu này. Ví dụ với vỏ lon: 'ĐẶT VỎ LON VÀ CẮT'. Với ống nhựa PVC: 'ĐẶT ỐNG NHỰA VÀ XẺ DỌC'",
  "materialIdentity": "Mô tả vật liệu xuyên suốt: tên vật liệu VIẾT HOA phần cốt lõi, màu sắc, đặc tính bề mặt, mặt trong/mặt sau lộ ra khi cắt. Nêu rõ 'không logo/nhãn hiệu cụ thể' nếu vật liệu vốn là bao bì thương mại. Một dòng.",
  "materialForbidden": "Câu cấm đổi vật liệu, bắt đầu bằng 'KHÔNG được đổi sang'. Liệt kê đúng những vật liệu mà AI hay tự ý thay vào cho dễ render (nhựa mờ, da, gỗ, vải nỉ...), và mở ngoặc chừa lại đúng những chi tiết phụ BẮT BUỘC phải khác chất liệu nếu thành phẩm cần chúng.",
  "styleRule": "Câu quy định KIỂU DÁNG thành phẩm, bắt đầu bằng 'Kiểu dáng ... là', kèm liệt kê tên các bộ phận chính bằng thuật ngữ chuyên ngành đúng của lĩnh vực đó (nếu có), mỗi bộ phận kèm mô tả cực ngắn. Một dòng.",
  "edgeRule": "Câu mô tả chất lượng MÉP CẮT/BỀ MẶT gia công đúng với độ dày và bản chất vật liệu này (ví dụ nhôm lon mỏng ~0.1mm thì mép hơi thô, gợn nhẹ, không sắc nét như dập khuôn công nghiệp).",
  "thicknessRule": "Câu ép ĐỘ DÀY của vật liệu phải LỘ ĐÚNG trong ảnh, gồm đủ 4 phần: (1) độ dày thực tế tính bằng mm; (2) một vật quen thuộc để so sánh — PHẢI đúng cỡ với con số vừa nêu, theo bảng: 0.05-0.15mm = lá nhôm gói thức ăn / tờ giấy in; 0.2-0.4mm = tấm danh thiếp; 0.5-1.5mm = bìa carton một lớp; 2-5mm = ván gỗ mỏng; đừng bao giờ chọn vật DÀY HƠN thực tế vì model sẽ vẽ theo vật so sánh chứ không theo con số mm; (3) mép cắt nhìn ra sao — vật liệu mỏng thì mép chỉ là MỘT VẠCH MẢNH NHƯ SỢI TÓC, gần như không nhìn thấy 'mặt dày' của tấm, còn vật liệu dày thì mới thấy rõ mặt cắt; (4) vật liệu ứng xử thế nào khi cầm — mềm oặt và rung khi lắc, hay cứng đơ. Kết bằng một câu phủ định GỌI ĐÍCH DANH loại vật liệu DÀY mà AI hay vẽ nhầm sang. Một dòng.",
  "accessories": "Tên các chi tiết phụ nhỏ dùng để ghép/trang trí, kèm màu. Ví dụ: 'dây buộc vải đỏ-đen, đinh tán nhỏ'. Nếu thành phẩm không cần phụ kiện, ghi 'keo dán và ghim kẹp nhỏ'.",
  "parts": ["Danh sách các bộ phận rời sẽ được cắt ra rồi lắp lại, mỗi phần tử dạng 'tên bộ phận — mô tả rất ngắn'. Đúng ${fid.partsRange} phần tử, không hơn. ${fid.partSizeHint}."],
  "actA": "Một đoạn văn 2-4 câu tả cảnh mở màn: đặt vật liệu xuống bàn xám, tay cầm dụng cụ cắt ĐÚNG loại cho vật liệu này, cắt một đường dứt khoát trong MỘT động tác duy nhất, mép cắt vừa xong lộ ra mặt trong. Nhấn 'chuyển động nhanh, gọn, không có shot phụ'.",
  "actBDraw": "Tả thao tác đặt phẳng vật liệu lên mẫu giấy in hoạ tiết các bộ phận, dùng thước và bút marker vẽ nhanh theo đường viền mẫu. Một dòng.",
  "actBCut": ["Đúng ${plan.totals.cutBeats} nhịp CẮT TỈA, mỗi phần tử một câu ngắn tả việc cắt ra một nhóm bộ phận cụ thể bằng dụng cụ đúng loại. Nhịp CUỐI CÙNG phải kèm khoảnh khắc lấy thêm phụ kiện (đúng phần accessories ở trên) từ hộp phụ kiện, đặt cạnh các mảnh đã cắt."],
  "actBFlatLay": "Tả một flat-lay từ trên xuống CHỈ CÓ CÁC MẢNH RỜI. Bắt buộc nêu rõ: KHÔNG có mannequin, KHÔNG có hình người/nhân vật hoàn chỉnh nào trong khung hình; các bộ phận đặt RIÊNG LẺ, tách rời, có khoảng cách rõ ràng, không mảnh nào chạm/lắp vào mảnh nào, sắp theo bố cục kiểu bản vẽ kỹ thuật (exploded view) trên mặt bàn xám; đúng số lượng và hình dạng vừa cắt; vụn vật liệu và phụ kiện rải rác xung quanh; thấy tay người thợ đang xếp nốt mảnh cuối, không thấy hình dáng người hoàn chỉnh.",
  "actC": ["Đúng ${plan.totals.assemblyBeats} thao tác lắp ghép, mỗi phần tử là MỘT câu ngắn tả một thao tác dứt khoát (đặt/quấn/ghép/bấm/lắp/dán/phủi). Thứ tự hợp lý từ trong ra ngoài hoặc từ trên xuống dưới. Thao tác cuối kèm động tác phủi tay hất vụn thừa."],
  "actDIntro": "Một câu mở cho cảnh cuối: hai tay cầm TRỰC TIẾP thành phẩm hoàn chỉnh (nhắc lại đúng màu sắc/chất liệu/phụ kiện đã dùng), nâng lên ngang tầm mắt trước ống kính, đổi góc nhanh theo từng nhịp cắt.",
  "finishedLook": "Mô tả THÀNH PHẨM HOÀN CHỈNH nhìn từ bên ngoài: dáng tổng thể, tư thế đứng, tỉ lệ giữa các phần, chiều cao ước lượng tính bằng cm, và điểm nhận dạng nổi bật nhất khiến nhìn một cái là biết ngay đó là gì. TUYỆT ĐỐI KHÔNG nhắc tới đế trưng bày, giá đỡ, bệ, chân đế hay trục xoay — mô hình phải tự đứng được, và mọi vật liệu nhắc tới ở đây đều phải nằm trong danh sách cho phép ở trên. Một dòng.",
  "paletteNote": "Bảng màu của thành phẩm: 3-4 màu chính kèm mã hex gần đúng, nói rõ phần nào mang màu nào. Ví dụ: 'đỏ ánh kim #C8102E ở mặt ngoài các phiến giáp, bạc nhôm #C0C4C8 ở mép cắt và mặt trong, đen #1A1A1A ở dây buộc, vàng đồng #B08D57 ở đinh tán'. Một dòng.",
  "actD": ["Đúng ${plan.totals.poseBeats} nhịp khoe thành phẩm, mỗi phần tử một câu cực ngắn: đổi góc cầm, xoay chậm, cận cảnh một chi tiết đắt. Nhịp cuối là cận cảnh chi tiết ấn tượng nhất và kết video."],
  "stateStart": "Bố cục mặt bàn ở KHUNG HÌNH ĐẦU TIÊN của cả video: bàn xám trống, vật liệu còn nguyên vẹn nằm ở đâu, dụng cụ nằm ở đâu. Một dòng.",
  "stateAfterA": "Bố cục mặt bàn NGAY SAU khi vật liệu bị cắt/xẻ lần đầu: hình dạng phôi sau nhát cắt, nằm ở đâu trên bàn. Một dòng.",
  "stateAfterB": "Bố cục mặt bàn NGAY SAU khi đã cắt xong toàn bộ mảnh rời: liệt kê các mảnh đang nằm tách rời theo bố cục exploded view ở đâu, phụ kiện nằm ở đâu, vụn thừa ở đâu, KHÔNG có gì được lắp vào nhau. Một dòng.",
  "stateAfterC": "Bố cục mặt bàn NGAY SAU khi lắp ghép xong: thành phẩm hoàn chỉnh đang đứng/nằm ở đâu trên bàn, hướng nào, vụn thừa đã được phủi sạch. Một dòng.",
  "youtubeTitle": "Tiêu đề YouTube Shorts bằng TIẾNG ANH, tối đa 70 ký tự để không bị cắt. Đặt phép biến hoá lên ĐẦU câu theo công thức đã chạy tốt cho dòng này: 'I Turned a Soda Can Into a ...' / 'Turning a Beer Can Into a ...' / 'Making a ... From a Single Soda Can'. Phải nêu rõ CẢ vật liệu LẪN thành phẩm. Viết hoa đầu mỗi từ chính (Title Case). Tối đa 1 emoji và phải đặt ở cuối. Không viết hoa toàn bộ, không nhồi từ khoá.",
  "youtubeHashtags": ["3 đến 5 hashtag tiếng Anh cho YouTube Shorts. Phần tử ĐẦU TIÊN bắt buộc là '#Shorts'. Các phần tử sau trộn giữa thẻ rộng (#DIY, #ASMR, #Satisfying) và thẻ hẹp đúng nội dung (#SodaCanArt, #MetalCraft). Mỗi phần tử bắt đầu bằng #, không dấu cách, nhiều từ thì viết kiểu CamelCase."],
  "tiktokCaption": "Caption TikTok bằng TIẾNG ANH, tối đa 100 ký tự, giọng nói chuyện tự nhiên chứ không phải tiêu đề trang trọng. Mở bằng một hook hoặc kết bằng một câu hỏi để kéo bình luận (ví dụ 'Would you keep this one?'). KHÔNG chứa hashtag ở trường này.",
  "tiktokHashtags": ["5 đến 8 hashtag tiếng Anh cho TikTok, trộn giữa thẻ rộng (#fyp, #satisfying, #asmr, #diy) và thẻ hẹp đúng nội dung. Mỗi phần tử bắt đầu bằng #, không dấu cách, chữ thường cho thẻ rộng và CamelCase cho thẻ nhiều từ."],
  "backgroundNote": "Một câu tả hậu cảnh, mặc định là bàn làm việc xám hơi out-of-focus.",
  "visualStyle": "Một dòng: photoreal, kiểu ánh sáng, tông màu chủ đạo lấy đúng từ vật liệu, độ tương phản, nhịp dựng quick-cut/montage, match cut theo vị trí tay/vật thể.",
  "audio": "Một dòng: các tiếng động đặc trưng CỦA CHÍNH VẬT LIỆU NÀY khi bị cắt/gõ/ghép, và ghi rõ 'không nhạc lời'."
}

RÀNG BUỘC QUAN TRỌNG:
- ĐỘ DÀY LÀ THỨ MODEL SINH ẢNH VẼ SAI NHIỀU NHẤT, hãy viết "thicknessRule" thật gắt. Ví dụ điển hình: vỏ lon nước ngọt chỉ dày khoảng 0.1mm — mỏng ngang lá nhôm gói thức ăn, cầm một đầu là oặt xuống, cắt được bằng kéo văn phòng. Vậy mà model gần như luôn vẽ thành tấm tôn/thép dày 1-2mm với mép cắt dày cộm sứt sẹo. Với vật liệu mỏng, phải nói rõ: mép cắt CHỈ LÀ MỘT VẠCH BẠC MẢNH NHƯ SỢI TÓC, KHÔNG nhìn thấy được bề mặt cạnh của tấm; ba-via li ti cỡ vụn giấy chứ không phải răng cưa to; tấm rung và oặt khi cầm. Ngược lại nếu vật liệu vốn dày thật (ống nhựa PVC, gỗ pallet) thì cứ mô tả đúng độ dày thật của nó.
${fid.geminiNote ? `- ${fid.geminiNote}\n` : ''}- Dụng cụ phải ĐÚNG với vật liệu: kim loại mỏng thì kéo cắt tôn/kìm; nhựa thì dao rọc/cưa nhỏ; gỗ thì đục/giấy nhám. Đừng dùng kéo cắt tôn cho gỗ.
- Tên bộ phận phải là thuật ngữ THẬT của lĩnh vực đó nếu tồn tại (giáp samurai: kabuto, dou, sode, kote, suneate; xe máy: khung, bình xăng, yên, ống xả...). Không bịa thuật ngữ.
- "parts" và "actC" phải khớp nhau: mỗi bộ phận đã cắt ra đều được lắp vào ở một bước nào đó.
- Mọi thứ phải làm được trong ${fmt(plan.totalDuration)} giây quay liên tục — không cảnh chờ khô keo, không cảnh sơn phủ nhiều lớp.
- Không nhắc tên thương hiệu thật, không logo, không mặt người rõ nét (chỉ thấy bàn tay).
- 4 trường mạng xã hội (youtubeTitle, youtubeHashtags, tiktokCaption, tiktokHashtags) phải viết bằng TIẾNG ANH, kể cả khi mọi trường khác là tiếng Việt. Đừng đặt cùng một câu cho cả hai nền tảng: YouTube cần tiêu đề rõ ràng có từ khoá tìm kiếm, TikTok cần câu nói chuyện gây tò mò. Không bịa số liệu ("10 million views"), không hứa hẹn sai sự thật, không dùng thẻ câu view chung chung kiểu #viral #trending #foryoupage.`;
}

/** Khối ⚠️ nhất quán vật liệu — LẶP NGUYÊN VĂN ở mọi clip, đó là điểm neo giữ chất liệu không trôi. */
function buildConsistencyBlock(spec, fidelity) {
  const parts = Array.isArray(spec.parts) ? spec.parts.filter((p) => String(p || '').trim()) : [];
  const lines = [
    '⚠️ YÊU CẦU BẮT BUỘC VỀ TÍNH NHẤT QUÁN VẬT LIỆU (áp dụng cho MỌI cảnh):',
    '',
    `* Vật liệu xuyên suốt là ${spec.materialIdentity}`,
    `* ${spec.materialForbidden}`,
    `* ${spec.styleRule}`,
    // Độ dày đứng THÀNH MỘT GẠCH RIÊNG, ngay trước luật mép cắt: gộp chung vào edgeRule thì con số
    // "0.1mm" chìm nghỉm giữa câu và model sinh ảnh bỏ qua — nó không suy luận từ đơn vị mm, nó chỉ
    // bám vào hình ảnh so sánh ("mỏng như lá nhôm") và vào mô tả mép cắt trông ra sao.
    ...(spec.thicknessRule ? [`* ĐỘ DÀY VẬT LIỆU: ${spec.thicknessRule}`] : []),
    `* ${spec.edgeRule}`,
    `* Chi tiết trang trí (${spec.accessories}) phải xuất hiện ở cảnh cắt/chuẩn bị TRƯỚC khi được dùng ở cảnh ghép — không đột ngột có ở thành phẩm.`,
    '* Sản phẩm ở cảnh ghép và cảnh cầm tay phải là CÙNG một bộ mảnh đã thấy cắt ra, khớp hình dạng, số lượng, kích thước.',
  ];
  if (parts.length > 0) lines.push(`* Bộ mảnh rời gồm: ${parts.join('; ')}.`);
  lines.push(...resolveFidelity(fidelity).promptBlock);
  return lines;
}

/** Trạng thái mặt bàn tại ranh giới sau mỗi hồi — nguồn của cả khung cuối clip N lẫn khung đầu clip N+1. */
function stateAfter(spec, actKey) {
  const map = { A: spec.stateAfterA, B: spec.stateAfterB, C: spec.stateAfterC };
  return map[actKey] || spec.stateAfterC || '';
}

/**
 * Khối 🔗 nối clip. Chỉ xuất hiện khi có nhiều hơn 1 clip — video 1 clip giữ nguyên định dạng cũ.
 *
 * Câu "hai tay rút hẳn khỏi khung, máy quay giữ tĩnh" ở khung cuối là mẹo quan trọng nhất của cả
 * tính năng này: bàn tay là thứ khác nhau nhiều nhất giữa 2 lượt sinh, còn mặt bàn tĩnh với vật
 * thể đứng yên thì gần như trùng khít — cắt vào đó thì mắt không bắt được vết nối.
 */
function buildStitchBlock(spec, clip, plan) {
  if (plan.clipCount <= 1) return [];

  const isFirst = clip.index === 1;
  const isLast = clip.index === plan.clipCount;
  const startState = isFirst ? spec.stateStart : stateAfter(spec, previousEndAct(plan, clip, 'A'));
  const endState = stateAfter(spec, clip.endsAfterAct);

  const lines = [
    '',
    `🔗 QUY TẮC NỐI CLIP (BẮT BUỘC — ${plan.clipCount} clip sẽ được ghép liền thành MỘT video ${fmt(plan.totalDuration)} giây):`,
    isFirst
      ? `* KHUNG HÌNH ĐẦU (mở màn cả video): ${startState}`
      : `* KHUNG HÌNH ĐẦU phải khớp CHÍNH XÁC khung hình cuối của clip ${clip.index - 1}: ${startState} — cùng góc máy, cùng khoảng cách, cùng ánh sáng, vật thể nằm nguyên vị trí cũ, chưa có thao tác nào bắt đầu.`,
    // Clip cuối KHÔNG bị ép dừng ở một bố cục bàn cố định: hồi cuối là cảnh cầm thành phẩm trên
    // tay, nên bắt nó kết ở "mô hình đứng giữa bàn" là tự mâu thuẫn với chính nội dung cảnh.
    isLast
      ? '* KHUNG HÌNH CUỐI: đây là clip kết, cứ dừng tự nhiên ở đúng nhịp cuối của cảnh trên — không cần đưa vật thể về lại mặt bàn.'
      : `* KHUNG HÌNH CUỐI phải dừng đúng ở: ${endState}. Trong khoảng 0.4 giây cuối, HAI TAY RÚT HẲN RA KHỎI KHUNG HÌNH và máy quay giữ TĨNH HOÀN TOÀN — đây là khung sẽ được dùng làm khung mở đầu của clip ${clip.index + 1}.`,
    '* Xuyên suốt clip: giữ nguyên MỘT mặt bàn xám, MỘT nguồn sáng studio, MỘT đôi bàn tay (cùng nước da, không đeo rồi lại tháo găng), cùng cỡ khung và cùng tiêu cự như các clip khác. Không đổi bối cảnh, không cắt sang không gian khác.',
  ];
  return lines;
}

/** Ráp văn bản prompt của MỘT clip. Đây là nơi giữ format bất biến. */
function buildOneClipText(spec, clip, plan, options) {
  const aspectRatio = options.aspectRatio || CRAFT_ASMR_DEFAULTS.aspectRatio;
  const fps = Number(options.fps) || CRAFT_ASMR_DEFAULTS.fps;
  const orientationWord =
    CRAFT_ASMR_ASPECT_RATIOS.find((r) => r.value === aspectRatio)?.orientationWord || 'dọc';
  const multi = plan.clipCount > 1;
  const divider = '────────────────────────────────────────';

  const lines = [];

  if (multi) {
    lines.push(
      `═══════ CLIP ${clip.index}/${plan.clipCount} — ghép vào giây ${fmt(clip.globalFrom)}→${fmt(clip.globalTo)} của video ${fmt(plan.totalDuration)} giây ═══════`
    );
    lines.push('');
  }

  lines.push(
    `CHỦ ĐỀ: Video ASMR/satisfying "${spec.topicLine}", chế tác thủ công, ${orientationWord} ${aspectRatio}, ${fps}fps, ~${fmt(clip.duration)}s` +
      (multi ? ` (đây là phần ${clip.index}/${plan.clipCount} của một video ${fmt(plan.totalDuration)}s liền mạch).` : '.')
  );
  lines.push(...buildConsistencyBlock(spec, options.fidelity));
  lines.push(...buildStitchBlock(spec, clip, plan));
  lines.push('');
  lines.push(divider);

  if (multi) {
    lines.push(`NỘI DUNG CLIP ${clip.index} (mốc thời gian tính từ giây 0 của CHÍNH clip này):`);
  }

  clip.acts.forEach((act, actIdx) => {
    const sceneNo = actIdx + 1;
    const title = act.key === 'A' ? spec.scene1Title : act.title;

    if (act.kind === 'paragraph') {
      lines.push(`CẢNH ${sceneNo} — ${title} (${fmt(act.from)}-${fmt(act.to)}s):`);
      lines.push(spec.actA);
      return;
    }

    if (act.key === 'B') {
      // Hồi B = 1 nhịp vẽ mẫu + n nhịp cắt + 1 nhịp flat-lay. Trọng số 1 / 1.5 mỗi nhịp cắt / 1.5
      // lấy đúng từ bản mẫu 10 giây (1-2s vẽ, 2-3.5s cắt, 3.5-5s flat-lay).
      const cutBeats = sliceBeats(spec.actBCut, plan, 'B', clip.index);
      // Nhịp "vẽ mẫu" chỉ nằm ở clip ĐẦU TIÊN có hồi B, nhịp "flat-lay" chỉ ở clip CUỐI CÙNG có
      // hồi B — với các CLIP_PLANS hiện tại thì hồi B luôn gọn trong 1 clip, nhưng viết theo cách
      // này để tách hồi B ra nhiều clip về sau không âm thầm ra 2 lần vẽ mẫu.
      const isFirstBClip = !plan.clips.some((c) => c.index < clip.index && c.acts.some((a) => a.key === 'B'));
      const isLastBClip = !plan.clips.some((c) => c.index > clip.index && c.acts.some((a) => a.key === 'B'));
      const beats = [];
      if (isFirstBClip) beats.push({ text: spec.actBDraw, weight: 1 });
      cutBeats.forEach((t) => beats.push({ text: t, weight: 1.5 }));
      if (isLastBClip) beats.push({ text: spec.actBFlatLay, weight: 1.5 });

      const totalWeight = beats.reduce((s, b) => s + b.weight, 0) || 1;
      lines.push(`CẢNH ${sceneNo} — ${title} (${fmt(act.from)}-${fmt(act.to)}s):`);
      lines.push('');
      let cursor = act.from;
      beats.forEach((b) => {
        const end = cursor + (b.weight / totalWeight) * act.seconds;
        lines.push(`* ${fmt(cursor)}-${fmt(end)}s: ${b.text}`);
        cursor = end;
      });
      lines.push('');
      return;
    }

    const beats = sliceBeats(act.key === 'C' ? spec.actC : spec.actD, plan, act.key, clip.index);
    const step = beats.length > 0 ? act.seconds / beats.length : act.seconds;
    const tail =
      act.key === 'C'
        ? 'cắt nhanh liên tục kiểu montage, tay thao tác dứt khoát, không nấn ná'
        : 'không dùng đế/trục xoay trưng bày';

    lines.push(
      `CẢNH ${sceneNo} — ${title} (${fmt(act.from)}-${fmt(act.to)}s, ${beats.length} ${act.beatWord} nhỏ, MỖI ${act.beatWord.toUpperCase()}/CHUYỂN CẢNH CHỈ ~${fmt(step)}s, ${tail}):`
    );
    if (act.key === 'D') lines.push(spec.actDIntro);
    lines.push('');
    beats.forEach((text, i) => {
      lines.push(`* ${fmt1(act.from + step * i)}-${fmt1(act.from + step * (i + 1))}s: ${text}`);
    });
    if (act.key === 'D') lines.push(spec.backgroundNote);
    lines.push('');
  });

  lines.push(divider);
  lines.push(`PHONG CÁCH HÌNH ẢNH: ${spec.visualStyle}`);
  lines.push(`ÂM THANH: ${spec.audio}`);

  return lines.join('\n');
}

/**
 * Prompt sinh ẢNH TĨNH "Character Reference Sheet" — bảng tham chiếu của chính mô hình sắp chế tác.
 *
 * Sinh ra TRƯỚC video và phục vụ hai việc:
 *   1. Xem trước: biết mô hình sẽ trông ra sao trước khi đốt lượt sinh video (đắt hơn nhiều).
 *   2. QUAN TRỌNG HƠN — làm ảnh tham chiếu đầu vào cho lượt sinh video. Thứ trôi nhiều nhất giữa
 *      các lượt sinh là hình dáng thành phẩm; có một tấm turnaround cố định để bám thì cả 3 clip
 *      cùng nhìn vào một mô hình thay vì mỗi clip tự bịa một kiểu.
 *
 * Dựng HOÀN TOÀN từ spec đã có, không tốn thêm một lượt gọi Gemini nào — và vì dùng lại đúng
 * nguyên văn các câu materialIdentity/styleRule/parts của prompt video nên sheet với video không
 * thể lệch nhau về chất liệu.
 *
 * CỐ Ý CẤM CHỮ TRONG ẢNH: model sinh ảnh viết chữ gần như luôn sai chính tả, mà một sheet đầy chữ
 * nguệch ngoạc thì vừa xấu vừa làm nhiễu chính nó khi được dùng làm ảnh tham chiếu. Tên bộ phận
 * vẫn nằm trong prompt (để model biết phải vẽ gì), chỉ là không được vẽ chữ ra ảnh.
 */
export function buildCraftAsmrSheetPrompt(spec, options = {}) {
  const subject = String(options.subject || '').trim();
  const parts = Array.isArray(spec.parts) ? spec.parts.filter((p) => String(p || '').trim()) : [];
  const fid = resolveFidelity(options.fidelity);
  const divider = '────────────────────────────────────────';

  const lines = [
    `CHỦ ĐỀ: CHARACTER REFERENCE SHEET (model sheet) — ẢNH TĨNH, KHÔNG PHẢI VIDEO — của mô hình "${subject || spec.topicLine}" được chế tác thủ công từ vật liệu tái chế.`,
    'Ảnh photoreal chụp studio, tỉ lệ khung 1:1 (vuông), nền TRẮNG TINH đơn giản.',
    '',
    divider,
    'BỐ CỤC SHEET — 4 HÀNG TỪ TRÊN XUỐNG:',
    '',
    'HÀNG 1 — TURNAROUND 4 GÓC (hàng quan trọng nhất): CÙNG MỘT mô hình hoàn chỉnh, chụp ở 4 góc xoay: chính diện (0°), chếch 3/4 (45°), nghiêng hông (90°), phía sau (180°). Bốn hình phải CÙNG kích thước, CÙNG chiều cao, chân cùng đặt trên một đường ngang tưởng tượng, cùng ánh sáng, khoảng cách giữa các hình đều nhau.',
    `   Thành phẩm trông như sau: ${spec.finishedLook || spec.styleRule}`,
    '',
    `HÀNG 2 — CÁC BỘ PHẬN RỜI (exploded view), cùng tỉ lệ với hàng 1, đặt tách rời nhau, không mảnh nào chạm/lắp vào mảnh nào: ${
      parts.length > 0 ? parts.join('; ') : 'toàn bộ các mảnh rời tạo nên thành phẩm'
    }.`,
    '',
    `HÀNG 3 — BẢNG MẪU VẬT LIỆU: bày cạnh nhau như bảng mẫu chất liệu — (a) một mẩu vật liệu thô còn nguyên chưa cắt, (b) một mảnh đã cắt ra để lộ mặt trong, (c) các chi tiết phụ: ${spec.accessories}.`,
    '',
    `HÀNG 4 — 3 Ô CẬN CẢNH MACRO: (a) mép cắt nhìn CHÉO để thấy đúng độ dày của tấm — ${spec.edgeRule} (b) một mối nối/điểm ghép tiêu biểu giữa hai bộ phận, thấy rõ cách chúng bám vào nhau; (c) bề mặt vật liệu ở cự ly rất gần, thấy vân/độ bóng/vết xước thật.`,
    ...(spec.thicknessRule
      ? [
          `   ĐỘ DÀY phải đọc ra được ngay ở hàng này — đây là chỗ dễ vẽ sai nhất của cả tấm sheet: ${spec.thicknessRule}`,
        ]
      : []),
    '',
    divider,
    'QUY TẮC BẮT BUỘC:',
    '* Nền TRẮNG TINH tuyệt đối (#FFFFFF), đồng nhất ở toàn bộ khung và ở mọi ô — không gradient, không hoạ tiết, không mặt bàn, không bối cảnh, không hộp/khung viền ngăn giữa các ô.',
    '* TUYỆT ĐỐI KHÔNG CÓ CHỮ trong ảnh: không nhãn tên bộ phận, không số đo, không mũi tên chú thích, không tiêu đề, không watermark, không logo. Sheet này dùng làm ảnh tham chiếu — chữ do AI sinh ra luôn sai và làm hỏng nó.',
    '* Ánh sáng studio đều và khuếch tán từ trên xuống, bóng đổ rất nhạt sát chân vật thể hoặc không có; tuyệt đối không có bóng đổ dài làm bẩn nền trắng.',
    `* Vật liệu xuyên suốt là ${spec.materialIdentity}`,
    `* ${spec.materialForbidden}`,
    `* ${spec.styleRule}`,
    `* Mọi ô trong sheet phải là CÙNG MỘT mô hình, cùng bảng màu, cùng độ bóng, cùng độ sờn: ${
      spec.paletteNote || 'giữ đúng bảng màu của vật liệu gốc'
    }`,
    '* Không có người, không mặt người, không bàn tay, không mannequin nguyên hình trong bất kỳ ô nào — chỉ có mô hình và các mảnh vật liệu.',
    // Đế/giá đỡ là thứ model sinh ảnh rất hay tự thêm vào cho vật thể "đứng được" — và nó luôn
    // được vẽ bằng một vật liệu ngoài danh sách (gỗ, tre, đá), vừa phá luật nhất quán vật liệu vừa
    // chỏi với luật "không dùng đế/trục xoay trưng bày" của các prompt video.
    '* KHÔNG có đế trưng bày, giá đỡ, bệ, chân đế, trục xoay hay hộp kính — mô hình đứng tự do trực tiếp trên nền trắng. Không được thêm bất kỳ vật liệu nào ngoài danh sách đã nêu ở trên, kể cả cho phần đỡ.',
    '* Số lượng và hình dạng các bộ phận ở HÀNG 2 phải khớp chính xác với thành phẩm ở HÀNG 1: ghép hết các mảnh hàng 2 lại phải ra đúng mô hình hàng 1.',
    ...fid.promptBlock,
  ];

  return lines.join('\n');
}

/**
 * Tiêu đề + hashtag cho YouTube Shorts và TikTok (tiếng Anh), sinh cùng một lượt gọi Gemini với
 * prompt video — nó đã có sẵn toàn bộ ngữ cảnh (vật liệu, thành phẩm, phong cách) nên không việc
 * gì phải gọi thêm một lượt nữa chỉ để đặt tiêu đề.
 *
 * Hai nền tảng được tách bạch có chủ đích: YouTube xếp hạng theo tìm kiếm nên tiêu đề cần từ khoá
 * rõ ràng và #Shorts đứng đầu; TikTok đẩy theo tín hiệu tương tác nên caption cần giọng nói chuyện
 * và một câu hỏi để kéo bình luận. Dùng chung một câu cho cả hai là phí một nửa.
 */
export function buildCraftAsmrSocialCopy(spec) {
  // Gemini thỉnh thoảng trả thẻ thiếu dấu #, hoặc nhét dấu cách vào giữa. Chuẩn hoá tại đây để
  // người dùng copy phát là dán được, không phải sửa tay.
  const cleanTags = (list) =>
    (Array.isArray(list) ? list : [])
      .map((t) => String(t || '').trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .map((t) => t.replace(/\s+/g, ''))
      .filter((t) => t.length > 1);

  const youtubeTitle = String(spec.youtubeTitle || '').trim();
  const youtubeHashtags = cleanTags(spec.youtubeHashtags);
  const tiktokCaption = String(spec.tiktokCaption || '').trim();
  const tiktokHashtags = cleanTags(spec.tiktokHashtags);

  const youtubeBlock = [youtubeTitle, youtubeHashtags.join(' ')].filter(Boolean).join('\n');
  const tiktokBlock = [tiktokCaption, tiktokHashtags.join(' ')].filter(Boolean).join('\n');

  return {
    youtubeTitle,
    youtubeHashtags,
    tiktokCaption,
    tiktokHashtags,
    youtubeBlock,
    tiktokBlock,
    /** Bản văn bản thuần — dùng cho nút copy chung và để lưu lịch sử. */
    plainText: [
      '— YOUTUBE SHORTS —',
      youtubeBlock,
      '',
      '— TIKTOK —',
      tiktokBlock,
    ].join('\n'),
  };
}

/** Trả về mảng prompt — 1 phần tử cho mỗi clip cần sinh. */
export function buildCraftAsmrClips(spec, options = {}) {
  const plan = buildCraftAsmrPlan({
    durationSeconds: options.durationSeconds,
    clipCount: options.clipCount,
  });

  return plan.clips.map((clip) => ({
    index: clip.index,
    label:
      plan.clipCount > 1
        ? `Clip ${clip.index}/${plan.clipCount} · giây ${fmt(clip.globalFrom)}-${fmt(clip.globalTo)}`
        : `Prompt · ~${fmt(clip.duration)}s`,
    durationSeconds: clip.duration,
    globalFrom: clip.globalFrom,
    globalTo: clip.globalTo,
    promptText: buildOneClipText(spec, clip, plan, options),
  }));
}

/** Toàn bộ prompt nối lại thành một khối (để copy một phát / lưu lịch sử / xem nhanh). */
export function buildCraftAsmrPromptText(spec, options = {}) {
  return buildCraftAsmrClips(spec, options)
    .map((c) => c.promptText)
    .join('\n\n\n');
}

/** Chỉ giữ lại đúng các trường khung cần — chặn Gemini nhét thêm khoá lạ vào bản ghi lưu DB. */
export function normalizeCraftAsmrSpec(raw) {
  const str = (v, fallback = '') => String(v ?? fallback).trim();
  const arr = (v) => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);
  // Các trường được NHÚNG GIỮA CÂU (trong ngoặc đơn, hoặc trước dấu chấm do khung tự thêm) nên
  // không được mang sẵn dấu chấm cuối — Gemini rất hay thêm vào, cho ra "(...keo dán khô nhanh.)"
  // và "...trên bàn.. Trong khoảng 0.4 giây cuối".
  const inline = (v, fallback = '') => str(v, fallback).replace(/\s*[.。]+\s*$/, '');
  return {
    title: str(raw?.title, 'Video chế tác thủ công'),
    topicLine: str(raw?.topicLine),
    scene1Title: str(raw?.scene1Title, 'ĐẶT VẬT LIỆU VÀ CẮT').toUpperCase(),
    materialIdentity: str(raw?.materialIdentity),
    materialForbidden: str(raw?.materialForbidden),
    styleRule: str(raw?.styleRule),
    edgeRule: str(raw?.edgeRule),
    thicknessRule: str(raw?.thicknessRule),
    accessories: inline(raw?.accessories, 'keo dán và ghim kẹp nhỏ'),
    // Danh sách parts được nối bằng "; " rồi đóng câu bằng "." — mảnh nào mang sẵn dấu chấm cuối
    // sẽ cho ra "...bám đất.; ...cân bằng.." nên phải cắt như các trường nhúng giữa câu khác.
    parts: (Array.isArray(raw?.parts) ? raw.parts : []).map((p) => inline(p)).filter(Boolean),
    actA: str(raw?.actA),
    actBDraw: str(raw?.actBDraw),
    actBCut: arr(raw?.actBCut),
    actBFlatLay: str(raw?.actBFlatLay),
    actC: arr(raw?.actC),
    actDIntro: str(raw?.actDIntro),
    actD: arr(raw?.actD),
    finishedLook: str(raw?.finishedLook),
    paletteNote: inline(raw?.paletteNote),
    youtubeTitle: str(raw?.youtubeTitle),
    youtubeHashtags: arr(raw?.youtubeHashtags),
    tiktokCaption: str(raw?.tiktokCaption),
    tiktokHashtags: arr(raw?.tiktokHashtags),
    stateStart: inline(raw?.stateStart),
    stateAfterA: inline(raw?.stateAfterA),
    stateAfterB: inline(raw?.stateAfterB),
    stateAfterC: inline(raw?.stateAfterC),
    backgroundNote: str(raw?.backgroundNote, 'Nền phía sau là bàn làm việc xám, hơi out-of-focus.'),
    visualStyle: str(raw?.visualStyle),
    audio: str(raw?.audio),
  };
}
