import { loadFont as loadPaytoneOne } from "@remotion/google-fonts/PaytoneOne";
import { loadFont as loadItim } from "@remotion/google-fonts/Itim";
import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadNotoSansJP } from "@remotion/google-fonts/NotoSansJP";
import type { CaptionFont } from "./types";

export const CAPTION_FONT_OPTIONS = [
  { key: "paytone-one", label: "Paytone One (đậm nét, tràn trề, bắt mắt)" },
  { key: "itim", label: "Itim (dễ thương, năng động)" },
  { key: "be-vietnam-pro", label: "Be Vietnam Pro" },
  { key: "roboto", label: "Roboto" },
  { key: "montserrat", label: "Montserrat" },
  { key: "nunito", label: "Nunito" },
  { key: "inter", label: "Inter" },
  { key: "oswald", label: "Oswald (bold/condensed)" },
  { key: "poppins", label: "Poppins (no dấu tiếng Việt — tự rớt về Be Vietnam Pro cho chữ có dấu)" },
] as const;

// Cache lưu font family đã nạp để không gọi loadFont trùng lặp
const fontFamiliesCache = new Map<string, string>();
let cachedBeVietnamPro: string | null = null;
let cachedNotoSansJp: string | null = null;

function getBeVietnamPro(): string {
  if (!cachedBeVietnamPro) {
    cachedBeVietnamPro = loadBeVietnamPro("normal", {
      weights: ["500", "700"],
      subsets: ["latin", "vietnamese"],
    }).fontFamily;
  }
  return cachedBeVietnamPro;
}

function getNotoSansJp(): string {
  if (!cachedNotoSansJp) {
    // Chỉ nạp 1 weight 700 để giảm số network requests từ 363 xuống ~120
    cachedNotoSansJp = loadNotoSansJP("normal", {
      weights: ["700"],
      subsets: ["japanese"],
      ignoreTooManyRequestsWarning: true,
    }).fontFamily;
  }
  return cachedNotoSansJp;
}

function getFont(font: CaptionFont): string {
  if (fontFamiliesCache.has(font)) {
    return fontFamiliesCache.get(font)!;
  }

  const beVietnam = getBeVietnamPro();
  let primary = beVietnam;

  switch (font) {
    case "paytone-one":
      primary = loadPaytoneOne("normal", {
        weights: ["400"],
        subsets: ["latin", "vietnamese"],
      }).fontFamily;
      break;
    case "itim":
      primary = loadItim("normal", {
        weights: ["400"],
        subsets: ["latin", "vietnamese"],
      }).fontFamily;
      break;
    case "be-vietnam-pro":
      primary = beVietnam;
      break;
    case "roboto":
      primary = loadRoboto("normal", {
        weights: ["500", "700"],
        subsets: ["latin", "vietnamese"],
      }).fontFamily;
      break;
    case "montserrat":
      primary = loadMontserrat("normal", {
        weights: ["500", "700"],
        subsets: ["latin", "vietnamese"],
      }).fontFamily;
      break;
    case "nunito":
      primary = loadNunito("normal", {
        weights: ["500", "700"],
        subsets: ["latin", "vietnamese"],
      }).fontFamily;
      break;
    case "inter":
      primary = loadInter("normal", {
        weights: ["500", "700"],
        subsets: ["latin", "vietnamese"],
      }).fontFamily;
      break;
    case "oswald":
      primary = loadOswald("normal", {
        weights: ["500", "700"],
        subsets: ["latin", "vietnamese"],
      }).fontFamily;
      break;
    case "poppins":
      primary = loadPoppins("normal", {
        weights: ["500", "700"],
        subsets: ["latin"],
      }).fontFamily;
      break;
  }

  const familyString =
    font === "be-vietnam-pro"
      ? `'${primary}', sans-serif`
      : `'${primary}', '${beVietnam}', sans-serif`;

  fontFamiliesCache.set(font, familyString);
  return familyString;
}

const JAPANESE_CHAR_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

export function resolveCaptionFontFamily(
  captionFont: string | undefined,
  fallbackFontFamily: string,
  sampleText?: string
): string {
  let baseFamily = fallbackFontFamily;
  if (captionFont && CAPTION_FONT_OPTIONS.some((o) => o.key === captionFont)) {
    baseFamily = getFont(captionFont as CaptionFont);
  }

  // Chỉ nạp Noto Sans JP khi văn bản thực sự có ký tự tiếng Nhật (Kana / Kanji)
  // để tránh gửi hàng trăm request Google Fonts không cần thiết cho video tiếng Việt/Anh.
  if (sampleText && JAPANESE_CHAR_REGEX.test(sampleText)) {
    const jp = getNotoSansJp();
    return baseFamily.replace(/, sans-serif$/, `, '${jp}', sans-serif`);
  }

  return baseFamily;
}
