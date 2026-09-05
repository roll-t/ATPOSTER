#!/usr/bin/env node
/**
 * render-project.mjs
 * - Automatically generates a Remotion config from a project's manifest.json
 * - Renders the video into public/<project>/final/video.mp4
 *
 * Usage: node scripts/render-project.mjs <project-folder-name> [options]
 * Example: node scripts/render-project.mjs van_xai_tin_dung_260716_164922
 * Example with options:
 *   node scripts/render-project.mjs my-video --captionStyle=karaoke --transitionStyle=slide-left --bilingual=false
 *
 * Options (all optional, fall back to the skill's original defaults):
 *   --captionStyle=box|tiktok|karaoke|page|hook|none
 *   --kenBurnsMode=in|out|pan-left|pan-right|none   (bỏ trống = luân phiên in/out theo cảnh)
 *   --cornerPatch=false   tắt ô che góc phải dưới (bắt buộc với ảnh nền sáng)
 *   --channelLogo=false   ẩn logo kênh mờ ở đáy mọi slide
 *   --transitionStyle=crossfade|slide-left|slide-right|slide-up|zoom
 *   --bilingual=true|false   (show/hide the "\n"-separated translation line)
 *   --captionFont=be-vietnam-pro|roboto|montserrat|nunito|inter|oswald
 *   --captionFontSize=<16-120>
 *   --captionSecondaryFontSize=<10-100> (bilingual translation line, independent of captionFontSize)
 *   --captionTextColor=<CSS color, e.g. "#FFFFFF">
 *   --captionBgColor=<CSS color, or "transparent" to remove the box>
 *   --highlightColor=<CSS color> (karaoke/page active-word highlight pill)
 *
 * --captionStyle=page automatically switches captionMode to "full" and
 * captionPosition to "center" (a whole scene's text held on screen, word-
 * highlighted, centered) instead of the default chunked/bottom subtitle —
 * that combination is what makes the "page" style read as a book page
 * rather than a short caption. See Caption.tsx / schema.ts.
 *
 * --captionStyle=hook is a top-anchored title card: scene 0 shows the
 * video's own title (big, uppercase, meant to hook the viewer in the first
 * few seconds), every other scene shows its own caption in a smaller card
 * (any leading "N." list-number prefix stripped). Slides down + fades in on
 * entry, slides up + fades out on exit. Also nudges the scene's image down
 * a little to leave headroom under the card. See Caption.tsx / schema.ts.
 *
 * The 4 --caption*Font/Size/Color flags are CapCut-style manual overrides on
 * top of whatever captionStyle already looks like — each is independent and
 * only replaces the one thing it names (see schema.ts).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectFolder = process.argv[2];

if (!projectFolder) {
  console.error("Usage: node scripts/render-project.mjs <project-folder-name> [--captionStyle=...] [--transitionStyle=...] [--bilingual=true|false]");
  process.exit(1);
}

// Parse --key=value flags from the remaining argv, ignoring anything malformed
// or not on the allowed list — always falls back to the schema's own default
// rather than passing a bad value through to Remotion.
const flags = {};
for (const arg of process.argv.slice(3)) {
  const match = arg.match(/^--([a-zA-Z]+)=(.*)$/);
  if (match) flags[match[1]] = match[2];
}
const CAPTION_STYLES = ["box", "tiktok", "karaoke", "page", "hook", "none"];
// Hướng Ken Burns áp cho MỌI cảnh. Bỏ trống = giữ hành vi cũ: Scene.tsx tự luân phiên in/out
// theo chỉ số cảnh. Đặt "in" thì cả video là một nhịp phóng to chậm đều, không đảo chiều.
const KEN_BURNS_MODES = ["in", "out", "pan-left", "pan-right", "none"];
const TRANSITION_STYLES = ["crossfade", "slide-left", "slide-right", "slide-up", "zoom"];
const CAPTION_FONTS = ["paytone-one", "itim", "be-vietnam-pro", "roboto", "montserrat", "nunito", "inter", "oswald", "poppins"];
// Loose allowlist for freeform color strings (hex, rgb()/rgba(), "transparent",
// CSS named colors) — just enough to reject obviously malformed input before
// it lands in config.json; execFileSync (no shell) already rules out any
// command-injection risk regardless of what's in this string.
const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s%-]+$/;

const captionStyle = CAPTION_STYLES.includes(flags.captionStyle) ? flags.captionStyle : "box";
const transitionStyle = TRANSITION_STYLES.includes(flags.transitionStyle) ? flags.transitionStyle : "crossfade";
const kenBurnsMode = KEN_BURNS_MODES.includes(flags.kenBurnsMode) ? flags.kenBurnsMode : undefined;
// Mặc định BẬT: giữ nguyên hành vi cũ của dòng pictogram nền đen. Chỉ tắt khi được dặn tường minh.
const imageCornerPatch = flags.cornerPatch !== "false";
// Mặc định BẬT, giống hành vi cũ khi logo còn gắn cứng trong Scene.tsx.
const channelLogo = flags.channelLogo !== "false";
const showBilingual = flags.bilingual === undefined ? true : flags.bilingual !== "false";
// "page" only makes sense as a whole-scene, centered block — see the usage note above.
const isPageStyle = captionStyle === "page";
// "hook" ignores captionPosition/captionMode entirely (Caption.tsx hardcodes its own
// top/full layout for this style) — set them to reflect that anyway so config.json stays
// accurate for anyone reading it, same reasoning as isPageStyle above.
const isHookStyle = captionStyle === "hook";

const captionFont = CAPTION_FONTS.includes(flags.captionFont) ? flags.captionFont : undefined;
const parsedFontSize = flags.captionFontSize !== undefined ? Number(flags.captionFontSize) : NaN;
const captionFontSize = Number.isFinite(parsedFontSize) && parsedFontSize >= 16 && parsedFontSize <= 120
  ? parsedFontSize
  : undefined;
const parsedSecondaryFontSize = flags.captionSecondaryFontSize !== undefined ? Number(flags.captionSecondaryFontSize) : NaN;
const captionSecondaryFontSize = Number.isFinite(parsedSecondaryFontSize) && parsedSecondaryFontSize >= 10 && parsedSecondaryFontSize <= 100
  ? parsedSecondaryFontSize
  : undefined;
const captionTextColor = flags.captionTextColor && CSS_COLOR_RE.test(flags.captionTextColor)
  ? flags.captionTextColor
  : undefined;
const captionBgColor = flags.captionBgColor && CSS_COLOR_RE.test(flags.captionBgColor)
  ? flags.captionBgColor
  : undefined;
const highlightColor = flags.highlightColor && CSS_COLOR_RE.test(flags.highlightColor)
  ? flags.highlightColor
  : undefined;

const imageScale = flags.imageScale !== undefined ? Number(flags.imageScale) : 1.0;
const imageTranslateY = flags.imageTranslateY !== undefined ? Number(flags.imageTranslateY) : 0;
const captionMarginY = flags.captionMarginY !== undefined ? Number(flags.captionMarginY) : 0;

// Gemini đôi khi lẫn [emotion tag] (vd "[warmly]") vào field subtitle hiển thị trên màn hình, dù
// tag này chỉ nhằm hướng dẫn giọng đọc TTS diễn cảm hơn (xem AGENT_TOOL's voiceover/route.js —
// nơi tag được strip trước khi gửi tổng hợp giọng). Strip theo TỪNG DÒNG (không strip \s+ toàn
// chuỗi) vì caption song ngữ dùng "\n" làm ranh giới dòng chính/dịch — xem Caption.tsx.
function stripEmotionTags(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.replace(/\[[^\]]*\]/g, " ").replace(/[ \t]+/g, " ").trim())
    .join("\n");
}

const projectPath = path.join(root, "public", projectFolder);
const manifestPath = path.join(projectPath, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error(`Error: manifest.json not found in ${projectPath}`);
  process.exit(1);
}

console.log(`Reading manifest: ${manifestPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Determine file extensions for images and audio
const imageDir = path.join(projectPath, "images");
const audioDir = path.join(projectPath, "audio");

// Map segments to Remotion scenes
const scenes = manifest.segments.map((seg) => {
  const paddedNum = String(seg.segmentNumber).padStart(2, "0");
  
  // Detect image extension and file path (supports multiple images per scene like scene-03_1.jpg)
  let imagePath = `${projectFolder}/images/scene-${paddedNum}.jpg`;

  if (Array.isArray(seg.files) && seg.files.length > 0) {
    const firstFile = seg.files[0];
    const relPath = firstFile.startsWith(projectFolder)
      ? firstFile
      : `${projectFolder}/${firstFile.replace(/^\/+/, '')}`;
    if (fs.existsSync(path.join(root, "public", relPath))) {
      imagePath = relPath;
    }
  }

  if (!fs.existsSync(path.join(root, "public", imagePath)) && fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    const match = files.find((f) => f.startsWith(`scene-${paddedNum}.`) || f.startsWith(`scene-${paddedNum}_`));
    if (match) {
      imagePath = `${projectFolder}/images/${match}`;
    }
  }

  // Detect audio extension (fallback to mp3)
  let audExt = "mp3";
  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir);
    const match = files.find((f) => f.startsWith(`scene-${paddedNum}.`) || f.startsWith(`scene-${paddedNum}_`));
    if (match) audExt = match.split(".").pop();
  }

  return {
    image: imagePath,
    // Ghim hướng Ken Burns lên TỪNG cảnh khi có cờ --kenBurnsMode. Scene.tsx đọc scene.kenBurns
    // trước rồi mới rơi về luân phiên theo chỉ số, nên ghim ở đây là đủ, không phải sửa component.
    ...(kenBurnsMode ? { kenBurns: kenBurnsMode } : {}),
    audio: `${projectFolder}/audio/scene-${paddedNum}.${audExt}`,
    caption: stripEmotionTags(seg.subtitle || seg.dialogueOrNarration || ""),
    // Real per-word timing from ElevenLabs' alignment API, if the voiceover
    // step captured it (see AGENT_TOOL's voiceover/route.js) — lets
    // captionStyle: "karaoke" highlight the exact word being spoken instead
    // of estimating from word length. Omitted entirely when absent, so it
    // falls back to the estimate (schema field is optional).
    ...(Array.isArray(seg.wordTimings) && seg.wordTimings.length > 0 ? { wordTimings: seg.wordTimings } : {}),

    // Bố cục riêng của slide (Gemini chọn lúc viết kịch bản — xem imageSlideshow.js). Chỉ truyền
    // xuống khi manifest THẬT SỰ có, để mọi project cũ (không có 3 trường này) giữ nguyên
    // layout mặc định và render ra đúng như trước.
    ...(seg.layout ? { layout: seg.layout } : {}),
    ...(seg.durationSeconds ? { durationSeconds: Number(seg.durationSeconds) } : (seg.layout === 'chapter-title' ? { durationSeconds: 3 } : {})),
    ...(seg.splitSide ? { splitSide: seg.splitSide } : {}),
    ...(Array.isArray(seg.bullets) && seg.bullets.length > 0 ? { bullets: seg.bullets } : {}),
  };
});

// Nhạc nền (tuỳ chọn) — tự dò file audio/bg-music.<ext>
let bgMusicPath = null;
if (fs.existsSync(audioDir)) {
  const files = fs.readdirSync(audioDir);
  const match = files.find((f) => f.startsWith("bg-music."));
  if (match) bgMusicPath = `${projectFolder}/audio/${match}`;
}

/**
 * Logo thương hiệu đóng mờ góc phải dưới (tuỳ chọn).
 *
 * Tự dò file trong public/brand/ và CHỈ đưa vào config khi thật sự tồn tại — giống hệt cách xử lý
 * nhạc nền ngay bên trên. Lý do bắt buộc phải dò ở đây (Node) chứ không để component tự xoay xở:
 * <Img> của Remotion coi ảnh tải lỗi là lỗi nghiêm trọng và làm HỎNG CẢ LƯỢT RENDER. Chưa bỏ logo
 * vào mà cứ trỏ tới nó thì mọi video đều render fail, trong khi đúng ra chỉ nên là "không có logo".
 *
 * Đặt REMOTION_BRAND_LOGO=0 để tắt hẳn dù file có tồn tại.
 */
