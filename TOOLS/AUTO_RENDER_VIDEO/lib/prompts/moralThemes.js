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
