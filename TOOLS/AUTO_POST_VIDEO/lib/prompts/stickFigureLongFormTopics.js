/**
 * Kho chủ đề dành riêng cho VIDEO DÀI (4-10 phút) của skill "Kịch Bản & Slide Ảnh Người Que".
 *
 * Vì sao phải có kho riêng thay vì dùng lại `suggestions` sẵn có trong categories.js:
 * các gợi ý cũ được viết cho video ngắn dưới 1 phút — chúng là một VẤN NẠN ĐƠN LẺ, gọn
 * ("Procrastinating important tasks until the last minute"). Đem một chủ đề như vậy kéo dài 8 phút
 * thì Gemini chỉ còn cách nói vòng vo, lặp ý, đúng thứ làm người xem thoát giữa chừng.
 *
 * Chủ đề ở đây được chọn theo tiêu chí khác hẳn: mỗi cái phải CHỨA SẴN nhiều nhánh nội dung để
 * khai triển (nguyên nhân → biểu hiện → hệ quả → cách xử lý → ví dụ), tức là tự nó đã có cấu trúc
 * đủ nuôi một video dài mà không cần độn thêm.
 *
 * `text` viết bằng TIẾNG ANH vì nó được đưa thẳng vào ô "scenario" — prompt của skill này yêu cầu
 * lời kể 100% tiếng Anh đơn giản (xem imageSlideshow.js), gõ tiếng Việt vào sẽ phải qua thêm một
 * lượt dịch không cần thiết. `desc` bằng tiếng Việt để người dùng chọn cho nhanh.
 */
