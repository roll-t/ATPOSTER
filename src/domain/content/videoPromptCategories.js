/**
 * Danh mục các chủ đề tạo Prompt Video AI (Veo, Sora, Kling, Runway Gen-3, Luma)
 * Tương ứng với màn hình Category Grid của tab 'Prompt Video'.
 */

export const VIDEO_PROMPT_CATEGORIES = [
  {
    id: 'craft_asmr',
    icon: '🛠️',
    label: 'Chế Tác Thủ Công & Tái Chế ASMR',
    badge: 'ASMR & TÁI CHẾ',
    badgeBg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    shortDescription: 'Prompt sinh chuỗi video từng bước biến phế liệu (vỏ lon, bìa carton, ống nhựa) thành mô hình giáp Samurai, xe cổ, robot cực cuốn.',
    tags: ['ASMR Foley', 'Tái Chế DIY', 'Multi-Clip Nối', 'Stop-Motion'],
    defaultSubject: 'mô hình giáp samurai Nhật Bản',
    defaultMaterial: 'vỏ lon nước ngọt màu đỏ',
    accentColor: '#06b6d4',
  },
  {
    id: 'scifi_cyberpunk',
    icon: '🚀',
    label: 'Điện Ảnh Viễn Tưởng & Cyberpunk',
    badge: 'SCI-FI 8K',
    badgeBg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    shortDescription: 'Thành phố tương lai Neo-Tokyo năm 2099, phi thuyền không gian rực rỡ ánh neon, robot cơ khí và những thước phim điện ảnh tương lai.',
    tags: ['Cyberpunk Neon', 'Cinematic 8K', 'Hologram Mưa Đêm', 'Unreal Engine 5'],
    defaultSubject: 'chiến binh cyborg đi tuần trong hẻm mưa Neo-Tokyo',
    defaultMaterial: 'kim loại titanium phủ nano và đèn LED phát sáng',
    accentColor: '#8b5cf6',
  },
  {
    id: 'wildlife_nature',
    icon: '🦁',
    label: 'Thiên Nhiên & Động Vật Hoang Dã',
    badge: 'NATIONAL GEOGRAPHIC',
    badgeBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    shortDescription: 'Phong cách tài liệu BBC Earth & National Geographic: cận cảnh mãnh thú săn mồi, đáy biển san hô kỳ vĩ và flycam rừng nguyên sinh.',
    tags: ['BBC Earth', 'Slow-motion 120fps', 'Flycam 4K', 'Động Vật Hoang Dã'],
    defaultSubject: 'báo đốm săn mồi bên bờ suối rừng rậm Amazon',
    defaultMaterial: 'bộ lông vằn đẫm nước và ánh nắng xuyên tán cây',
    accentColor: '#f59e0b',
  },
  {
    id: 'epic_battle',
    icon: '⚔️',
    label: 'Sử Thi Chiến Trận & Cổ Trang',
    badge: 'EPIC BATTLE',
    badgeBg: 'linear-gradient(135deg, #ef4444, #b91c1c)',
    shortDescription: 'Đại chiến hàng vạn binh mã thời Tam Quốc, Samurai Sengoku, góc máy điện ảnh IMAX khói lửa mù mịt, cờ bay rợp trời hào hùng.',
    tags: ['Chiến Trận IMAX', 'Samurai Sengoku', 'Khói Lửa Sa Trường', 'Góc Máy Hùng Tráng'],
    defaultSubject: 'đội kỵ binh Samurai áo giáp đỏ xung trận giữa thung lũng sương mù',
    defaultMaterial: 'giáp sắt sơn mài cũ sờn và cờ xí tung bay trong gió',
    accentColor: '#ef4444',
  },
  {
    id: 'animation_3d',
    icon: '✨',
    label: 'Hoạt Hình 3D Pixar & Ghibli Vibe',
    badge: 'PIXAR & GHIBLI',
    badgeBg: 'linear-gradient(135deg, #10b981, #06b6d4)',
    shortDescription: 'Tạo video hoạt hình 3D phong cách Disney Pixar đáng yêu hoặc hoạt hình thơ mộng ấm áp với khung cảnh thiên nhiên kỳ ảo kiểu Ghibli.',
    tags: ['3D Pixar Animation', 'Ghibli Fantasy', 'Ánh Sáng Thần Tiên', 'Biểu Cảm Sống Động'],
    defaultSubject: 'chú rồng con mũm mĩm tập phun ra tia lửa nhỏ bên dòng suối hoa',
    defaultMaterial: 'vảy rồng ngọc bích phát sáng mềm mại và đôi cánh tí hon',
    accentColor: '#10b981',
  },
  {
    id: 'product_commercial',
    icon: '💎',
    label: 'Quảng Cáo Sản Phẩm & TVC Thương Hiệu',
    badge: 'TVC LUXURY',
    badgeBg: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    shortDescription: 'Quay cận cảnh sản phẩm cao cấp (nước hoa, đồng hồ cơ, giày thể thao, đồ uống) với hiệu ứng splash nước, ánh sáng studio và macro slow-mo.',
    tags: ['Macro Slow-mo', 'Studio Lighting', 'Quảng Cáo Sang Trọng', 'Product Reveal'],
    defaultSubject: 'chai nước hoa thủy tinh cao cấp bay lơ lửng giữa những giọt nước hoa hồng',
    defaultMaterial: 'thủy tinh pha lê trong suốt và kim loại mạ vàng hồng',
    accentColor: '#3b82f6',
  },
];

export function getVideoPromptCategoryById(id) {
  return VIDEO_PROMPT_CATEGORIES.find((c) => c.id === id) || VIDEO_PROMPT_CATEGORIES[0];
}
