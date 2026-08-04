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
 *   --captionStyle=box|tiktok|karaoke|page|hook
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
const CAPTION_STYLES = ["box", "tiktok", "karaoke", "page", "hook"];
const TRANSITION_STYLES = ["crossfade", "slide-left", "slide-right", "slide-up", "zoom"];
const CAPTION_FONTS = ["be-vietnam-pro", "roboto", "montserrat", "nunito", "inter", "oswald"];
// Loose allowlist for freeform color strings (hex, rgb()/rgba(), "transparent",
// CSS named colors) — just enough to reject obviously malformed input before
// it lands in config.json; execFileSync (no shell) already rules out any
// command-injection risk regardless of what's in this string.
const CSS_COLOR_RE = /^[a-zA-Z0-9#(),.\s%-]+$/;

const captionStyle = CAPTION_STYLES.includes(flags.captionStyle) ? flags.captionStyle : "box";
const transitionStyle = TRANSITION_STYLES.includes(flags.transitionStyle) ? flags.transitionStyle : "crossfade";
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

// "imageGroup": nhiều segment LIÊN TIẾP có thể dùng CHUNG đúng 1 hình minh hoạ — hình đứng yên
// trong khi lời kể và phụ đề đổi theo từng câu (đúng cách video whiteboard chuyên nghiệp làm; xem
// imageSlideshow.js). Chỉ segment ĐẦU của mỗi nhóm được đẩy sang Google Flow và do đó chỉ nó mới
// có file ảnh trên đĩa — các segment sau trong nhóm phải trỏ ngược về ảnh của segment đầu đó.
//
// Bản đồ dưới đây: segmentNumber -> segment GIỮ ẢNH của nhóm nó thuộc về. Kịch bản CŨ không có
// imageGroup thì mỗi segment tự giữ ảnh của chính mình, nên mọi project cũ render y hệt như trước.
const imageOwnerBySegment = new Map();
// Thứ tự (1-based) của mỗi segment TRONG nhóm ảnh của nó — dùng làm revealIndex: câu đầu hé 1 ô,
// câu thứ hai hé 2 ô... Segment không thuộc nhóm nào thì luôn là 1.
const revealIndexBySegment = new Map();
{
  const firstSegOfGroup = new Map();
  const countInGroup = new Map();
  for (const seg of manifest.segments) {
    const group = seg.imageGroup;
    if (group === undefined || group === null) {
      imageOwnerBySegment.set(seg.segmentNumber, seg);
      revealIndexBySegment.set(seg.segmentNumber, 1);
      continue;
    }
    if (!firstSegOfGroup.has(group)) firstSegOfGroup.set(group, seg);
    imageOwnerBySegment.set(seg.segmentNumber, firstSegOfGroup.get(group));
    const next = (countInGroup.get(group) || 0) + 1;
    countInGroup.set(group, next);
    revealIndexBySegment.set(seg.segmentNumber, next);
  }
}

// Map segments to Remotion scenes
const scenes = manifest.segments.map((seg) => {
  const paddedNum = String(seg.segmentNumber).padStart(2, "0");

  // Ảnh lấy theo segment GIỮ ẢNH của nhóm (thường là chính nó), còn audio/phụ đề vẫn theo chính
  // segment này — đó là toàn bộ mấu chốt của hiệu ứng "giữ hình, đổi chữ".
  const imageOwner = imageOwnerBySegment.get(seg.segmentNumber) || seg;
  const imagePaddedNum = String(imageOwner.segmentNumber).padStart(2, "0");

  // Detect image extension and file path (supports multiple images per scene like scene-03_1.jpg)
  let imagePath = `${projectFolder}/images/scene-${imagePaddedNum}.jpg`;

  if (Array.isArray(imageOwner.files) && imageOwner.files.length > 0) {
    const firstFile = imageOwner.files[0];
    const relPath = firstFile.startsWith(projectFolder)
      ? firstFile
      : `${projectFolder}/${firstFile.replace(/^\/+/, '')}`;
    if (fs.existsSync(path.join(root, "public", relPath))) {
      imagePath = relPath;
    }
  }

  if (!fs.existsSync(path.join(root, "public", imagePath)) && fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    const match = files.find((f) => f.startsWith(`scene-${imagePaddedNum}.`) || f.startsWith(`scene-${imagePaddedNum}_`));
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

  // Composed scene: elements[] drives Remotion directly, no image file needed
  if (Array.isArray(seg.elements) && seg.elements.length > 0) {
    return {
      image: "",
      audio: `${projectFolder}/audio/scene-${paddedNum}.${audExt}`,
      caption: stripEmotionTags(seg.subtitle || seg.dialogueOrNarration || ""),
      ...(Array.isArray(seg.wordTimings) && seg.wordTimings.length > 0 ? { wordTimings: seg.wordTimings } : {}),
      elements: seg.elements,
    };
  }

  return {
    image: imagePath,
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
    ...(seg.splitSide ? { splitSide: seg.splitSide } : {}),
    ...(Array.isArray(seg.bullets) && seg.bullets.length > 0 ? { bullets: seg.bullets } : {}),

    // Hé lộ dần từng ô của MỘT ảnh nhiều chi tiết (xem RevealMask.tsx). revealLayout lấy từ segment
    // GIỮ ẢNH của nhóm — cả nhóm dùng chung 1 ảnh nên phải chung một cách chia lưới; còn revealIndex
    // là thứ tự của chính segment này TRONG nhóm (1 = câu đầu, 2 = câu thứ hai...), tức mỗi câu hé
    // thêm đúng một ô. Chỉ ghi khi manifest thật sự có, để project cũ render y hệt như trước.
    ...(imageOwner.revealLayout
      ? {
        revealLayout: imageOwner.revealLayout,
        revealIndex: revealIndexBySegment.get(seg.segmentNumber) || 1,
      }
      : {}),
  };
});

// Nhạc nền (tuỳ chọn) — tự dò file audio/bg-music.<ext>
let bgMusicPath = null;
if (fs.existsSync(audioDir)) {
  const files = fs.readdirSync(audioDir);
  const match = files.find((f) => f.startsWith("bg-music."));
  if (match) bgMusicPath = `${projectFolder}/audio/${match}`;
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
  transitionSeconds: 0.5,
  transitionStyle,
  // Nền video của skill người que là TRẮNG. Ảnh của skill này là whiteboard — mực đen trên nền
  // trắng — nên nền lót phải cùng tông trắng đó. Trước đây để #0E0F13 (xám xanh rất tối, kế thừa
  // từ hồi dùng chung skill với moral_talk_slideshow): mỗi khi nền lộ ra (ảnh thiếu/hỏng, ảnh
  // không phủ kín khung do lệch tỉ lệ, mép ảnh lúc Ken Burns pan/zoom, hay lúc chuyển cảnh) thì
  // hiện ra mảng ĐEN chói mắt giữa một video toàn trắng.
  //
  // "hook" (pictogram trắng phát sáng trên nền ĐEN TUYỆT ĐỐI) vẫn giữ #000000: style đó cố tình
  // dùng ảnh nền đen, nền video phải khớp CHÍNH XÁC #000000 nếu không sẽ lộ viền lệch tông ở mép.
  bgColor: isHookStyle ? "#000000" : "#FFFFFF",

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
};

// Ensure output final directory exists
const finalDir = path.join(projectPath, "final");
fs.mkdirSync(finalDir, { recursive: true });

// Write config.json
const configOutPath = path.join(finalDir, "config.json");
fs.writeFileSync(configOutPath, JSON.stringify(remotionConfig, null, 2));
console.log(`Generated Remotion config: ${configOutPath}`);

// Run Remotion install if missing
const isWindows = process.platform === "win32";
if (!fs.existsSync(path.join(root, "node_modules", "@remotion", "cli"))) {
  console.log("Remotion not installed yet — running npm install...");
  execFileSync("npm", ["install"], { cwd: root, stdio: "inherit", shell: isWindows });
}

// Render the video
const remotionCliEntry = path.join(root, "node_modules", "@remotion", "cli", "remotion-cli.js");
const outputVideoPath = path.join(finalDir, "video.mp4");

console.log(`\nRendering video to -> public/${projectFolder}/final/video.mp4`);
execFileSync(
  process.execPath,
  [
    remotionCliEntry,
    "render",
    "src/index.ts",
    "SlideshowVideo",
    outputVideoPath,
    `--props=${configOutPath}`,
  ],
  { cwd: root, stdio: "inherit" }
);

console.log(`\nSuccess! The final video is ready: public/${projectFolder}/final/video.mp4`);