export const STICK_FIGURE_LONGFORM_GROUPS = [
  {
    key: 'habits',
    label: 'Thói Quen & Kỷ Luật',
    icon: '⏰',
    sublabel: 'Trì hoãn, nghiện điện thoại, dậy sớm',
    topics: [
      { id: 1, text: 'Why we procrastinate, and how to actually stop', desc: 'Gốc rễ tâm lý của trì hoãn và cách thoát ra' },
      { id: 2, text: 'How your phone quietly steals hours of your life every day', desc: 'Cơ chế gây nghiện của mạng xã hội' },
      { id: 3, text: 'The real reason you cannot wake up early, and how to fix it', desc: 'Nhịp sinh học và cách xây thói quen dậy sớm' },
      { id: 4, text: 'How small daily habits decide who you become in five years', desc: 'Sức mạnh cộng dồn của thói quen nhỏ' },
      { id: 5, text: 'Why motivation always fails you, and what works instead', desc: 'Vì sao động lực không đáng tin, kỷ luật mới bền' },
      { id: 6, text: 'How to build a habit that finally sticks', desc: 'Quy trình xây thói quen bền vững từng bước' },
      { id: 7, text: 'The hidden cost of staying up late every night', desc: 'Thiếu ngủ tàn phá trí nhớ, cảm xúc và sức khỏe' },
      { id: 8, text: 'Why doing less can help you achieve much more', desc: 'Tập trung ít việc thay vì ôm đồm' },
    ],
  },
  {
    key: 'study',
    label: 'Học Tập & Trí Nhớ',
    icon: '📚',
    sublabel: 'Cách học, tập trung, ghi nhớ',
    topics: [
      { id: 1, text: 'Why you forget almost everything you study, and how to fix it', desc: 'Đường cong quên lãng và cách ôn tập ngắt quãng' },
      { id: 2, text: 'How to actually focus in a world full of distractions', desc: 'Rèn khả năng tập trung sâu' },
      { id: 3, text: 'The wrong way most students study, and what to do instead', desc: 'Đọc lại thụ động vs chủ động gợi nhớ' },
      { id: 4, text: 'Why cramming the night before never really works', desc: 'Học dồn và giới hạn của trí nhớ ngắn hạn' },
      { id: 5, text: 'How to learn a new language without giving up in a month', desc: 'Lộ trình học ngoại ngữ thực tế, bền bỉ' },
      { id: 6, text: 'Why smart people still fail exams', desc: 'Kỹ năng làm bài và quản lý áp lực thi cử' },
      { id: 7, text: 'How to remember names, faces, and everything you read', desc: 'Kỹ thuật ghi nhớ áp dụng được ngay' },
      { id: 8, text: 'Why taking notes the usual way is a waste of time', desc: 'Ghi chép chủ động thay vì chép lại' },
    ],
  },
  {
    key: 'mindset',
    label: 'Tư Duy & Cảm Xúc',
    icon: '🧠',
    sublabel: 'Lo âu, tự ti, áp lực đồng trang lứa',
    topics: [
      { id: 1, text: 'Why comparing yourself to others online makes you miserable', desc: 'So sánh trên mạng xã hội và lòng tự trọng' },
      { id: 2, text: 'How fear of failure keeps you stuck where you are', desc: 'Nỗi sợ thất bại và cách vượt qua' },
      { id: 3, text: 'Why you feel tired even when you did nothing all day', desc: 'Mệt mỏi tinh thần khác mệt mỏi thể chất' },
      { id: 4, text: 'How overthinking destroys your decisions and your sleep', desc: 'Vòng lặp suy nghĩ quá mức và cách cắt đứt' },
      { id: 5, text: 'Why you feel like a fraud even when you succeed', desc: 'Hội chứng kẻ mạo danh' },
      { id: 6, text: 'How to stop caring so much about what people think', desc: 'Thoát khỏi áp lực ánh nhìn người khác' },
      { id: 7, text: 'Why being too hard on yourself slows you down', desc: 'Tự trách bản thân và lòng trắc ẩn với chính mình' },
      { id: 8, text: 'How to deal with pressure when everyone seems ahead of you', desc: 'Áp lực đồng trang lứa và nhịp độ riêng' },
    ],
  },
  {
    key: 'money',
    label: 'Tiền Bạc & Nghề Nghiệp',
    icon: '💰',
    sublabel: 'Chi tiêu, tiết kiệm, chọn nghề',
    topics: [
      { id: 1, text: 'Why you never have money left at the end of the month', desc: 'Rò rỉ chi tiêu và cách kiểm soát' },
      { id: 2, text: 'How advertising makes you buy things you do not need', desc: 'Tâm lý học đằng sau quảng cáo' },
      { id: 3, text: 'Why saving a little every month beats earning a lot', desc: 'Lãi kép và thói quen tiết kiệm sớm' },
      { id: 4, text: 'How to choose a career without regretting it later', desc: 'Chọn nghề dựa trên dữ kiện thay vì cảm tính' },
      { id: 5, text: 'Why your first job matters less than you think', desc: 'Kỹ năng tích lũy quan trọng hơn chức danh đầu tiên' },
      { id: 6, text: 'How people quietly fall into debt without noticing', desc: 'Cơ chế nợ tiêu dùng và trả góp' },
      { id: 7, text: 'Why working harder does not always mean earning more', desc: 'Làm việc thông minh và giá trị tạo ra' },
      { id: 8, text: 'How to start saving when you feel you earn too little', desc: 'Bắt đầu tiết kiệm với thu nhập nhỏ' },
    ],
  },
  {
    key: 'social',
    label: 'Giao Tiếp & Quan Hệ',
    icon: '🤝',
    sublabel: 'Ngại nói, kết bạn, ranh giới',
    topics: [
      { id: 1, text: 'Why you freeze when you have to speak in front of people', desc: 'Cơ chế sợ nói trước đám đông và cách luyện' },
      { id: 2, text: 'How to make real friends as an adult', desc: 'Xây dựng quan hệ chất lượng khi đã trưởng thành' },
      { id: 3, text: 'Why saying no is harder than it should be', desc: 'Đặt ranh giới mà không thấy tội lỗi' },
      { id: 4, text: 'How to have a conversation people actually enjoy', desc: 'Kỹ năng lắng nghe và dẫn dắt câu chuyện' },
      { id: 5, text: 'Why some people are remembered and others are forgotten', desc: 'Ấn tượng đầu tiên và dấu ấn cá nhân' },
      { id: 6, text: 'How being too nice can quietly hurt you', desc: 'Tử tế nhưng phải có giới hạn' },
      { id: 7, text: 'Why misunderstandings happen even between close people', desc: 'Rào cản giao tiếp trong quan hệ thân thiết' },
      { id: 8, text: 'How to apologize in a way that actually repairs things', desc: 'Xin lỗi đúng cách để hàn gắn quan hệ' },
    ],
  },
  {
    key: 'health',
    label: 'Sức Khỏe & Lối Sống',
    icon: '🌿',
    sublabel: 'Ăn uống, vận động, nghỉ ngơi',
    topics: [
      { id: 1, text: 'What sitting all day is really doing to your body', desc: 'Tác hại của lối sống ít vận động' },
      { id: 2, text: 'Why skipping breakfast affects your whole day', desc: 'Bữa sáng, đường huyết và khả năng tập trung' },
      { id: 3, text: 'How stress slowly damages your body without you noticing', desc: 'Căng thẳng mạn tính và hệ quả lên sức khỏe' },
      { id: 4, text: 'Why drinking enough water changes more than you expect', desc: 'Mất nước nhẹ ảnh hưởng trí nhớ và tâm trạng' },
      { id: 5, text: 'How just twenty minutes of walking a day changes everything', desc: 'Vận động nhẹ đều đặn thay vì tập nặng thất thường' },
      { id: 6, text: 'Why you keep feeling hungry even after eating', desc: 'Thực phẩm chế biến và tín hiệu no giả' },
      { id: 7, text: 'How screens before bed ruin your sleep quality', desc: 'Ánh sáng xanh và giấc ngủ sâu' },
      { id: 8, text: 'Why rest is not laziness', desc: 'Nghỉ ngơi là một phần của hiệu suất' },
    ],
  },
];

/** Tổng số chủ đề — dùng cho nhãn nút, khỏi phải đếm tay rồi lệch mỗi lần thêm bớt. */
export const STICK_FIGURE_LONGFORM_TOPIC_COUNT = STICK_FIGURE_LONGFORM_GROUPS
  .reduce((sum, g) => sum + g.topics.length, 0);
