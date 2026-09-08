# HƯỚNG DẪN PHÁT TRIỂN VÀ MỞ RỘNG SKILL (ATPOSTER MODULAR ARCHITECTURE)

Hệ thống ATPOSTER hoạt động theo mô hình **Plugin-based / Modular Clean Architecture**: Mỗi Skill là một module độc lập, tự quản lý giao diện, prompt, syllabus và cấu hình render Remotion của chính nó.

---

## 1. Cấu trúc thư mục của một Skill

Mỗi Skill nằm trong một thư mục con tại `AUTO_RENDER_VIDEO/skills/<tên-skill>/`:

```text
skills/<tên-skill>/
├── index.js             # [BẮT BUỘC] Skill Manifest tuân theo chuẩn defineSkill
├── remotion/            # [TÙY CHỌN] Package Remotion render video riêng nếu có
├── domain/              # [TÙY CHỌN] Logic pure domain, prompts, syllabus riêng
└── README.md            # [TÙY CHỌN] Tài liệu ghi chú riêng cho skill
```

---

## 2. Quy chuẩn Skill Manifest (`index.js`)

Mọi Skill phải sử dụng hàm `defineSkill(...)` từ `skills/_core/skill-contract.js`:

```javascript
import { defineSkill } from '../_core/skill-contract.js';

export default defineSkill({
  // 1. Metadata hiển thị trên giao diện & hệ thống
  meta: {
    id: 'ten_skill_moi',               // Mã định danh duy nhất (snake_case)
    name: 'Tên hiển thị của Skill',     // Tên tiếng Việt hiển thị trên thanh chọn
    description: 'Mô tả ngắn về video...', 
    icon: 'Sparkles',                  // Tên Lucide icon
    aspectRatio: '9:16',               // '9:16' (Shorts/TikTok) hoặc '16:9' (Youtube)
    renderEngine: 'remotion',          // Engine render video
    skillFolder: 'ten_skill_moi',      // Thư mục chứa Remotion studio
    badge: 'Mới',                      // Nhãn tag (Mới, Hot, Phổ biến...)
  },

  // 2. Schema form nhập liệu động cho Skill
  formSchema: {
    fields: [
      {
        name: 'scenario',
        label: 'Chủ đề kịch bản',
        type: 'textarea',
        required: true,
        placeholder: 'Nhập nội dung bạn muốn làm...',
      }
    ],
  },

  // 3. Hàm kiểm tra hợp lệ dữ liệu người dùng nhập
  validate(input, useGemini) {
    if (!input.scenario?.trim()) return 'Vui lòng nhập chủ đề.';
    return null;
  },

  // 4. Hàm tạo prompt gửi AI Gemini
  buildPrompt(input, durationInfo, durationRange) {
    return `Viết kịch bản video về chủ đề: ${input.scenario}...`;
  },

  // 5. Hàm tạo phân cảnh thủ công khi không dùng AI
  buildManualSegments(processedInput) {
    return [];
  },

  // 6. Hàm tạo cấu hình Remotion để render video
  buildRemotionConfig(record, processedInput) {
    return {
      title: record.title,
      // cấu hình font chữ, màu sắc, hiệu ứng...
    };
  },
});
```

---

## 3. Cách thêm 1 Skill mới vào hệ thống (Chỉ 2 bước)

1. **Bước 1**: Tạo thư mục `skills/<tên_skill>/index.js` và viết theo mẫu trên.
2. **Bước 2**: Mở file `AUTO_RENDER_VIDEO/skills/index.js` và thêm 2 dòng:
   ```javascript
   import ten_skill_moi from './ten_skill_moi/index.js';

   const SKILLS = {
     // ... các skills hiện có
     ten_skill_moi,
   };
   ```

Toàn bộ hệ thống (Menu chọn Skill, Form nhập liệu, API sinh kịch bản, Engine render Remotion) sẽ **tự động nhận diện Skill mới** mà bạn không cần phải sửa bất kỳ dòng code nào trong Core UI hay Controller!

---

## 4. Nguyên tắc "Không đụng chạm chéo" (Zero Cross-Dependency)
- Skill A tuyệt đối **không import trực tiếp** file của Skill B.
- Nếu có hàm dùng chung (helper, tính thời lượng, chuẩn hóa chuỗi...), hãy đặt tại `skills/_core/`.
- Sửa đổi nội dung trong thư mục Skill nào sẽ chỉ có hiệu lực bên trong Skill đó, đảm bảo an toàn 100% cho toàn bộ dự án.
