/**
 * Đăng ký DUY NHẤT các "Nhóm chủ đề gợi ý" của dòng Video Nói Chuyện Đạo Lý.
 *
 * Trước đây danh sách nhóm chủ đề bị chép tay ở 5 nơi: lưới chọn nhóm (MoralThemePicker trong
 * ContentForm.js), 2 chỗ đặt nhãn nút "Lộ trình 50 chủ đề" (cũng trong ContentForm.js), tab nhóm
 * trong MoralSyllabusModal.js, và — nguy hiểm nhất — phép so sánh chọn VĂN PHONG trong
 * moralTalkVoiceStyle.js (`theme === 'self_help' || theme === 'rules_of_life'`).
 *
 * Cái cuối là một cái bẫy im lặng: mọi nhóm chủ đề MỚI thêm vào sẽ tự động rơi xuống nhánh
 * else (văn phong liệt kê "Một. Hai. Ba...") dù nội dung của nó là văn phản tư tâm tình — và 2
 * ternary đặt nhãn kia sẽ gọi tên nó là "Quy tắc ứng xử". Không có lỗi nào được báo ra, chỉ là
 * video xuất ra sai giọng. Vì vậy MỖI nhóm chủ đề phải khai báo `voice` TƯỜNG MINH ở đây, và mọi
 * nơi khác đọc từ file này thay vì tự đoán bằng so sánh chuỗi.
 *
 * voice:
 *   'reflective' — văn phản tư ấm áp, nói trực tiếp "bạn/chúng ta", giàu ẩn dụ, mở bằng câu hỏi
 *                  tu từ. Ít slide hơn, mỗi slide dài hơn (8-15 giây).
 *   'list'       — văn liệt kê "sự thật trải đời": ngắn, thẳng, dẫn bằng số thứ tự trần trụi
 *                  ("Một. Hai. Ba."). Nhiều slide hơn, mỗi slide ngắn hơn (6-10 giây).
 *   'satire'     — văn châm biếm hài, giọng Gen Z: xoáy vào MỘT từ lóng đang trend, lặp lại đúng
 *                  từ đó xuyên suốt, nhịp punchline. Nhịp slide bám theo 'list' (ngắn, nhiều).
 *
 * styleLabel là mô tả tiếng Anh đưa thẳng vào prompt Gemini (THEME CHARACTERISTIC) — viết bằng
 * tiếng Anh vì phần còn lại của prompt cũng vậy.
 */
