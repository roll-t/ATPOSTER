// Kho nhạc nền dựng sẵn của hệ thống. Khai báo 1 chỗ vì trước đây danh sách này bị chép
// tay ở 3 nơi (lưới chọn nhạc trong modal, nhãn tên bài ở Bước 3, thông báo sau khi ghim mặc
// định) — thêm/đổi 1 bản nhạc phải sửa cả 3, sót chỗ nào là chỗ đó hiển thị sai tên.
export const BG_MUSIC_TRACKS = [
  { id: 'track1', name: 'Andriig Soft Ambient', shortName: 'Soft Ambient', desc: 'Êm ái, thư thái', file: '/default-bg-music/track1.mp3' },
  { id: 'track2', name: 'Andriig Gentle Acoustic', shortName: 'Gentle Acoustic', desc: 'Sâu lắng, ấm áp', file: '/default-bg-music/track2.mp3' },
  { id: 'track3', name: 'Moment of Peace', shortName: 'Moment of Peace', desc: 'Du dương, chữa lành', file: '/default-bg-music/track3.mp3' }
];

// Giá trị bgMusicTrackId khi nhạc nền đang dùng là file người dùng tự tải lên (không thuộc kho).
export const CUSTOM_BG_MUSIC_ID = 'custom';

// Âm lượng nhạc nền mặc định (%) — hiển thị dưới dạng % ở giao diện, gửi xuống render dưới dạng
// 0..1. Đặt tên hằng để nhãn "Tiêu chuẩn" trên thanh trượt và giá trị khởi tạo không lệch nhau.
export const DEFAULT_BG_MUSIC_VOLUME_PERCENT = '35';

// Giá trị mặc định CŨ (trước khi đổi sang 35%) — dùng để nhận diện các bản lưu (localStorage /
// settings server) vẫn còn đang ở đúng mức mặc định gốc, chưa từng bị người dùng bấm "Đặt làm mặc
// định" để chỉnh tay, nhằm migrate 1 lần sang mức mặc định mới thay vì kẹt ở 10% mãi dù code đã đổi.
export const LEGACY_DEFAULT_BG_MUSIC_VOLUME_PERCENT = '10';

export function bgMusicTrackLabel(trackId, { short = false, library = [] } = {}) {
  const track = BG_MUSIC_TRACKS.find((t) => t.id === trackId);
  if (track) return short ? track.shortName : track.name;
  const libTrack = library.find((t) => t.id === trackId);
  if (libTrack) return libTrack.name;
  return 'Tệp tải lên';
}

// Định nghĩa thông số mặc định chuẩn của từng Kiểu Phụ Đề
export const CAPTION_STYLE_DEFAULTS = {
  box: {
    font: 'be-vietnam-pro',
    fontSize: '40',
    textColor: '#FFFFFF',
    bgColor: '#0A0A0E',
    bgTransparent: false,
    highlightColor: '#FE2C55'
  },
  tiktok: {
    font: 'montserrat',
    fontSize: '48',
    textColor: '#FFFFFF',
    bgColor: '#000000',
    bgTransparent: true,
    highlightColor: '#FE2C55'
  },
  karaoke: {
    font: 'be-vietnam-pro',
    fontSize: '44',
    textColor: '#FFFFFF',
    bgColor: '#0A0A0E',
    bgTransparent: false,
    highlightColor: '#FE2C55'
  },
  page: {
    font: 'nunito',
    fontSize: '36',
    textColor: '#2A2118',
    bgColor: '#FBF3E3',
    bgTransparent: false,
    highlightColor: '#FFCB4D'
  },
  hook: {
    font: 'be-vietnam-pro',
    fontSize: '40',
    textColor: '#FFFFFF',
    bgColor: 'rgba(8, 8, 11, 0.88)',
    // Transparent theo đúng video mẫu tham khảo (chữ nổi trực tiếp trên nền đen của ảnh
    // pictogram, không có khung/hộp nền phía sau) — trước đây mặc định có khung mờ.
    bgTransparent: true,
    highlightColor: '#FE2C55'
  },
  // Skill riêng reading-page-video (category 'reading_practice') — không có khái niệm
  // "Kiểu phụ đề" box/tiktok/karaoke, chỉ có 1 kiểu trang giấy karaoke duy nhất.
  readingPage: {
    font: 'montserrat',
    fontSize: '44',
    textColor: '#241C10',
    bgColor: '#F3EAD9',
    bgTransparent: false,
    highlightColor: '#D8B07A'
  }
};

