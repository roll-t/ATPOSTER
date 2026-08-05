import { z } from 'zod';

export const segmentSchema = z.object({
  caption: z.string().default(''),
  audio: z.string().default(''),
  durationInFrames: z.number().min(1).default(90),
  wordTimings: z.array(z.object({
    word: z.string(),
    startMs: z.number(),
    endMs: z.number(),
  })).optional(),
});

export const pexelsTalkVideoSchema = z.object({
  title: z.string().default(''),
  segments: z.array(segmentSchema).min(1),
  backgroundVideo: z.string().default(''),
  backgroundVideos: z.array(z.string()).optional(),
  bgMusic: z.string().default(''),
  bgMusicEnabled: z.boolean().default(true),
  bgMusicVolume: z.number().min(0).max(1).default(0.12),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  accentColor: z.string().default('#a78bfa'),
  showWaveform: z.boolean().default(true),
});

export type PexelsTalkVideoProps = z.infer<typeof pexelsTalkVideoSchema>;
export type Segment = z.infer<typeof segmentSchema>;
