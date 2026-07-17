// Dàn nhân vật cố định cho dòng "Video Người Que Học Tiếng Anh". Chọn cùng 1 nhóm nhân vật
// xuyên suốt nhiều video giúp khán giả nhận diện thương hiệu và có thể nối thành 1 câu
// chuyện dài (series) thay vì mỗi video là 1 nhân vật xa lạ.
// Mỗi nhân vật có 2 bộ mô tả: bộ tiếng Việt (personality/trait/role/voiceHint) chỉ dùng để
// hiển thị trên giao diện chọn nhân vật, và bộ tiếng Anh (en.*) dùng để ghép vào prompt Veo3
// cuối cùng — giữ cho toàn bộ prompt gửi cho Gemini/Veo3 luôn là tiếng Anh, không lẫn tiếng Việt.
export const STICK_FIGURE_CHARACTERS = [
  {
    id: 'alex',
    name: 'Alex',
    images: ['/images/characters/alex_front.png', '/images/characters/alex_sheet.png'],
    personality: 'Vui vẻ, nhiệt tình nhưng hơi vụng về; luôn cố gắng nói tiếng Anh dù hay lỡ lời',
    trait: 'Đội mũ lưỡi trai (cap), tay luôn cầm điện thoại',
    role: 'Nhân vật chính — người đang học tiếng Anh, hay rơi vào tình huống dở khóc dở cười',
    voiceHint: 'Giọng nam trẻ, năng lượng cao, nói hơi nhanh và đôi khi lắp bắp khi hồi hộp',
    en: {
      personality: 'Cheerful and enthusiastic but a bit clumsy; always tries to speak English even though he often stumbles over his words',
      trait: 'Wears a baseball cap, always holding a phone',
      role: 'Main character — an English learner who often finds himself in awkwardly funny situations',
      voiceHint: 'Young male voice, high energy, speaks a bit fast and sometimes stammers when nervous'
    }
  },
  {
    id: 'mia',
    name: 'Mia',
    images: ['/images/characters/mia_front.png', '/images/characters/mia_sheet.png'],
    personality: 'Thông minh, tự tin, thích sửa lỗi tiếng Anh cho người khác theo kiểu dí dỏm chứ không khó chịu',
    trait: 'Tóc buộc đuôi ngựa cao, đeo kính tròn nhỏ',
    role: '"Cô giáo không chính thức" của nhóm — thường đóng vai người sửa lỗi hoặc hướng dẫn',
    voiceHint: 'Giọng nữ rõ ràng, phát âm chuẩn, tốc độ vừa phải, hơi tinh nghịch',
    en: {
      personality: "Smart and confident; likes correcting other people's English mistakes in a witty, good-natured way rather than an annoying one",
      trait: 'High ponytail, small round glasses',
      role: 'The group\'s "unofficial teacher" — usually plays the role of corrector or guide',
      voiceHint: 'Clear female voice, precise pronunciation, moderate pace, slightly playful'
    }
  },
  {
    id: 'leo',
    name: 'Leo',
    personality: 'Trầm tính, hài hước kiểu deadpan, phản ứng chậm nhưng câu chốt luôn gây cười',
    trait: 'Đeo balo, mang giày sneaker sọc',
    role: 'Bạn thân của Alex — thường là người chứng kiến/bình luận tình huống trớ trêu',
    voiceHint: 'Giọng nam trầm, tiết tấu chậm rãi, nhấn nhá bất ngờ ở câu thoại hài',
    en: {
      personality: 'Quiet and deadpan funny; reacts slowly but always lands the punchline',
      trait: 'Wears a backpack, striped sneakers',
      role: "Alex's best friend — usually the one witnessing/commenting on the ironic situation",
      voiceHint: 'Deep male voice, slow unhurried pace, unexpected emphasis on the punchline'
    }
  },
  {
    id: 'zoe',
    name: 'Zoe',
    personality: 'Năng động, nói nhanh, hay lo lắng thái quá (overthinker) nhưng đáng yêu',
    trait: 'Luôn cầm ly cà phê to, khoác áo blazer nhẹ',
    role: 'Đồng nghiệp/hàng xóm — thường xuất hiện trong tình huống công sở, mua sắm, đời sống hàng ngày',
    voiceHint: 'Giọng nữ nhanh, nhịp điệu gấp gáp, lên giọng khi lo lắng',
    en: {
      personality: 'Energetic, fast-talking, an endearing overthinker who worries too much',
      trait: 'Always holding a large coffee cup, wearing a light blazer',
      role: 'Coworker/neighbor — usually appears in workplace, shopping, and everyday-life situations',
      voiceHint: 'Fast female voice, rapid rhythm, pitch rises when anxious'
    }
  },
  {
    id: 'tom',
    name: 'Ông Tom (Old Tom)',
    personality: 'Hiền hậu, thông thái, hay đưa ra lời khuyên nhẹ nhàng, mang màu sắc "đạo lý" cuối video',
    trait: 'Đội mũ nồi (beret), có ria mép nhỏ, chống gậy nhẹ',
    role: 'Người lớn tuổi trong khu phố — xuất hiện tạo chiều sâu, thường chốt bài học ở cuối video',
    voiceHint: 'Giọng nam lớn tuổi, ấm áp, tốc độ chậm, phát âm rõ ràng dễ nghe',
    en: {
      personality: "Kind and wise; often gives gentle advice, adding a 'life lesson' tone at the end of the video",
      trait: 'Wears a beret, has a small mustache, leans lightly on a cane',
      role: 'The elder of the neighborhood — adds depth, usually delivers the closing lesson',
      voiceHint: 'Older male voice, warm, slow pace, clear and easy-to-understand pronunciation'
    }
  }
];
