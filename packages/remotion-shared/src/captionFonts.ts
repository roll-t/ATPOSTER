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
  { key: "paytone-one", label: "Paytone One (đậm nét, tròn trịa, bắt mắt)" },
  { key: "itim", label: "Itim (dễ thương, năng động)" },
  { key: "be-vietnam-pro", label: "Be Vietnam Pro" },
  { key: "roboto", label: "Roboto" },
  { key: "montserrat", label: "Montserrat" },
  { key: "nunito", label: "Nunito" },
  { key: "inter", label: "Inter" },
  { key: "oswald", label: "Oswald (bold/condensed)" },
  { key: "poppins", label: "Poppins (no dấu tiếng Việt — tự rớt về Be Vietnam Pro cho chữ có dấu)" },
] as const;

// KHÔNG font nào trong danh sách trên chứa glyph tiếng Nhật — cả 9 font đều chỉ nạp subset
// "latin" + "vietnamese". Skill Phật giáo giờ xuất bản 100% tiếng Nhật, nên chữ kana/kanji sẽ
// rơi về font hệ thống bất kỳ của Chromium headless, hoặc ra ô vuông trống.
//
// Cách xử lý giống hệt Poppins với dấu tiếng Việt bên dưới: nối Noto Sans JP vào CUỐI mọi họ
// font. Trình duyệt tra font theo TỪNG GLYPH, nên chữ Latin vẫn giữ đúng font đã chọn, chỉ
// riêng kana/kanji mới rơi sang Noto. Không font nào bị đổi diện mạo.
const notoSansJpFamily = loadNotoSansJP("normal", {
  weights: ["400", "500", "700"],
  subsets: ["japanese", "latin"],
}).fontFamily;

const beVietnamProFamily = loadBeVietnamPro("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
}).fontFamily;

const paytoneOneFamily = loadPaytoneOne("normal", {
  weights: ["400"],
  subsets: ["latin", "vietnamese"],
}).fontFamily;

const itimFamily = loadItim("normal", {
  weights: ["400"],
  subsets: ["latin", "vietnamese"],
}).fontFamily;

// Poppins has no "vietnamese" subset — appended Be Vietnam Pro as fallback
// so Latin glyphs render as Poppins but Vietnamese diacritics fall back per-glyph.
const poppinsFamily = loadPoppins("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

// Đuôi dự phòng chung: chữ Nhật trước, rồi sans-serif hệ thống.
const JA = `'${notoSansJpFamily}', sans-serif`;

const CAPTION_FONT_FAMILIES: Record<CaptionFont, string> = {
  "paytone-one": `'${paytoneOneFamily}', '${beVietnamProFamily}', ${JA}`,
  itim: `'${itimFamily}', '${beVietnamProFamily}', ${JA}`,
  "be-vietnam-pro": `'${beVietnamProFamily}', ${JA}`,
  roboto: `'${loadRoboto("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily}', ${JA}`,
  montserrat: `'${loadMontserrat("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily}', ${JA}`,
  nunito: `'${loadNunito("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily}', ${JA}`,
  inter: `'${loadInter("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin", "vietnamese"] }).fontFamily}', ${JA}`,
  oswald: `'${loadOswald("normal", { weights: ["500", "600", "700"], subsets: ["latin", "vietnamese"] }).fontFamily}', ${JA}`,
  poppins: `'${poppinsFamily}', '${beVietnamProFamily}', ${JA}`,
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
