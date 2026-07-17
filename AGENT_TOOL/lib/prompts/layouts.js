// Danh mục các loại bố cục / góc chụp cho chủ đề ẢNH.
export const LAYOUT_TYPES = {
  front_facing: {
    key: 'front_facing',
    label: 'Ảnh Chính Diện (Front Shot)',
    icon: '👤',
    description: 'Ảnh chụp một góc chính diện duy nhất của nhân vật, thích hợp làm ảnh chân dung cơ bản.',
    promptSuffix: 'front view, facing camera, single shot, no text, no letters, no labels'
  },
  character_sheet: {
    key: 'character_sheet',
    label: 'Nhiều Góc Độ (Character Turnaround)',
    icon: '👥',
    description: 'Tạo nhiều góc chụp (trước, nghiêng, sau) trên cùng một bức ảnh — thích hợp nhất làm ảnh gốc tham chiếu nhất quán.',
    promptSuffix: 'character turnaround sheet, model sheet, front view, 3/4 view, side view, back view, multiple angles, standing pose, consistent proportions, no text, no words, no letters, no labels'
  },
  storyboard: {
    key: 'storyboard',
    label: 'Bảng Phân Cảnh (Storyboard)',
    icon: '📋',
    description: 'Chia làm nhiều ô phân cảnh (dạng lưới 2x2 hoặc 3x3) mô tả chuỗi hành động nối tiếp của nhân vật.',
    promptSuffix: 'storyboard panel grid, sequential panels, action sequence, no text, no speech bubbles, no dialogue, no words, no letters, no labels'
  }
};
