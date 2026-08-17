import { z } from "zod";

// --- Primitive types used in component props across skills ---

export type CaptionStyle = "box" | "tiktok" | "karaoke" | "page" | "hook";

// All fonts across all skills (narrated: 6 fonts; stick-figure: adds poppins)
export type CaptionFont =
  | "paytone-one"
  | "itim"
  | "be-vietnam-pro"
  | "roboto"
  | "montserrat"
  | "nunito"
  | "inter"
  | "oswald"
  | "poppins";

export type KenBurnsDirection = "in" | "out" | "pan-left" | "pan-right" | "none";

export type WordTiming = { word: string; start: number; end: number };

// --- Shared zod schemas (imported by each skill's schema.ts) ---

export const sfxCueSchema = z.object({
  src: z.string(),
  atSeconds: z.number().min(0).default(0),
  volume: z.number().min(0).max(1).default(0.6),
});

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const arrowCueSchema = z.object({
  from: pointSchema,
  to: pointSchema,
  atSeconds: z.number().min(0).default(0),
  animateInSeconds: z.number().min(0.05).max(3).default(0.4),
  holdSeconds: z.number().min(0).optional(),
  color: z.string().default("#FE2C55"),
  strokeWidth: z.number().min(1).max(20).default(6),
});

export type SfxCue = z.infer<typeof sfxCueSchema>;
export type ArrowCue = z.infer<typeof arrowCueSchema>;