let brandLogoPath = null;
if (process.env.REMOTION_BRAND_LOGO !== "0") {
  const brandDir = path.join(root, "public", "brand");
  if (fs.existsSync(brandDir)) {
    const logo = fs.readdirSync(brandDir).find((f) => /^logo\.(png|webp|svg|jpg|jpeg)$/i.test(f));
    if (logo) brandLogoPath = `brand/${logo}`;
  }
}

const bgMusicEnabled = flags.bgMusicEnabled === undefined ? true : flags.bgMusicEnabled !== "false";
const parsedBgMusicVolume = flags.bgMusicVolume !== undefined ? Number(flags.bgMusicVolume) : NaN;
const bgMusicVolume = Number.isFinite(parsedBgMusicVolume) && parsedBgMusicVolume >= 0 && parsedBgMusicVolume <= 1
  ? parsedBgMusicVolume
  : 0.12;

// Build Remotion Config object
const remotionConfig = {
  title: manifest.title || "slideshow-video",
  // Đọc orientation từ cờ truyền vào (--orientation=landscape|portrait) hoặc từ manifest
  orientation: (flags.orientation === "landscape" || flags.orientation === "portrait")
    ? flags.orientation
    : (manifest.orientation === "landscape" ? "landscape" : "portrait"),
  captionPosition: isPageStyle ? "center" : isHookStyle ? "top" : "bottom",
  imageFit: "cover",
  kenBurns: !isPageStyle,
  imageCornerPatch,
  channelLogo,
  transitionSeconds: 0.5,
  transitionStyle,
  // "hook" (pictogram trắng phát sáng trên nền ĐEN TUYỆT ĐỐI, xem moral_talk_slideshow) cần nền
  // video khớp CHÍNH XÁC #000000 với nền ảnh — #0E0F13 (xám xanh rất tối) mặc định cho các style
  // khác lộ ra thành viền/mảng màu lệch tông thấy được ở mép ảnh lúc Ken Burns pan/zoom hoặc lúc
  // chuyển cảnh, vì ảnh và nền không cùng 1 màu đen tuyệt đối.
  bgColor: isHookStyle ? "#000000" : "#0E0F13",

  // Nền + màu chữ cho 3 bố cục mới theo TỪNG SLIDE ("bullets"/"split"/"caption-left", xem
  // SceneLayouts.tsx). PHẢI ghi tường minh ở đây chứ không dựa vào giá trị mặc định của zod:
  // giá trị mặc định trong schema chỉ áp cho defaultProps của Remotion Studio, còn config truyền
  // qua --props thì thiếu khoá nào là undefined khoá đó — nền slide sẽ trong suốt và lòi màu tối
  // toàn cục ra sau lưng (đã gặp đúng lỗi này khi render thử).
  //
  // Hai tông đối lập nhau theo phong cách của skill:
  //   - "hook" = Nói Chuyện Đạo Lý: pictogram trắng trên nền ĐEN -> nền đen, chữ trắng.
  //   - còn lại = Người Que whiteboard: mực đen trên nền TRẮNG -> nền giấy sáng, chữ đen.
  slideBgColor: flags.slideBgColor || (isHookStyle ? "#000000" : "#F4F4F4"),
  slideTextColor: flags.slideTextColor || (isHookStyle ? "#FFFFFF" : "#1A1A1A"),
  fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
  captionMode: isPageStyle || isHookStyle ? "full" : "chunked",
  captionWordsPerChunk: 4,
  captionStyle,
  captionFont,
  captionFontSize,
  captionSecondaryFontSize,
  captionTextColor,
  captionBgColor,
  highlightColor,
  showBilingual,
  imageScale,
  imageTranslateY,
  captionMarginY,
  audioPaddingSeconds: 0.4,
  scenes: scenes,
  // Chỉ đưa bgMusic vào config khi THỰC SỰ có file đã tải lên VÀ chưa bị tắt tường minh
  ...(bgMusicPath && bgMusicEnabled ? { bgMusic: bgMusicPath, bgMusicVolume } : {}),
  ...(brandLogoPath ? { brandLogo: brandLogoPath } : {}),
};

