/**
 * Tám nhóm chủ đề của skill "Chuyện Triết Lý & Thiền Phật Giáo".
 *
 * ĐỊNH HƯỚNG: ブッダの教え — lời Phật dạy. Mỗi nhóm neo vào MỘT khái niệm giáo lý có thật, gọi
 * đúng tên nhà Phật, chứ không phải một trạng thái tinh thần chung chung.
 *
 * Vì sao phải neo như vậy: bản trước có những nhóm kiểu "Inner Peace & Serenity", "Mindfulness &
 * The Present Moment" — nghe thì hợp lý nhưng chúng không phải phạm trù giáo lý, chúng là phạm trù
 * WELLNESS. Đưa vào prompt thì model tự nhiên trôi sang giọng self-help, và đó đúng là lỗi đã gặp:
 * cả một tập kết bằng hai mươi slide dỗ ngủ. Đổi "an lạc nội tâm" thành 中道 (Trung Đạo) và "chánh
 * niệm" thành 正念 (một chi của Bát Chánh Đạo) khiến model buộc phải kể một điều nhà Phật thật sự
 * dạy, thay vì một lời khuyên sống tốt.
 *
 * KHOÁ (key) GIỮ NGUYÊN, không được đổi:
 *   - BUDDHIST_SYLLABUS khoá theo đúng 8 key này (36 chủ đề gợi ý);
 *   - mọi bản ghi đã lưu đều mang key cũ, đổi là chúng rơi hết về nhóm đầu tiên.
 * Vậy nên đây là thay đổi NỘI DUNG của từng nhóm, không phải thay đổi tập hợp nhóm.
 *
 * Các trường:
 *   label / sublabel / description -> hiển thị trên thẻ chọn (label tiếng Nhật, phần còn lại tiếng Việt)
 *   en      -> tên tiếng Anh, ĐI VÀO PROMPT để model hiểu không mơ hồ
 *   story   -> hình dáng câu chuyện + khái niệm giáo lý phải gọi tên, chèn vào prompt kịch bản
 *   motifs  -> menu hình ảnh cho visualDescription, cũng chỉ nằm trong prompt kịch bản
 *   mood    -> câu KHÔNG-CHỦ-THỂ duy nhất được phép chèn vào prompt ảnh cuối cùng
 */
