export const BUDDHIST_THEMES = [
  {
    key: 'zen_stories',
    label: 'Zen Parables & Enlightenment',
    sublabel: 'Chuyện Thiền & Bài Học Tỉnh Thức',
    icon: '🧘',
    accentColor: '#f59e0b',
    description: 'Những câu chuyện thiền thâm thuý giữa thiền sư và đệ tử, mở ra góc nhìn giải thoát và sự ngộ đạo sâu sắc.'
  },
  {
    key: 'karma_cause_effect',
    label: 'Law of Karma & Universal Justice',
    sublabel: 'Luật Nhân Quả & Nghiệp Báo',
    icon: '☸️',
    accentColor: '#eab308',
    description: 'Quy luật gieo nhân gặt quả, giải thích vì sao mọi hành động, suy nghĩ và lời nói đều tạo nên số phận.'
  },
  {
    key: 'mindfulness_presence',
    label: 'Mindfulness & The Present Moment',
    sublabel: 'Chánh Niệm & Sống Trong Hiện Tại',
    icon: '🍃',
    accentColor: '#10b981',
    description: 'Nghệ thuật quay về hơi thở, trân trọng giây phút hiện tại và chữa lành tâm trí khỏi lo âu tương lai.'
  },
  {
    key: 'letting_go_detachment',
    label: 'Letting Go & Non-Attachment',
    sublabel: 'Buông Bỏ & Không Dính Mắc',
    icon: '🕊️',
    accentColor: '#06b6d4',
    description: 'Học cách buông bỏ phiền não, kỳ vọng, chấp niệm và những gánh nặng tâm lý để tâm hồn được tự do.'
  },
  {
    key: 'inner_peace_calm',
    label: 'Inner Peace & Serenity',
    sublabel: 'Bình An Nội Tâm & Tĩnh Lặng',
    icon: '🪷',
    accentColor: '#ec4899',
    description: 'Tìm kiếm sự tĩnh lặng vững chãi giữa những biến động, thị phi và áp lực xô bồ của thế giới bên ngoài.'
  },
  {
    key: 'compassion_kindness',
    label: 'Compassion & Loving-Kindness',
    sublabel: 'Từ Bi & Lòng Trắc Ẩn (Metta)',
    icon: '🤲',
    accentColor: '#8b5cf6',
    description: 'Nuôi dưỡng tình thương yêu rộng lớn, sự tha thứ và lòng thấu cảm với mọi nỗi đau của chúng sinh.'
  },
  {
    key: 'impermanence_wisdom',
    label: 'Impermanence & Life Wisdom',
    sublabel: 'Trí Tuệ Vô Thường & Thấu Hiểu Lẽ Đời',
    icon: '⏳',
    accentColor: '#f97316',
    description: 'Thấu suốt bản chất vạn vật luôn thay đổi để không còn đau khổ khi đối diện mất mát và thăng trầm.'
  },
  {
    key: 'buddha_teachings',
    label: 'Teachings of the Buddha',
    sublabel: 'Lời Phật Dạy Về Đời Sống & Nghịch Cảnh',
    icon: '📜',
    accentColor: '#d97706',
    description: 'Những lời dạy cốt lõi của Đức Phật về Tứ Diệu Đế, Bát Chánh Đạo và con đường thoát khổ trong đời sống.'
  }
];

export function getBuddhistTheme(key) {
  return BUDDHIST_THEMES.find(t => t.key === key) || BUDDHIST_THEMES[0];
}

export function getBuddhistThemeLabel(key) {
  const theme = getBuddhistTheme(key);
  return `${theme.label} (${theme.sublabel})`;
}
