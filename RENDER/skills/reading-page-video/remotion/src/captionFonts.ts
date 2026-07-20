// Curated caption font choices (CapCut-style font picker), each backed by a real
// Google Font loaded via @remotion/google-fonts so it renders identically on any
// machine — unlike the free-text `fontFamily` config field, which only works if
// that exact font happens to be installed on whatever machine runs the render.
// Every font here is confirmed to include the "vietnamese" subset (see
// getInfo().subsets on each subpackage) so bilingual EN/VN captions never fall
// back to tofu boxes on the Vietnamese line.
import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

export const CAPTION_FONT_OPTIONS = [
  { key: "be-vietnam-pro", label: "Be Vietnam Pro" },
  { key: "roboto", label: "Roboto" },
  { key: "montserrat", label: "Montserrat" },
  { key: "nunito", label: "Nunito" },
  { key: "inter", label: "Inter" },
  { key: "oswald", label: "Oswald (bold/condensed)" },
  { key: "poppins", label: "Poppins (no dấu tiếng Việt — tự rớt về Be Vietnam Pro cho chữ có dấu)" },
] as const;

export type CaptionFontKey = (typeof CAPTION_FONT_OPTIONS)[number]["key"];

// Only the weights CaptionLine actually ever requests (500 normal, 600 for
// "page"/highlight, 700 bold) and only latin + vietnamese subsets (this
// pipeline only ever renders English/Vietnamese captions) — narrows each
// font from 80-160+ file requests down to about 6, and avoids Remotion's
// "too many network requests" warning. See CaptionLine's fontWeight usage
// in Caption.tsx before changing this list. (Each call gets its own literal
// array below, rather than one shared constant, so TypeScript can check it
// against that specific font's own narrower weight/subset union type.)
//
// loadFont() both injects the @font-face and returns the actual CSS
// fontFamily name to use — calling it eagerly for all 6 here (instead of
// only the selected one) keeps the lookup a plain sync map, and the extra
// fonts are cheap/cached.
const beVietnamProFamily = loadBeVietnamPro("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily;
// Poppins has no "vietnamese" subset in Google Fonts — quoted with Be Vietnam
// Pro appended as a fallback so Latin glyphs render as Poppins but Vietnamese
// diacritics (which Poppins is missing) fall back per-glyph to a font that
// actually has them, instead of tofu boxes.
const poppinsFamily = loadPoppins("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;

const CAPTION_FONT_FAMILIES: Record<CaptionFontKey, string> = {
  "be-vietnam-pro": beVietnamProFamily,
  roboto: loadRoboto("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  montserrat: loadMontserrat("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  nunito: loadNunito("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  inter: loadInter("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily,
  // Oswald tops out at weight 700 (no 800) — the title still renders using
  // whatever weight is actually requested elsewhere (CSS font-weight
  // matching falls back to the nearest available weight).
  oswald: loadOswald("normal", { weights: ["500", "600", "700"], subsets: ["latin", "vietnamese"] }).fontFamily,
  poppins: `'${poppinsFamily}', '${beVietnamProFamily}', sans-serif`,
};

// Resolves a curated captionFont key to its real loaded CSS fontFamily. Falls
// back to the free-text `fontFamily` config value when no key is set (or an
// unrecognized one is passed), so existing configs without captionFont keep
// behaving exactly as before.
export function resolveCaptionFontFamily(
  captionFont: string | undefined,
  fallbackFontFamily: string
): string {
  if (captionFont && captionFont in CAPTION_FONT_FAMILIES) {
    return CAPTION_FONT_FAMILIES[captionFont as CaptionFontKey];
  }
  return fallbackFontFamily;
}