export const BUDDHIST_THEMES = [
  {
    key: 'zen_stories',
    label: '禅の物語',
    sublabel: 'Công Án Thiền & Khoảnh Khắc Ngộ',
    en: 'Zen parables and the moment of insight',
    icon: '🧘',
    accentColor: '#f59e0b',
    description: 'Những công án và mẩu chuyện thiền giữa thiền sư và đệ tử — một câu trả lời lật ngược cả vấn đề.',
    story: 'Tell one parable. A student arrives with a question or a complaint, something ordinary happens, and the teacher answers in a single plain line that turns the whole thing over. Land that turn, then stop. Never explain it afterwards. Name the Buddhist idea the parable carries once — 悟り, 無心, 分別 — and let the story do the rest.',
    motifs: 'a teacher and a student facing each other on a tatami floor, a tea bowl overflowing onto a tray, a broom resting against a swept courtyard wall, a student caught mid-question with a hand raised, a wooden gate at the top of worn stone steps',
    mood: 'Plain and unhurried, with the quiet beat that follows something just said.'
  },
  {
    key: 'karma_cause_effect',
    label: '因果と業',
    sublabel: 'Nhân Quả & Nghiệp Báo',
    en: 'Karma: action, cause and its fruit',
    icon: '☸️',
    accentColor: '#eab308',
    description: 'Lời Phật dạy về nghiệp: mọi hành động, lời nói và ý nghĩ đều gieo một hạt, và hạt nào cũng có ngày trổ quả.',
    story: 'Follow one action all the way to what it grows into, across time. Show the small choice first, then the harvest much later. Name 因果 or 業 plainly once, as what the tradition calls this. Let the consequence simply arrive and be seen — never moralise about punishment, and never promise the listener good fortune for good behaviour.',
    motifs: 'a seed pressed into wet soil, a hand that has just released a stone, rings spreading across a still pond, a young tree beside the old one, muddy footprints along a wet path',
    mood: 'Even-handed and weighty, the settled calm of a consequence arriving.'
  },
  {
    key: 'mindfulness_presence',
    label: '正念',
    sublabel: 'Chánh Niệm (một chi của Bát Chánh Đạo)',
    en: 'Right Mindfulness, the seventh limb of the Eightfold Path',
    icon: '🍃',
    accentColor: '#10b981',
    description: 'Không phải "sống chậm" chung chung, mà là 正念 — chi thứ bảy của Bát Chánh Đạo: biết rõ mình đang làm gì, ngay khi đang làm.',
    story: 'Stay inside ONE ordinary activity and slow it right down: washing a bowl, walking a path, drinking tea, taking one breath. The whole episode can be a single small moment looked at closely. Name 正念 once and place it where it belongs — a limb of 八正道, not a relaxation technique. Do not travel across a long story: the pull of this theme is that almost nothing happens and the mind notices everything.',
    motifs: 'two hands washing a single bowl in a wooden basin, steam rising from a tea bowl held in both palms, one bare foot mid-step on a stone path, a leaf turning slowly on the surface of a stream, a person seated on a tatami floor with eyes lowered, dew along a single blade of grass, a patch of daylight lying across a swept floor',
    mood: 'Unhurried and spacious, attention resting on one ordinary thing, the air still.'
  },
  {
    key: 'letting_go_detachment',
    label: '執着と渇愛',
    sublabel: 'Chấp Trước & Tham Ái (Tập Đế)',
    en: 'Attachment and craving, the second Noble Truth',
    icon: '🕊️',
    accentColor: '#06b6d4',
    description: 'Tập Đế — Phật chỉ ra nguồn gốc của khổ là 渇愛 (tham ái) và 執着 (chấp trước), chứ không phải hoàn cảnh bên ngoài.',
    story: 'Show something carried far too long, then set down. Give the carrying real weight and real time before the release. The release itself is one small physical action, never a speech. Name 執着 or 渇愛 once, and say plainly that the tradition points to this as where 苦 comes from. Never turn it into an instruction for the listener to relax.',
    motifs: 'fingers opening around a small object, a heavy bundle set down at the roadside, an empty boat drifting out from a bank, a robe left hanging on a branch, a bird lifting off an open palm',
    mood: 'Loosening and light, something just released, open air.'
  },
  {
    key: 'inner_peace_calm',
    label: '中道',
    sublabel: 'Trung Đạo — Con Đường Ở Giữa',
    en: 'The Middle Way between indulgence and self-denial',
    icon: '🪷',
    accentColor: '#ec4899',
    description: 'Con đường Phật tìm ra sau khi bỏ cả đời sống vương giả lẫn lối khổ hạnh cực đoan: 中道, không nghiêng về bên nào.',
    story: 'Show one person going too far in one direction, then too far in the other, before finding the line between. The Buddha found this after both palace luxury and starving asceticism failed him — that story is available to you. Name 中道 once. The point is not calmness as a feeling; it is that both extremes were tried and both failed.',
    motifs: 'a bowl of rice offered to a starving ascetic, a rock standing unmoved in running water, a lute string being tuned neither slack nor tight, a raked gravel garden, a doorway opening onto a quiet courtyard',
    mood: 'Very still and settled, low and steady, unbothered.'
  },
  {
    key: 'compassion_kindness',
    label: '慈悲',
    sublabel: 'Từ Bi (Metta & Karuna)',
    en: 'Compassion and loving-kindness, metta and karuna',
    icon: '🤲',
    accentColor: '#8b5cf6',
    description: 'Từ (metta) là mong người khác an vui, Bi (karuna) là muốn người khác hết khổ — hai tâm Phật dạy phải nuôi dưỡng có chủ đích.',
    story: 'One person meets another who is suffering, and does one concrete thing about it. Keep the person being helped specific and ordinary. Name 慈悲 once, and if it fits, distinguish 慈 (wishing another well) from 悲 (wanting another free of pain). Never make the helper noble — they just act.',
    motifs: 'a bowl of rice offered in two hands, an old monk stooping to a stray dog, an arm steadying an elderly traveller on a step, a quilt laid over a sleeping child, two people under one paper wagasa umbrella',
    mood: 'Warm and tender, close in, gentle.'
  },
  {
    key: 'impermanence_wisdom',
    label: '諸行無常',
    sublabel: 'Vô Thường — Vạn Vật Luôn Đổi Thay',
    en: 'Impermanence, the first mark of existence',
    icon: '⏳',
    accentColor: '#f97316',
    description: 'Dấu ấn đầu tiên trong Tam Pháp Ấn: không một thứ gì đứng yên, và chính việc mong nó đứng yên mới sinh ra khổ.',
    story: 'Set two moments of the same thing side by side, far apart in time, and let the gap do the work. Season, weather, age. Name 諸行無常 once, and say plainly that this is the first of the three marks the Buddha pointed to. End on the change itself, not on comfort about it.',
    motifs: 'petals scattered across wet stone, a half-collapsed wall taken back by grass, an old hand resting beside a young one, snow melting off tiled eaves, a worn threshold hollowed by footsteps',
    mood: 'Passing and transient, soft, seasons turning.'
  },
  {
    key: 'buddha_teachings',
    label: '四聖諦と八正道',
    sublabel: 'Tứ Diệu Đế & Bát Chánh Đạo',
    en: 'The Four Noble Truths and the Eightfold Path',
    icon: '📜',
    accentColor: '#d97706',
    description: 'Bài giảng đầu tiên của Đức Phật: bốn sự thật về khổ, và tám chi của con đường thoát khổ.',
    story: 'Take ONE of the four truths, or ONE limb of the Eightfold Path, and hand it to the listener through a single lived situation — never through a list of all eight. Name it plainly once (苦諦, 集諦, 滅諦, 道諦, or 正見・正語・正業...) and get straight back into the scene. If you are not certain a sutra passage is real, do not quote it.',
    motifs: 'a seated figure beneath a wide old tree, a path branching at a stone marker, an open scroll weighted flat with a pebble, a wheel carved into weathered temple wood, a small group listening while seated on the ground',
    mood: 'Clear and open, the plain calm of something simply explained.'
  }
];

export function getBuddhistTheme(key) {
  return BUDDHIST_THEMES.find(t => t.key === key) || BUDDHIST_THEMES[0];
}

export function getBuddhistThemeLabel(key) {
  const theme = getBuddhistTheme(key);
  return `${theme.label} (${theme.sublabel})`;
}