// Danh sách Kiểu phụ đề / Kiểu chuyển cảnh. Khai báo 1 chỗ vì nhãn của chúng được dùng ở CẢ lưới
// chọn LẪN dòng "📌 Đang ghim: ..." — trước đây dòng đang-ghim tự dịch value sang nhãn bằng một
// chuỗi ternary riêng, và chuỗi đó thiếu hẳn nhánh 'hook' (kiểu thêm vào sau), nên ghim "Tiêu đề
// mở đầu" lại hiện là "Karaoke tô màu từ" — người dùng tưởng thao tác ghim bị lỗi.
export const CAPTION_STYLE_OPTIONS = [
  { value: 'box', label: 'Hộp bo tròn' },
  { value: 'tiktok', label: 'Viền chữ TikTok' },
  { value: 'karaoke', label: 'Karaoke tô màu từ' },
  { value: 'hook', label: 'Tiêu đề mở đầu' }
];

export const TRANSITION_STYLE_OPTIONS = [
  { value: 'crossfade', label: 'Hòa tan' },
  { value: 'slide-left', label: 'Trượt trái' },
  { value: 'slide-right', label: 'Trượt phải' },
  { value: 'slide-up', label: 'Trượt lên' },
  { value: 'zoom', label: 'Phóng to' }
];

// "hook" là Kiểu phụ đề DÙNG CHUNG cho nhiều category (không riêng gì moral_talk_slideshow), nên
// không thể sửa thẳng CAPTION_STYLE_DEFAULTS.hook.{fontSize,highlightColor} — sẽ đổi luôn mặc định
// của MỌI category khác cũng có thể chọn kiểu "hook". Map này cho phép ghi đè cỡ chữ/màu nhấn mặc
// định riêng theo TỪNG category + style, chỉ áp dụng khi kịch bản CHƯA từng lưu giá trị riêng (dự
// án hoàn toàn mới, hoặc bấm "↺ Mặc định gốc") — xem initialDefaults/handleSelectCaptionStyle bên
// dưới. Màu #d9a620 khớp đúng màu nhấn của ảnh bìa (xem MoralTalkCover.tsx) — video Nói Chuyện Đạo
// Lý dùng thống nhất 1 màu nhấn ở cả ảnh bìa lẫn phụ đề "Tiêu đề mở đầu" trong video.
export const CATEGORY_STYLE_OVERRIDES = {
  moral_talk_slideshow: { hook: { fontSize: '50', highlightColor: '#d9a620' } }
};

// Mẫu Video Preset Mặc Định Hệ Thống cho kịch bản Đọc Giấy Karaoke
export const SYSTEM_READING_PRESETS = [
  {
    id: 'sys_reading_classic',
    name: 'Giấy Kem Classic',
    description: 'Trang giấy kem ấm áp, chữ nâu sẫm',
    isSystem: true,
    config: {
      textColor: '#241C10',
      bgColor: '#F3EAD9',
      isBgTransparent: false,
      font: 'be-vietnam-pro',
      fontSize: '44',
      bgMusicEnabled: true,
      bgMusicVolume: '10',
      bgMusicTrackId: 'track1'
    }
  },
  {
    id: 'sys_reading_dark_gold',
    name: 'Đọc Đêm Gold',
    description: 'Trang tối sang trọng, chữ vàng hoàng gia',
    isSystem: true,
    config: {
      textColor: '#FFCB4D',
      bgColor: '#181622',
      isBgTransparent: false,
      font: 'montserrat',
      fontSize: '44',
      bgMusicEnabled: true,
      bgMusicVolume: '10',
      bgMusicTrackId: 'track2'
    }
  },
  {
    id: 'sys_reading_white_modern',
    name: 'Trắng Hiện Đại',
    description: 'Nền trắng tinh tế, chữ xanh đen sắc nét',
    isSystem: true,
    config: {
      textColor: '#1E293B',
      bgColor: '#FFFFFF',
      isBgTransparent: false,
      font: 'be-vietnam-pro',
      fontSize: '44',
      bgMusicEnabled: true,
      bgMusicVolume: '10',
      bgMusicTrackId: 'track3'
    }
  }
];