// Ensure output final directory exists
const finalDir = path.join(projectPath, "final");
fs.mkdirSync(finalDir, { recursive: true });

// Write config.json
const configOutPath = path.join(finalDir, "config.json");
fs.writeFileSync(configOutPath, JSON.stringify(remotionConfig, null, 2));
console.log(`Generated Remotion config: ${configOutPath}`);

// Tìm @remotion/cli: local trước, fallback workspace root (RENDER/node_modules).
const isWindows = process.platform === "win32";
const workspaceRoot = path.resolve(root, "..", "..", ".."); // RENDER/
const localCliDir  = path.join(root, "node_modules", "@remotion", "cli");
const wsCliDir     = path.join(workspaceRoot, "node_modules", "@remotion", "cli");
if (!fs.existsSync(localCliDir) && !fs.existsSync(wsCliDir)) {
  console.log("Remotion not installed yet — running npm install...");
  execFileSync("npm", ["install"], { cwd: workspaceRoot, stdio: "inherit", shell: isWindows });
}

// Render the video
const remotionCliEntry = path.join(fs.existsSync(localCliDir) ? localCliDir : wsCliDir, "remotion-cli.js");
const outputVideoPath = path.join(finalDir, "video.mp4");

const cores = os.cpus().length;
const defaultConcurrency = Math.max(1, Math.floor(cores / 2));
const concurrency = process.env.REMOTION_CONCURRENCY ? parseInt(process.env.REMOTION_CONCURRENCY, 10) : defaultConcurrency;

