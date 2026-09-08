/**
 * Chuẩn giao diện (Contract Interface) bắt buộc cho tất cả các Skill trong hệ thống ATPOSTER.
 * Bất kỳ Skill nào cũng phải tuân theo cấu trúc này để đảm bảo:
 * 1. Tính độc lập hoàn toàn giữa các Skill.
 * 2. Core Studio có thể nạp và điều khiển tự động mà không cần hardcode `if/else (category === ...)`.
 */

export function defineSkill(definition) {
  if (!definition.meta || !definition.meta.id) {
    throw new Error('Skill bắt buộc phải có meta.id');
  }

  return {
    meta: {
      id: definition.meta.id,
      name: definition.meta.name || definition.meta.id,
      description: definition.meta.description || '',
      icon: definition.meta.icon || 'Film',
      aspectRatio: definition.meta.aspectRatio || '9:16',
      renderEngine: definition.meta.renderEngine || 'remotion',
      skillFolder: definition.meta.skillFolder || definition.meta.id,
      ...definition.meta,
    },

    // Schema mô tả form nhập liệu cho Skill để Core Form tự render động
    formSchema: definition.formSchema || { fields: [] },

    // Dữ liệu giáo trình / chủ đề mẫu nếu có
    syllabus: definition.syllabus || null,

    // Cờ đánh dấu manifest hình ảnh (cho Remotion skills)
    manifestIsImage: Boolean(definition.manifestIsImage),

    // Kiểm tra tính hợp lệ dữ liệu người dùng nhập
    validate: definition.validate || (() => null),

    // Hàm tạo Prompt gửi cho AI Gemini sinh kịch bản
    buildPrompt: definition.buildPrompt || (() => ''),
    buildGeminiPrompt: definition.buildGeminiPrompt || definition.buildPrompt || (() => ''),

    // Hàm tạo phân cảnh thủ công khi người dùng tự nhập nội dung không qua AI
    buildManualSegments: definition.buildManualSegments || (() => []),

    // Hàm tạo cấu hình Remotion để render video
    buildRemotionConfig: definition.buildRemotionConfig || (() => ({})),

    // Các extension hooks tùy chọn khác nếu skill cần
    hooks: definition.hooks || {},
  };
}
