// Mỗi chủ đề có 1 "style mặc định" CỐ ĐỊNH (màu sắc, ánh sáng, khung hình, giọng đọc,
// nhịp phim...) được tái sử dụng cho MỌI video trong series đó — đảm bảo video sau luôn
// giống video trước về mặt hình ảnh/âm thanh để xây dựng nhận diện thương hiệu.
export const PROMPT_CATEGORIES = {
  english_quiz: {
    key: 'english_quiz',
    type: 'video',
    label: 'Video Trả Lời Câu Hỏi Tiếng Anh',
    icon: '❓',
    description: 'Video quiz ngắn: đưa ra câu hỏi tiếng Anh, đếm giờ, tiết lộ đáp án + giải thích.',
    fields: [
      { key: 'question', label: 'Câu hỏi tiếng Anh', type: 'text', required: true, placeholder: 'What is the past tense of "go"?' },
      { key: 'options', label: 'Các đáp án (mỗi dòng 1 đáp án)', type: 'textarea', required: true, placeholder: 'A. Goed\nB. Went\nC. Gone\nD. Going' },
      { key: 'correctAnswer', label: 'Đáp án đúng', type: 'text', required: true, placeholder: 'B. Went' },
      { key: 'explanation', label: 'Giải thích ngắn gọn (tiếng Anh đơn giản)', type: 'textarea', required: true, placeholder: '"Go" is an irregular verb. The past tense is "went", not "goed".' },
      {
        key: 'topic',
        label: 'Chủ đề ngữ pháp / từ vựng (tuỳ chọn)',
        type: 'text',
        required: false,
        placeholder: 'Irregular verbs',
        suggestions: [
          'Irregular verbs',
          'Present perfect vs. past simple',
          'Prepositions of place',
          'Comparatives and superlatives',
          'Modal verbs (can, should, must)',
          'Phrasal verbs',
          'Countable vs. uncountable nouns',
          'Question words (who, what, where...)',
          'Past continuous',
          'First conditional sentences',
          'Articles (a, an, the)',
          "Confusing word pairs (its/it's, there/their)"
        ]
      }
    ],
    defaultStyle: {
      series: 'Boost Your English - Quiz Series',
      aspectRatio: '9:16',
      durationSeconds: 25,
      visualStyle: 'Clean flat 2D motion graphics, modern educational app aesthetic, minimal vector shapes, no photorealism',
      colorPalette: ['#FE2C55', '#25F4EE', '#121118', '#FFFFFF'],
      lighting: 'Flat even studio lighting, no shadows, bright and energetic',
      camera: 'Static frontal camera; subtle zoom pulse on the countdown; quick punch-in when the correct answer is revealed',
      moodTone: 'Upbeat, playful, game-show energy',
      typographyNote: 'Large bold sans-serif for the question at the top third; 4 answer cards in a 2x2 grid; circular countdown ring center-bottom',
      characters: 'Small friendly cartoon mascot (owl or robot) reacting with simple expressions to correct/wrong answers',
      voice: 'Energetic young adult voice, clear and simple English pronunciation',
      music: 'Upbeat quiz-show synth loop; tension rises during the countdown; short victory sting on reveal',
      sfx: 'Tick-tock countdown, "ding" on correct answer, soft "buzz" on wrong answer'
    }
  },

  stick_figure: {
    key: 'stick_figure',
    type: 'video',
    label: 'Video Người Que Học Tiếng Anh',
    icon: '🚶',
    description: 'Kịch bản đời thường ngắn do 2 nhân vật người que thực hiện, lồng thoại tiếng Anh cơ bản để học.',
    fields: [
      { key: 'characterIds', label: 'Nhân vật xuất hiện (chọn 1-3)', type: 'character-select', required: true, minSelect: 1, maxSelect: 3 },
      {
        key: 'scenario',
        label: 'Tình huống / bối cảnh ngắn',
        type: 'text',
        required: true,
        placeholder: 'Ordering coffee at a small café',
        suggestions: [
          { text: 'Ordering coffee at a small cafe', people: 2 },
          { text: 'Asking a stranger for directions to the train station', people: 2 },
          { text: 'A job interview that goes slightly wrong', people: 2 },
          { text: 'Grocery shopping and mixing up two similar words', people: 2 },
          { text: 'Checking into a hotel with a booking mix-up', people: 2 },
          { text: 'Returning a broken product at a store', people: 2 },
          { text: 'Meeting a new coworker on the first day', people: 2 },
          { text: 'Ordering food at a restaurant and mispronouncing a dish', people: 2 },
          { text: 'Talking on the phone with a delivery driver', people: 1 },
          { text: 'Catching a taxi and giving the wrong address', people: 2 },
          { text: 'Checking in at the airport before a flight', people: 2 },
          { text: 'Borrowing a tool from a neighbor', people: 2 },
          { text: 'Complaining politely about noisy neighbors', people: 2 },
          { text: 'Planning a weekend trip with a friend', people: 2 },
          { text: 'Asking to swap seats on a bus', people: 2 },
          { text: 'Practicing an English speech alone in front of a mirror', people: 1 },
          { text: 'Three friends deciding where to eat for lunch', people: 3 },
          { text: 'A group project discussion at school', people: 3 },
          { text: 'Welcoming a foreign exchange student to the neighborhood', people: 2 },
          { text: 'Teaching a friend how to say a tricky English phrase', people: 2 }
        ]
      },
      { key: 'script', label: 'Kịch bản thoại tiếng Anh (mỗi dòng 1 câu, dùng A:/B:/C: theo đúng thứ tự nhân vật đã chọn ở trên — hệ thống sẽ tự thay bằng tên nhân vật)', type: 'textarea', required: true, placeholder: 'A: Hi! Can I get a small latte, please?\nB: Sure! For here or to go?\nA: To go, thanks.' },
      { key: 'keyPhrase', label: 'Cụm từ / mẫu câu trọng tâm cần dạy (tuỳ chọn)', type: 'text', required: false, placeholder: '"Can I get...?" / "For here or to go?"' },
      { key: 'continuityNote', label: 'Liên hệ tới tập trước (tuỳ chọn — để nối thành 1 câu chuyện dài)', type: 'text', required: false, placeholder: 'Tiếp nối tập trước: Alex vừa làm quen với Mia ở quán cà phê' }
    ],
    defaultStyle: {
      series: 'Stick Figure English Life',
      aspectRatio: '9:16',
      durationSeconds: 30,
      visualStyle: 'Minimalist whiteboard-animation style, hand-drawn black ink stick figures (circle head, simple line body/limbs) on a plain white/cream background. Mouths must be simple and clean when speaking — a small line that opens/closes minimally; avoid fast, exaggerated, or blurry lip-flapping motion that could render as a smudge',
      colorPalette: ['#000000', '#FFFFFF', '#FE2C55 (single accent prop per episode)'],
      lighting: 'Flat 2D sketch lighting, no shadows',
      camera: 'Mostly static wide/medium shot showing both characters fully; occasional simple cut between two fixed compositions',
      moodTone: 'Light, humorous, relatable everyday-life energy',
      typographyNote: 'Simple black-outline comic-style speech bubble above the speaking character\'s head, containing ONLY a short English caption (a few words, not the full sentence) in bold clean lettering. The bubble must appear instantly with a hard cut — no fade-in, slide, or animated transition — stay static for the full line, then cut directly to the next caption (or disappear) the same way. No subtitle bar anywhere on screen.',
      characters: 'Exactly 2 simple black stick-figure characters, each with ONE small consistent prop/accessory (e.g. Character A always wears a tiny hat, Character B always holds a cup) so they stay recognizable across every episode',
      voice: 'Two distinct casual voices (Character A / Character B), natural conversational pace, everyday basic English vocabulary',
      music: 'Light acoustic ukulele or lo-fi loop, very low volume under the dialogue',
      sfx: 'Minimal soft foley only where the scene needs it (door bell, cup clink, footsteps)'
    }
  },

  moral_wisdom: {
    key: 'moral_wisdom',
    type: 'video',
    label: 'Video Đạo Lý Tiếng Anh',
    icon: '🌅',
    description: 'Video ngắn kể một tình huống đời thường rút ra bài học/đạo lý, tường thuật bằng tiếng Anh cơ bản.',
    fields: [
      {
        key: 'theme',
        label: 'Chủ đề đạo lý / bài học',
        type: 'text',
        required: true,
        placeholder: 'Kindness always comes back to you',
        suggestions: [
          'Kindness always comes back to you',
          'Honesty is the best policy',
          'Hard work pays off in the end',
          'Patience brings the best rewards',
          'Never give up on your dreams',
          'Sharing is caring',
          'Respect others even when they are different',
          'Actions speak louder than words',
          "A small act of kindness can change someone's day",
          'Family comes first',
          'True friends stay through hard times',
          "It's never too late to start again"
        ]
      },
      { key: 'story', label: 'Tình huống / câu chuyện ngắn minh họa', type: 'textarea', required: true, placeholder: 'A boy shares his lunch with a hungry stray dog every day. Years later, when he is lost in the forest, the same dog (now grown) finds and saves him.' },
      { key: 'quote', label: 'Câu trích dẫn / thông điệp chính (tiếng Anh đơn giản)', type: 'text', required: true, placeholder: '"Kindness is never wasted."' }
    ],
    defaultStyle: {
      series: 'Simple English Wisdom',
      aspectRatio: '9:16',
      durationSeconds: 35,
      visualStyle: 'Warm cinematic live-action look, soft naturalistic color grade, gentle film-grain texture, relatable real-world settings',
      colorPalette: ['warm amber/golden-hour tones', 'soft desaturated background colors', '#FE2C55 (accent for the closing text overlay)'],
      lighting: 'Soft warm golden-hour or window light, gentle contrast, cozy inviting atmosphere',
      camera: 'Slow, calm camera movement only — gentle push-in or slow pan, no fast cuts, contemplative pacing',
      moodTone: 'Reflective, heartfelt, gently inspirational, never preachy',
      typographyNote: 'Key quote/message appears as an elegant centered text overlay in the final 3 seconds, clean serif or simple sans-serif font, soft fade-in; persistent bilingual subtitle bar (English/Vietnamese) throughout narration',
      characters: 'Ordinary relatable people matching the story (age/appearance can vary per episode), authentic everyday expressions',
      voice: 'Warm, calm, slightly slow-paced narrator voice, very simple English (CEFR A2 level: short sentences, common everyday words only)',
      music: 'Soft emotional piano or acoustic guitar underscore, swells gently at the closing message',
      sfx: 'Natural ambient sound only (wind, room tone, footsteps) — no artificial effects, keeps it grounded and authentic'
    }
  },

  english_tips: {
    key: 'english_tips',
    type: 'video',
    label: 'Video Mẹo Học Tiếng Anh',
    icon: '💡',
    description: 'Video whiteboard-animation nhiều cảnh nối tiếp kiểu "Effortless English": mở đầu gây chú ý, liệt kê mẹo/quy tắc học tiếng Anh, ví dụ minh họa, kêu gọi hành động. CHỈ hỗ trợ tạo qua Gemini AI phân đoạn (video dài 1-3 phút, nhiều cảnh).',
    fields: [
      { key: 'hook', label: 'Câu mở đầu gây chú ý (hook)', type: 'text', required: true, placeholder: 'Want to speak English more naturally?' },
      { key: 'ruleTitle', label: 'Tên mẹo / quy tắc chính', type: 'text', required: true, placeholder: 'Effortless English Rule 1: Learn Phrases, Not Words' },
      {
        key: 'keyPoints',
        label: 'Các ý chính sẽ dạy (mỗi dòng 1 ý)',
        type: 'textarea',
        required: true,
        placeholder: 'Why memorizing single words slows down your progress\nHow learning phrases helps you speak naturally\nA simple method to remember vocabulary faster'
      },
      { key: 'example', label: 'Ví dụ minh họa cụ thể', type: 'textarea', required: true, placeholder: 'Instead of memorizing the word "go", learn the whole phrase: "go to the gym", "go shopping", "go on vacation".' },
      { key: 'closingCTA', label: 'Lời kêu gọi hành động cuối video (tuỳ chọn)', type: 'text', required: false, placeholder: 'Like, Subscribe, and turn on notifications for weekly English lessons.' }
    ],
    defaultStyle: {
      series: 'Effortless English Tips',
      aspectRatio: '9:16',
      durationSeconds: 150,
      visualStyle: 'Minimalist hand-drawn whiteboard-animation style, clean black ink line illustrations and simple icons/diagrams on a plain white/cream background, no photorealism, no recurring character mascot',
      colorPalette: ['#000000', '#FFFFFF', '#FE2C55 (single accent for key text/highlights)'],
      lighting: 'Flat 2D sketch lighting, no shadows',
      camera: 'Mostly static wide shot of the whiteboard; occasional slow simple pan or zoom-in onto the key text/diagram being discussed',
      moodTone: 'Friendly, confident, encouraging teacher energy — clear and motivating, never boring',
      typographyNote: 'Bold on-screen keyword/bullet text appears in sync with the narration to reinforce each point, clean sans-serif lettering. Text/diagram elements appear instantly with a hard cut — no fade-in, slide, or animated transition — then cut directly to the next element the same way',
      characters: 'No recurring character — visuals are simple hand-drawn icons, diagrams, objects, and short text callouts illustrating each teaching point',
      voice: 'Warm, confident, clear narrator voice, natural teaching pace, simple direct sentences, encouraging tone',
      music: 'Light inspirational lo-fi or acoustic background loop, low volume under the narration',
      sfx: 'Minimal soft whoosh/pop sound whenever a new on-screen text or diagram element appears'
    }
  },

  character_ref: {
    key: 'character_ref',
    type: 'image',
    label: 'Nhân Vật (Ảnh Tham Chiếu)',
    icon: '🧑‍🎨',
    description: 'Tạo ảnh tham chiếu (character reference) cho 1 nhân vật, chọn phong cách ảnh tuỳ ý (người que / ảnh thật / anime / 3D...), dùng làm ảnh gốc để tạo ảnh/video nhất quán xuyên suốt series.',
    fields: [
      { key: 'imageStyle', label: 'Chọn phong cách ảnh', type: 'style-select', required: true },
      { key: 'shotType', label: 'Chọn bố cục / góc chụp', type: 'layout-select', required: true },
      { 
        key: 'aspectRatio', 
        label: 'Tỉ lệ khung hình ảnh', 
        type: 'select', 
        required: true, 
        defaultValue: '3:4',
        options: [
          { value: '3:4', label: '3:4 (Chân dung dọc)' },
          { value: '1:1', label: '1:1 (Hình vuông)' },
          { value: '16:9', label: '16:9 (Màn hình ngang)' },
          { value: '9:16', label: '9:16 (Màn hình dọc điện thoại)' },
          { value: '4:3', label: '4:3 (Khung hình cổ điển)' }
        ]
      },
      {
        key: 'ageGroup',
        label: 'Độ tuổi / Nhóm tuổi',
        type: 'select',
        required: true,
        defaultValue: 'adult',
        options: [
          { value: 'adult', label: 'Người lớn / Thanh niên' },
          { value: 'child', label: 'Trẻ em' },
          { value: 'teenager', label: 'Thiếu niên' },
          { value: 'elderly', label: 'Người già' }
        ]
      },
      {
        key: 'exactAge',
        label: 'Nhập tuổi cụ thể (tuỳ chọn)',
        type: 'text',
        required: false,
        placeholder: 'Ví dụ: 25 tuổi, 8 tuổi...'
      },
      {
        key: 'height',
        label: 'Chiều cao / Thể hình',
        type: 'select',
        required: true,
        defaultValue: 'medium',
        options: [
          { value: 'medium', label: 'Trung bình / Vừa vặn' },
          { value: 'short', label: 'Thấp / Nhỏ nhắn' },
          { value: 'tall', label: 'Cao ráo' }
        ]
      },
      {
        key: 'hairLength',
        label: 'Chiều dài tóc',
        type: 'select',
        required: true,
        defaultValue: 'short_hair',
        options: [
          { value: 'short_hair', label: 'Tóc ngắn' },
          { value: 'long_hair', label: 'Tóc dài' },
          { value: 'medium_hair', label: 'Tóc lỡ / Ngang vai' },
          { value: 'bald', label: 'Trọc / Không tóc' }
        ]
      },
      {
        key: 'hairColor',
        label: 'Màu tóc',
        type: 'select',
        required: true,
        defaultValue: 'black',
        options: [
          { value: 'black', label: 'Tóc đen' },
          { value: 'brown', label: 'Tóc nâu' },
          { value: 'blonde', label: 'Tóc vàng' },
          { value: 'grey', label: 'Tóc bạc / xám' },
          { value: 'red', label: 'Tóc đỏ' }
        ]
      },
      {
        key: 'personality',
        label: 'Tính cách / Thần thái',
        type: 'select',
        required: true,
        defaultValue: 'friendly',
        options: [
          { value: 'friendly', label: 'Thân thiện / Cởi mở' },
          { value: 'energetic', label: 'Năng động / Hoạt bát' },
          { value: 'gentle', label: 'Dịu dàng / Điềm đạm' },
          { value: 'confident', label: 'Tự tin' },
          { value: 'cool', label: 'Ngầu / Cá tính' },
          { value: 'serious', label: 'Nghiêm túc / Lạnh lùng' },
          { value: 'shy', label: 'Rụt rè / Nhút nhát' }
        ]
      },
      {
        key: 'characterDescription',
        label: 'Mô tả các đặc điểm đặc biệt / trang phục nhân vật (không bắt buộc)',
        type: 'textarea',
        required: false,
        placeholder: 'Ví dụ: Mặc áo khoác jean xanh, đeo kính gọng tròn màu đỏ, cười tươi...',
        suggestions: [
          'wearing a blue hoodie and holding a phone',
          'wearing round red glasses and a black jacket',
          'wearing a traditional beret and a light grey sweater',
          'wearing striped sneakers and a red backpack'
        ]
      },
      { key: 'pose', label: 'Tư thế / hành động (tuỳ chọn)', type: 'text', required: false, placeholder: 'Waving happily with one hand raised' },
      { key: 'expression', label: 'Biểu cảm khuôn mặt (tuỳ chọn)', type: 'text', required: false, placeholder: 'Big open smile' }
    ],
    defaultStyle: {
      aspectRatio: '3:4'
    }
  },

  stick_figure_slideshow: {
    key: 'stick_figure_slideshow',
    type: 'slideshow',
    label: 'Kịch Bản & Slide Ảnh Người Que',
    icon: '📸',
    description: 'Tạo kịch bản thoại ngắn và danh sách prompt để sinh ảnh người que cho từng phân cảnh, ghép thành video slideshow tiếng Anh nhất quán.',
    fields: [
      { 
        key: 'aspectRatio', 
        label: 'Định dạng video (Tỉ lệ)', 
        type: 'select', 
        required: true, 
        defaultValue: '9:16',
        options: [
          { value: '9:16', label: 'YouTube Shorts (Màn dọc 9:16)' },
          { value: '16:9', label: 'YouTube Dài (Màn ngang 16:9)' }
        ]
      },
      {
        key: 'folderPath',
        label: 'Thư mục chứa tài nguyên (nằm trong public/ của Remotion)',
        type: 'text',
        required: true,
        defaultValue: '',
        placeholder: 'Tự động sinh theo bối cảnh, hoặc tự nhập tay (ví dụ: my-video)'
      },
      {
        key: 'imageExt',
        label: 'Định dạng ảnh',
        type: 'select',
        required: true,
        defaultValue: 'jpg',
        options: [
          { value: 'jpg', label: '.jpg' },
          { value: 'png', label: '.png' },
          { value: 'svg', label: '.svg' },
          { value: 'jpeg', label: '.jpeg' }
        ]
      },
      {
        key: 'audioExt',
        label: 'Định dạng âm thanh',
        type: 'select',
        required: true,
        defaultValue: 'mp3',
        options: [
          { value: 'mp3', label: '.mp3' },
          { value: 'wav', label: '.wav' },
          { value: 'm4a', label: '.m4a' }
        ]
      },
      {
        key: 'scenario',
        label: 'Chủ đề / vấn nạn muốn thuyết minh',
        type: 'textarea',
        required: true,
        placeholder: 'The habit of procrastination among students',
        suggestions: [
          { text: 'Wasting hours scrolling social media instead of sleeping', people: 1 },
          { text: 'Procrastinating important tasks until the last minute', people: 1 },
          { text: 'The pressure of comparing your life to others online', people: 1 },
          { text: 'Being too shy to speak up in class or at work', people: 1 },
          { text: 'Spending money on things you do not really need', people: 1 },
          { text: 'Skipping breakfast because you are always in a rush', people: 1 },
          { text: 'Struggling to balance study and rest', people: 1 },
          { text: 'Feeling anxious before a big exam', people: 1 },
          { text: 'The habit of complaining instead of taking action', people: 1 },
          { text: 'Ignoring your health until it is too late', people: 1 },
          { text: 'The struggle of waking up early every morning', people: 1 },
          { text: 'Being addicted to your phone during family time', people: 2 },
          { text: 'Giving up too quickly when things get hard', people: 1 },
          { text: 'The fear of making mistakes in front of others', people: 1 },
          { text: 'Forgetting to drink enough water every day', people: 1 },
          { text: 'Bullying and its effect on a shy classmate', people: 2 },
          { text: 'Overworking and forgetting to rest', people: 1 },
          { text: 'Making excuses instead of practicing English every day', people: 1 }
        ]
      },
      { key: 'script', label: 'Gợi ý nội dung thuyết minh (tuỳ chọn, tiếng Anh — hệ thống sẽ viết lại thành lời thuyết minh mạch lạc)', type: 'textarea', required: false, placeholder: 'Something about how people keep checking their phones instead of focusing on real life, and how it slowly affects their sleep and relationships.' }
    ],
    defaultStyle: {
      series: 'Stick Figure English Slideshow',
      aspectRatio: '9:16',
      durationSeconds: 30
    }
  }
};