console.log(`\nRendering video to -> public/${projectFolder}/final/video.mp4 (concurrency: ${concurrency}/${cores})`);
execFileSync(
  process.execPath,
  [
    remotionCliEntry,
    "render",
    "src/index.ts",
    "SlideshowVideo",
    outputVideoPath,
    `--props=${configOutPath}`,
    `--concurrency=${concurrency}`,
  ],
  { cwd: root, stdio: "inherit" }
);

console.log(`\nSuccess! The final video is ready: public/${projectFolder}/final/video.mp4`);

// Ảnh bìa (thumbnail) — render riêng bằng composition MoralTalkCover (xem MoralTalkCover.tsx),
// tái dùng ĐÚNG kiểu chữ "Tiêu đề mở đầu" (hook) nên luôn khớp phong cách chữ to/viết hoa/1 cụm tô
// màu nhấn dù video này có đang chọn kiểu phụ đề nào khác đi nữa — bìa là một sản phẩm cố định,
// không phụ thuộc captionStyle của video. Lưu vào images/ (không phải final/) vì
// app/api/prompts/created-videos/route.js đọc thumbnail preview từ đúng thư mục đó.
//
// Truyền THẲNG manifest.title (không tự tách cụm tô màu ở đây nữa) — Caption.tsx/HookCaption giờ
// tự chọn cụm cuối câu để tô màu khi title chưa có sẵn "**...**" (xem autoHighlightTail trong
// Caption.tsx), dùng CHUNG đúng 1 logic cho cả ảnh bìa lẫn slide 1 thật của video khi phát — trước
// đây có 2 bản logic riêng (1 bản JS ở đây, video thật thì KHÔNG có bản nào cả) nên ảnh bìa có màu
// nhấn còn khung hình đầu của video lúc phát lại toàn chữ trắng, không khớp nhau.
if (scenes.length > 0 && scenes[0].image) {
  const coverOutPath = path.join(imageDir, "cover.jpg");
  console.log(`\nRendering cover image -> public/${projectFolder}/images/cover.jpg`);
  try {
    execFileSync(
      process.execPath,
      [
        remotionCliEntry,
        "still",
        "src/index.ts",
        "MoralTalkCover",
        coverOutPath,
        `--props=${JSON.stringify({
          image: scenes[0].image,
          headline: manifest.title || "slideshow-video",
          highlightColor: "#d9a620",
          orientation: remotionConfig.orientation,
          channelLogo,
        })}`,
        "--frame=20",
      ],
      { cwd: root, stdio: "inherit" }
    );
    console.log(`Cover image ready: public/${projectFolder}/images/cover.jpg`);
  } catch (coverErr) {
    // Ảnh bìa chỉ là tiện ích hiển thị ở lưới "Video Đã Tạo" — lỗi ở bước này không nên làm
    // hỏng cả lượt render (video chính đã render xong và lưu thành công ở trên).
    console.error(`Không tạo được ảnh bìa (bỏ qua, video chính vẫn dùng được):`, coverErr.message);
  }
}