export const MORAL_THEMES = [
  {
    key: 'self_help',
    label: 'Self-Help',
    sub: 'Động lực & Kỷ luật',
    icon: '💪',
    voice: 'reflective',
    styleLabel: 'Self-Help / Motivation / Discipline'
  },
  {
    key: 'top_lists',
    label: 'Top Những Thứ',
    sub: 'Cảnh báo & Mẹo',
    icon: '📌',
    voice: 'list',
    styleLabel: 'Top Lists / Warnings / Tips / Taboos'
  },
  {
    key: 'rules_of_life',
    label: 'Quy Tắc Ứng Xử',
    sub: 'Giao tiếp & Kỹ năng',
    icon: '🤝',
    voice: 'reflective',
    styleLabel: 'Rules of Life / Communication / Etiquette'
  },
  {
    key: 'harsh_truths',
    label: 'Sự Thật Phũ Phàng',
    sub: 'Trải đời & Tỉnh ngộ',
    icon: '💀',
    voice: 'list',
    styleLabel: 'Harsh Truths / Hard-Won Life Realities — blunt truth-telling the audience has never heard said out loud'
  },
  {
    key: 'mind_reading',
    label: 'Đọc Vị Tâm Lý',
    sub: 'Dấu hiệu & Hành vi',
    icon: '🧠',
    voice: 'list',
    styleLabel: 'Practical Psychology / Reading People / Behavioural Signs'
  },
  {
    key: 'money_youth',
    label: 'Tiền & Tuổi Trẻ',
    sub: 'Tài chính thực tế',
    icon: '💸',
    voice: 'list',
    styleLabel: 'Money & Personal Finance for Young People — concrete, practical, no abstract theory'
  },
  {
    key: 'love_boundaries',
    label: 'Tình Cảm & Ranh Giới',
    sub: 'Yêu & Tự trọng',
    icon: '💔',
    voice: 'reflective',
    styleLabel: 'Love, Self-Worth & Personal Boundaries'
  },
  {
    key: 'healing_pressure',
    label: 'Chữa Lành & Áp Lực',
    sub: 'Mệt mỏi & Tự chữa',
    icon: '🌧️',
    voice: 'reflective',
    styleLabel: 'Healing / Burnout / Peer Pressure & Mental Load of Young People'
  },
  {
    key: 'youth_regrets',
    label: 'Hối Hận Tuổi Trẻ',
    sub: 'Trước 25 & 30',
    icon: '⏳',
    voice: 'list',
    styleLabel: 'Regrets of Youth / Things To Do Before 25-30 — time-deadline framing'
  },
  {
    key: 'inner_world',
    label: 'Thế Giới Nội Tâm',
    sub: 'Hướng nội & Chiều sâu',
    icon: '🌿',
    voice: 'reflective',
    styleLabel: 'Introvert Psychology / Inner Life / Depth of Soul — quiet, contemplative, speaks to those who feel everything deeply'
  },
  {
    key: 'self_acceptance',
    label: 'Chấp Nhận Bản Thân',
    sub: 'Yêu thương bản thân',
    icon: '🌸',
    voice: 'reflective',
    styleLabel: 'Self-Acceptance / Self-Compassion / Letting Go of Perfectionism — gentle, warm, forgiving inner voice'
  },
  {
    key: 'overthinking',
    label: 'Suy Nghĩ Quá Nhiều',
    sub: 'Tâm trí & Bình an',
    icon: '🌀',
    voice: 'reflective',
    styleLabel: 'Overthinking / Anxiety / Finding Mental Stillness — soothing, grounding, helps quiet a restless mind'
  },
  // -----------------------------------------------------------------------------------------------
  // 5 nhóm dưới đây đều dùng văn phong 'list'. Ba nhóm đầu cố ý là bản SONG SINH THỰC CHIẾN của ba
  // nhóm phản tư đã có: 'Ứng Xử Với Sếp' cạnh 'Quy Tắc Ứng Xử', 'Gỡ Rối Suy Nghĩ' cạnh 'Suy Nghĩ
  // Quá Nhiều', 'Kỷ Luật & Thói Quen' cạnh 'Self-Help'.
  //
  // Vì sao phải tách nhóm riêng chứ không nhét thêm chủ đề vào nhóm cũ: `voice` gắn với CẢ NHÓM,
  // không gắn với từng chủ đề. Nhét một chủ đề dạng "7 cách làm X" vào nhóm reflective thì nó vẫn
  // bị đọc bằng giọng phản tư tâm tình — sai hẳn với nội dung liệt kê từng bước.
  // -----------------------------------------------------------------------------------------------
  {
    key: 'boss_etiquette',
    label: 'Ứng Xử Với Sếp',
    sub: 'Công sở & Cấp trên',
    icon: '🎯',
    voice: 'list',
    styleLabel: 'Workplace Etiquette with Bosses & Authority — how to speak up, push back, report work and be seen by the people who decide your career'
  },
  {
    key: 'stop_overthinking',
    label: 'Gỡ Rối Suy Nghĩ',
    sub: 'Cách thoát nghĩ nhiều',
    icon: '🧩',
    voice: 'list',
    styleLabel: 'Actionable Techniques to Stop Overthinking — concrete steps and rules, not comfort; the practical counterpart to the reflective Overthinking theme'
  },
  {
    key: 'discipline_habits',
    label: 'Kỷ Luật & Thói Quen',
    sub: 'Cách duy trì đều đặn',
    icon: '🔁',
    voice: 'list',
    styleLabel: 'Building & Sustaining Discipline / Habit Systems — what to actually do when motivation is gone; environment design over willpower'
  },
  {
    key: 'university_life',
    label: 'Đời Sinh Viên',
    sub: 'Đại học & Định hướng',
    icon: '🎓',
    voice: 'list',
    styleLabel: 'University Life for Vietnamese Students — choosing a major, internships, part-time work, dorm life, campus mistakes that cost four years'
  },
  {
    key: 'after_graduation',
    label: 'Ra Trường & Tìm Việc',
    sub: 'Xin việc & Năm đầu',
    icon: '💼',
    voice: 'list',
    styleLabel: 'Post-Graduation & Job Hunting — CV writing, interviews, salary talk, rejection, surviving the first job'
  },
  {
    key: 'trending_slang',
    label: 'Từ Lóng Trending',
    sub: 'Châm biếm & Bắt trend',
    icon: '🔥',
    voice: 'satire',
    styleLabel: 'Vietnamese Internet Slang Explainer — comedic, satirical Gen Z voice built around ONE trending term (e.g. "Sĩ Vương", "Lốp Trưởng"); the term itself is the punchline and must be repeated verbatim'
  },
  // -----------------------------------------------------------------------------------------------
  // ĐỢT BỔ SUNG THEO NGHIÊN CỨU XU HƯỚNG 2026 (và các năm tiếp theo).
  //
  // Căn cứ: TikTok Next 2026 (chủ đề "Irreplaceable Instinct" — khán giả tìm cái thật, tìm chiều
  // sâu chủ đề thay vì lướt cho vui), báo cáo thị trường lao động VN 2026 (AI định hình lại việc
  // làm của lao động trẻ), khảo sát sức khỏe tinh thần 2026 ("kiệt sức tập thể", sống chậm như một
  // hình thức phản kháng mềm), số liệu 85% người trẻ đô thị dùng điện thoại 6-7 tiếng/ngày, và số
  // liệu tuổi kết hôn lần đầu tăng + tỉ lệ độc thân tăng từ 6,23% (2004) lên 10,1% (2019).
  //
  // Bốn nhóm 'list' đứng trước, bốn nhóm 'reflective' đứng sau — giữ đúng thói quen của file: chọn
  // `voice` theo BẢN CHẤT nội dung, không theo chủ đề nghe "sâu sắc" hay không. Nhóm nào dạy việc
  // phải làm thì 'list'; nhóm nào chạm vào chuyện không giải quyết được bằng các bước thì
  // 'reflective'.
  // -----------------------------------------------------------------------------------------------
  {
    key: 'ai_and_career',
    label: 'AI & Nghề Nghiệp',
    sub: 'Không bị AI thay thế',
    icon: '🤖',
    voice: 'list',
    styleLabel: 'Surviving & Thriving Alongside AI at Work — which tasks get automated, which skills stay human, how to use AI without hollowing out your own judgement; concrete and current, never sci-fi speculation'
  },
  {
    key: 'digital_detox',
    label: 'Nghiện Điện Thoại',
    sub: 'Tập trung & Dopamine',
    icon: '📵',
    voice: 'list',
    styleLabel: 'Attention & Digital Minimalism — reclaiming focus from infinite scroll, notification hygiene, dopamine reset, sleep and screens; practical rules a viewer can apply tonight'
  },
  {
    key: 'health_longevity',
    label: 'Sức Khỏe & Tuổi Thọ',
    sub: 'Ngủ, ăn & vận động',
    icon: '🏃',
    voice: 'list',
    styleLabel: 'Everyday Health & Longevity for Young People — sleep, posture, movement, food and check-ups; the debt the twenties quietly hand to the forties. Lifestyle habits only, never medical diagnosis or treatment advice'
  },
  {
    key: 'side_hustle',
    label: 'Nghề Tay Trái',
    sub: 'Thu nhập thứ hai',
    icon: '🚀',
    voice: 'list',
    styleLabel: 'Side Income & Freelancing While Employed — finding the first client, pricing your work, contracts, burnout from two jobs; grounded in ordinary skills, explicitly anti get-rich-quick'
  },
  {
    key: 'slow_living',
    label: 'Sống Chậm & Vừa Đủ',
    sub: 'Bớt lại để sống',
    icon: '🍃',
    voice: 'reflective',
    styleLabel: 'Slow Living & Enough — pushing back on hustle culture and collective exhaustion; defining "enough" for yourself, resting without guilt, owning less on purpose'
  },
  {
    key: 'modern_loneliness',
    label: 'Cô Đơn Thời Kết Nối',
    sub: 'Bạn bè & Gắn kết',
    icon: '🫧',
    voice: 'reflective',
    styleLabel: 'Loneliness in a Hyper-Connected World — friendships thinning out after your twenties, being surrounded yet unseen, the effort real closeness costs when nobody has time'
  },
  {
    key: 'single_life',
    label: 'Độc Thân & Cưới Xin',
    sub: 'Chọn sống một mình',
    icon: '💍',
    voice: 'reflective',
    styleLabel: 'Staying Single & Marrying Later — family pressure, the Tet interrogation, waiting for financial ground before commitment; validating the choice without preaching either way'
  },
  {
    key: 'family_parents',
    label: 'Cha Mẹ & Gia Đình',
    sub: 'Cha mẹ đang già đi',
    icon: '🏠',
    voice: 'reflective',
    styleLabel: 'Parents & Family Across the Generation Gap — ageing parents, love expressed through food instead of words, unspoken apologies, becoming the one your parents lean on'
  }
];

