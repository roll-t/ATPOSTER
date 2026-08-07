import { z } from 'zod';

export const segmentSchema = z.object({
  caption: z.string().default(''),
  audio: z.string().default(''),
  durationInFrames: z.number().min(1).default(90),
  // Clip nền RIÊNG của đoạn này, chọn theo đúng nội dung câu đang đọc. Bỏ trống thì đoạn dùng
  // playlist nền chung của cả video (xem backgroundVideos).
  bgVideo: z.string().optional(),
  // Độ dài thật của clip trên. Cần để cắt đúng lúc clip hết: clip ngắn hơn đoạn mà cứ để nguyên
  // thì phần dư sẽ ĐỨNG HÌNH — thay vào đó trả lại nền chung cho tới hết đoạn.
  bgVideoDurationInSeconds: z.number().positive().optional(),
  wordTimings: z.array(z.object({
    word: z.string(),
    startMs: z.number(),
    endMs: z.number(),
  })).optional(),
});

// 1 clip nền. Dạng chuỗi là định dạng cũ (không biết độ dài thật → phải đoán); dạng object mang
// theo durationInSeconds đo bằng ffprobe để VideoBackground nối các clip đúng bằng độ dài THẬT
// của chúng, thay vì chia đều thời lượng và để clip ngắn đứng hình chờ hết ô của mình.
export const bgClipSchema = z.union([
  z.string(),
  z.object({
    src: z.string(),
    durationInSeconds: z.number().positive().optional(),
  }),
]);

export const pexelsTalkVideoSchema = z.object({
  title: z.string().default(''),
  segments: z.array(segmentSchema).min(1),
  backgroundVideo: z.string().default(''),
  backgroundVideos: z.array(bgClipSchema).optional(),
  // Số frame chờ ở ĐẦU video trước khi lời thoại đầu tiên bắt đầu.
  leadInFrames: z.number().min(0).default(0),
  bgMusic: z.string().default(''),
  bgMusicEnabled: z.boolean().default(true),
  bgMusicVolume: z.number().min(0).max(1).default(0.12),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  accentColor: z.string().default('#a78bfa'),
  showWaveform: z.boolean().default(true),
});

export type PexelsTalkVideoProps = z.infer<typeof pexelsTalkVideoSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type BgClip = z.infer<typeof bgClipSchema>;
