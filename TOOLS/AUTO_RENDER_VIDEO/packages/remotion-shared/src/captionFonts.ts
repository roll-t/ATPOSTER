import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import type { CaptionFont } from "./types";

export const CAPTION_FONT_OPTIONS = [
  { key: "be-vietnam-pro", label: "Be Vietnam Pro" },
  { key: "roboto", label: "Roboto" },
  { key: "montserrat", label: "Montserrat" },
  { key: "nunito", label: "Nunito" },
  { key: "inter", label: "Inter" },
  { key: "oswald", label: "Oswald (bold/condensed)" },
  { key: "poppins", label: "Poppins (no dấu tiếng Việt — tự rớt về Be Vietnam Pro cho chữ có dấu)" },
] as const;

const beVietnamProFamily = loadBeVietnamPro("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
}).fontFamily;

// Poppins has no "vietnamese" subset — appended Be Vietnam Pro as fallback
// so Latin glyphs render as Poppins but Vietnamese diacritics fall back per-glyph.
const poppinsFamily = loadPoppins("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

const CAPTION_FONT_FAMILIES: Record<CaptionFont, string> = {
  "be-vietnam-pro": beVietnamProFamily,
  roboto: loadRoboto("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  montserrat: loadMontserrat("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  nunito: loadNunito("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  inter: loadInter("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  oswald: loadOswald("normal", { weights: ["500", "600", "700"], subsets: ["latin", "vietnamese"] }).fontFamily,
  poppins: `'${poppinsFamily}', '${beVietnamProFamily}', sans-serif`,
};

export function resolveCaptionFontFamily(
  captionFont: string | undefined,
  fallbackFontFamily: string
): string {
  if (captionFont && captionFont in CAPTION_FONT_FAMILIES) {
    return CAPTION_FONT_FAMILIES[captionFont as CaptionFont];
  }
  return fallbackFontFamily;
}
