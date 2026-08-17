# Hướng Dẫn Quản Lý & Tùy Biến Base Config Toàn Cục (AUTO_RENDER_VIDEO)

Hệ thống cấu hình của module `TOOLS/AUTO_RENDER_VIDEO` đã được tái cấu trúc thành kiến trúc tập trung (**Single Source of Truth**) đặt tại thư mục `config/`.

---

## 1. Cấu Trúc Thư Mục `config/`

| File | Chức năng & Phạm vi quản lý |
| :--- | :--- |
| [`config/index.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/index.js) | Điểm truy cập thống nhất (**Entry Point**). Export `APP_CONFIG` và toàn bộ sub-configs. |
| [`config/env.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/env.config.js) | Đọc, validate và chuẩn hóa các biến môi trường (`process.env`). |
| [`config/paths.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/paths.config.js) | Quản lý mọi đường dẫn vật lý trên đĩa (`data/`, `uploads/`, `skills/`, `previews`...). Tự động tạo thư mục khi chưa có. |
| [`config/database.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/database.config.js) | Cấu hình kết nối MongoDB, DNS SRV Resolver, danh mục tên Collections, khoảng nghỉ retry connection (`15s`). |
| [`config/ai.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/ai.config.js) | Cấu hình danh sách Model Gemini theo từng tier (`quality`, `fast`, `vision`), timeouts, parser API keys nhiều dòng. |
| [`config/tts.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/tts.config.js) | Cấu hình nhà cung cấp giọng đọc (Edge TTS, VieNeu TTS, Gemini TTS, CapCut), voice mặc định, server URL. |
| [`config/render.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/render.config.js) | Cấu hình thông số render video: FPS (30), kích thước 1080x1920 (9:16), 1920x1080 (16:9), tăng tốc phần cứng, GL renderer. |
| [`config/skills.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/skills.config.js) | **Registry kỹ năng video**: Ánh xạ `category` -> Thư mục Remotion Skill (`moral_talk_slideshow`, `reading-page-video`, `stick-figure-slideshow-video`, `pexels-talk-video`...). |
| [`config/presets.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/presets.config.js) | Mẫu cài đặt mặc định (phụ đề hook/page/line, bảng màu sắc, tỷ lệ khung hình, nhạc nền). |

---

## 2. Cách Sử Dụng Trong Code

### Cách 1: Import toàn bộ `APP_CONFIG`
```javascript
import { APP_CONFIG } from '@/config/index.js';

console.log(APP_CONFIG.env.PORT);
console.log(APP_CONFIG.paths.UPLOADS_DIR);
console.log(APP_CONFIG.ai.MODEL_TIERS.quality);
```

### Cách 2: Import trực tiếp cấu hình chuyên biệt
```javascript
import { AI_CONFIG, parseApiKeys } from '@/config/ai.config.js';
import { PATHS_CONFIG } from '@/config/paths.config.js';
import { RENDER_CONFIG } from '@/config/render.config.js';
import { getSkillFolderForCategory } from '@/config/skills.config.js';
```

---

## 3. Các Tác Vụ Tùy Biến Thường Gặp

### 3.1. Đổi hoặc Bổ Sung Model Gemini AI Mới
Mở file [`config/ai.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/ai.config.js) và thêm model vào mảng tương ứng:
```javascript
MODEL_TIERS: {
  quality: [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    // Thêm model mới ở đây
  ],
  fast: [
    'gemini-flash-lite-latest',
    // ...
  ]
}
```

### 3.2. Đổi Server URL VieNeu TTS
Có 2 cách:
1. Đổi trong file `.env.local`: `VIENEU_SERVER_URL=http://127.0.0.1:8001`
2. Hoặc chỉnh giá trị fallback trong [`config/tts.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/tts.config.js).

### 3.3. Thêm một Danh Mục Video / Remotion Skill Mới
Mở file [`config/skills.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/skills.config.js) và khai báo thêm vào `CATEGORY_SKILL_MAPPING` & `SKILLS_METADATA`:
```javascript
export const CATEGORY_SKILL_MAPPING = {
  // ...
  my_new_category: 'my-new-skill-folder',
};
```

### 3.4. Chỉnh Thông Số Render Video Mặc Định
Mở file [`config/render.config.js`](file:///D:/code/wed/ATPOSTER/TOOLS/AUTO_RENDER_VIDEO/config/render.config.js):
- Thay đổi `FPS`: `30` hoặc `60`
- Thay đổi kích thước `DIMENSIONS`
- Thay đổi `GL_RENDERER` (`angle`, `swiftshader`, `vulkan`, `egl`)