export const DEFAULT_MORAL_THEME = 'self_help';

export function getMoralTheme(themeKey) {
  const normalized = String(themeKey || DEFAULT_MORAL_THEME).toLowerCase();
  return MORAL_THEMES.find((t) => t.key === normalized) || MORAL_THEMES[0];
}

// Nhãn tiếng Việt ngắn dùng cho nút "Lộ trình 50 chủ đề (...)" — trước đây là 1 ternary 3 nhánh
// chép ở 2 chỗ, nhóm thứ 4 trở đi luôn bị gọi nhầm thành "Quy tắc ứng xử".
export function getMoralThemeLabel(themeKey) {
  return getMoralTheme(themeKey).label;
}

// Nguồn sự thật DUY NHẤT cho việc chọn văn phong — thay cho phép so sánh chuỗi rải rác.
export function isReflectiveMoralTheme(themeKey) {
  return getMoralTheme(themeKey).voice === 'reflective';
}

/**
 * Giọng văn thô ('reflective' | 'list' | 'satire').
 *
 * Dùng hàm này khi cần phân biệt ĐỦ BA giọng. isReflectiveMoralTheme() chỉ trả nhị phân, nên nếu
 * chỉ dựa vào nó thì 'satire' im lặng bị gộp chung với 'list' — đúng cái bẫy mà docblock đầu file
 * cảnh báo, và cũng không có lỗi nào được báo ra, chỉ là video xuất ra sai giọng.
 */
export function getMoralThemeVoice(themeKey) {
  return getMoralTheme(themeKey).voice;
}
