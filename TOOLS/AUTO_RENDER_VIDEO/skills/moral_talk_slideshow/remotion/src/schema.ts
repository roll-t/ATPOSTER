import { z } from "zod";
import { sfxCueSchema, arrowCueSchema } from "@atposter/remotion-shared";
export { sfxCueSchema, arrowCueSchema } from "@atposter/remotion-shared";
export type { SfxCue, ArrowCue } from "@atposter/remotion-shared";

export const sceneSchema = z.object({
  // Path under public/ (resolved via staticFile) or a full https:// URL —
  // the photo/illustration shown for this scene.
  image: z.string(),

  // Path under public/ or a full https:// URL — the narration clip that
  // plays during this scene. This is what actually drives the scene's
  // screen time (see durationSeconds below), so every scene needs one.
  audio: z.string(),

  // The line(s) of script text shown as an on-screen caption for this
  // scene. Leave "" for a scene with no caption (image + audio only).
  caption: z.string().default(""),

  // Screen time in seconds. Optional — if omitted, it's resolved from the
  // actual length of `audio` (plus the global audioPaddingSeconds) by
  // calculateMetadata in Root.tsx before the video ever renders, so you
  // never have to hand-time a scene to match its narration. Set this only
  // to force a different length than the audio (e.g. trim a long clip, or
  // hold an image longer than its narration).
  durationSeconds: z.number().min(0.5).max(60).optional(),

  // Per-scene override of the global Ken Burns direction. "in" = slow zoom
  // in, "out" = slow zoom out, "pan-left"/"pan-right" = slow horizontal pan
  // with slight zoom. Omit to let the scene index decide (auto-alternating).
  kenBurns: z.enum(["in", "out", "pan-left", "pan-right", "none"]).optional(),

  // Per-scene override of image fit. Omit to use the global default.
  imageFit: z.enum(["cover", "contain"]).optional(),

  // Real per-word timing (seconds, relative to this scene's own audio
  // start) captured from the TTS provider's character-alignment API during
  // voiceover generation (see AGENT_TOOL's voiceover/route.js) — not
  // something you'd normally hand-write. When present and its word count
  // matches the caption's word count, captionStyle: "karaoke" (and chunk
  // switching in general) uses these exact timestamps instead of the
  // word-length-weighted estimate, so the highlighted word matches the
  // actual spoken audio instead of an approximation. Omit if you don't
  // have real timestamps — everything falls back to the estimate.
  wordTimings: z
    .array(
      z.object({
        word: z.string(),
        start: z.number(),
        end: z.number(),
      })
    )
    .optional(),

  // Optional one-shot sound effects layered under this scene (e.g. a
  // whoosh on entry, a ding on a reveal) — on top of the narration audio
  // above and independent of the video-wide bgMusic loop. Omit for a
  // scene with no SFX.
  sfx: z.array(sfxCueSchema).optional(),

  // Optional animated pointing arrows layered over this scene's image
  // (e.g. calling out a prop or a piece of in-scene text). Omit for a
  // scene with no arrows.
  arrows: z.array(arrowCueSchema).optional(),

  // BỐ CỤC RIÊNG CỦA SLIDE NÀY — thứ cho phép một video đổi cách trình bày giữa các slide thay
  // vì lặp lại đúng một khuôn từ đầu đến cuối (kiểu dựng của các kênh explainer whiteboard).
  //
  //   "default"      : giữ nguyên bố cục toàn cục (captionStyle/captionPosition) — hành vi cũ,
  //                    dùng cho mọi scene không khai báo gì, nên video cũ render y hệt như trước.
  //   "image-only"   : chỉ hình, bỏ hẳn phụ đề dù scene có caption (nhịp nghỉ giữa các đoạn nói).
  //   "caption-left" : hình giữ nguyên toàn khung, phụ đề dồn về GÓC DƯỚI-TRÁI thay vì căn giữa.
  //   "split"        : chia đôi khung — chữ bên trái, hình bên phải (hoặc ngược lại, xem
  //                    splitSide). Hình được thu nhỏ vừa nửa khung thay vì phủ kín.
  //   "bullets"      : slide CHỮ THUẦN, không hình: liệt kê các ý trong `bullets` theo dạng gạch
  //                    đầu dòng, hiện dần từng dòng theo tiến độ lời kể.
  layout: z
    .enum(["default", "image-only", "caption-left", "split", "bullets"])
    .optional(),

  // Chỉ dùng khi layout = "split": hình nằm bên nào. Mặc định "right" (chữ trái / hình phải).
  splitSide: z.enum(["left", "right"]).optional(),

  // Chỉ dùng khi layout = "bullets": danh sách các ý hiện lên. Mỗi phần tử là 1 gạch đầu dòng.
  // Các dòng KHÔNG hiện cùng lúc — chúng xuất hiện dần đều theo thời lượng của scene, để khớp
  // với việc người dẫn đang đọc lần lượt từng ý.
  bullets: z.array(z.string()).optional(),
});

export const slideshowVideoSchema = z.object({
  // Purely for naming: render.mjs slugifies this for the output folder
  // (public/<NN-slug>/). Not shown on screen. Leave "" to fall back to
  // "slideshow-video".
  title: z.string().default(""),

  // The heart of the video: one entry per photo + its narration.
  scenes: z.array(sceneSchema).min(1),

  // "landscape" = 1920x1080 (YouTube), "portrait" = 1080x1920
  // (TikTok/Reels/Shorts). Pick "portrait" when the source photos are
  // themselves vertical — otherwise "landscape" with imageFit: "contain"
  // leaves large empty bars on both sides. Resolved in Root.tsx's
  // calculateMetadata, so it can vary per video/batch entry.
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),

  // Look & feel
  // "center" is meant for captionStyle: "page" (a full paragraph held on
  // screen for the whole scene) — vertically centering a large block of
  // text reads better than pinning it to an edge the way a short subtitle
  // does.
  // Màu nền cho các slide KHÔNG có ảnh phủ kín (layout "bullets" và "split") — bgColor toàn cục
  // vốn chỉ là màu lót phía sau ảnh nên gần như không bao giờ lộ ra, thường để tối; còn 2 bố cục
  // này phơi nền ra cả khung nên cần màu riêng, mặc định lấy tông giấy trắng khớp phong cách
  // whiteboard (hình mực đen trên nền trắng).
  slideBgColor: z.string().default("#F4F4F4"),

  // Màu CHỮ cho 3 bố cục mới ("bullets", "split", "caption-left"). Tách riêng khỏi
  // captionTextColor một cách có chủ đích: captionTextColor là chữ nằm TRONG khung nền phụ đề
  // (nên thường để trắng vì khung nền tối), còn 3 bố cục này vẽ chữ TRỰC TIẾP lên nền slide —
  // dùng chung một giá trị sẽ cho chữ trắng trên nền giấy trắng, mất hút hoàn toàn.
  slideTextColor: z.string().default("#1A1A1A"),

  captionPosition: z.enum(["top", "bottom", "center"]).default("bottom"),
  imageFit: z.enum(["cover", "contain"]).default("cover"),
  imageScale: z.number().min(0.2).max(2).default(1),
  imageTranslateY: z.number().min(-100).max(100).default(0),
  captionMarginY: z.number().min(-800).max(800).default(0),
  kenBurns: z.boolean().default(true),
  // Duration of the transition applied between every pair of consecutive
  // scenes (and the fade-in/out at the very start/end of the video).
  transitionSeconds: z.number().min(0).max(2).default(0.5),

  // Shape of that transition. "crossfade" = classic opacity dissolve.
  // "slide-left"/"slide-right"/"slide-up" = the outgoing scene is pushed
  // off-screen while the incoming one pushes in from the opposite edge
  // (both fully opaque, no dissolve). "zoom" = outgoing scales up while
  // fading out, incoming scales in from slightly smaller while fading in.
  // All styles overlap the two scenes' visual layers during the
  // transition window (SlideshowVideo.tsx) so the scene's own bgColor is
  // never exposed as a flash between cuts.
  transitionStyle: z
    .enum(["crossfade", "slide-left", "slide-right", "slide-up", "zoom"])
    .default("crossfade"),
  bgColor: z.string().default("#0E0F13"),
  fontFamily: z
    .string()
    .default("'Be Vietnam Pro','Noto Sans',Arial,sans-serif"),

  // How the caption text is paced against the narration audio. "chunked"
  // splits it into a few words at a time, advancing through the chunks
  // proportionally to each chunk's word count across the scene's
  // duration — there's no word-level transcript/timestamps to sync
  // against exactly, so this is an approximation, but it reads much closer
  // to "captions following the voice" than showing the full paragraph the
  // whole time. "full" shows the whole caption for the whole scene.
  captionMode: z.enum(["chunked", "full"]).default("chunked"),
  captionWordsPerChunk: z.number().min(1).max(12).default(4),

  // Visual treatment of the caption. "box" = the original dark rounded
  // subtitle bar. "tiktok" = bold white text with a black outline, no
  // background box (secondary/translation line in an accent color).
  // "karaoke" = same layout as "box" but the single word currently being
  // spoken (estimated the same word-weighted way as chunk pacing) gets a
  // colored highlight pill and a slightly larger size. "page" = a large
  // light "paper" card meant for `captionMode: "full"` + `captionPosition:
  // "center"` — the whole scene's text (a "page" of a story) held on
  // screen at once with the currently-spoken word highlighted, like a
  // read-along/graded-reader video rather than a short subtitle. "hook" =
  // top-anchored dark title card, forced full/top regardless of
  // captionMode/captionPosition — scene 0 shows the video's own `title`
  // (uppercase, large, meant to hook the viewer in the first few seconds),
  // every other scene shows its own caption (smaller, sentence case, any
  // leading "N. " list-number prefix stripped) in the same card. Slides
  // down + fades in on entry, slides up + fades out on exit. Also nudges
  // the scene's own image down a little (see SceneImage.tsx) to leave
  // headroom for the card instead of the card sitting on top of it. See
  // Caption.tsx.
  captionStyle: z.enum(["box", "tiktok", "karaoke", "page", "hook"]).default("box"),

  // CapCut-style manual overrides on top of whatever captionStyle already looks
  // like — every field here is optional and only overrides that one visual
  // aspect, so an unset field keeps the style's own built-in default exactly as
  // before. All four are independent: set just one (e.g. only captionFontSize)
  // without needing to also specify the others.
  //
  // Curated Google Font, loaded via @remotion/google-fonts (see
  // captionFonts.ts) so it renders identically regardless of what fonts are
  // installed on the machine doing the render — unlike the free-text
  // `fontFamily` field above, which silently falls back to a system font if
  // the named one isn't installed. Omit to keep using `fontFamily`.
  captionFont: z
    .enum(["paytone-one", "itim", "be-vietnam-pro", "roboto", "montserrat", "nunito", "inter", "oswald"])
    .optional(),
  // Overrides the caption's base font size (the style's own default is 40px,
  // or 32px for captionStyle: "page"). The active/highlighted word in
  // "karaoke"/"page" styles still renders ~16% larger than this.
  captionFontSize: z.number().min(16).max(120).optional(),
  // Overrides the SECONDARY (translation) line's font size independently of
  // captionFontSize above — omit to keep the style's own built-in ratio to
  // the primary line (65% for box/tiktok/karaoke, 69% for "page", 60% for
  // "hook"). Lets the primary and secondary lines be sized completely
  // independently instead of always scaling together.
  captionSecondaryFontSize: z.number().min(10).max(100).optional(),
  // Overrides the caption text color (CSS color string, e.g. "#FFFFFF").
  captionTextColor: z.string().optional(),
  // Overrides the caption's background box/card color (CSS color string).
  // Set to "transparent" to remove the background entirely. Has no visible
  // effect on captionStyle: "tiktok", which never renders a background box.
  captionBgColor: z.string().optional(),
  // Overrides the karaoke/page-style active-word highlight pill color (CSS
  // color string). Only visible on captionStyle: "karaoke" (default
  // "#FE2C55") or "page" (default "#FFCB4D") — no effect on "box"/"tiktok",
  // which never highlight individual words.
  highlightColor: z.string().optional(),

  // Whether to show the secondary (translation) line of a bilingual
  // caption ("English\nTiếng Việt" — see Caption.tsx). Sceneswith no
  // "\n" in their caption are unaffected either way; this only lets you
  // quickly render a bilingual script as English-only without editing
  // every scene's caption text.
  showBilingual: z.boolean().default(true),

  // Extra seconds a scene holds after its narration finishes, so the cut
  // to the next scene doesn't land right on the last word. Ignored for
  // scenes with an explicit durationSeconds.
  audioPaddingSeconds: z.number().min(0).max(3).default(0.4),

  // Optional background music, looped quietly under the whole video.
  // Ducked well below the narration by default since (unlike a
  // captions-only video) there's a voice to keep intelligible.
  bgMusic: z.string().optional(),
  bgMusicVolume: z.number().min(0).max(1).default(0.12),
  /**
   * Logo thương hiệu đóng mờ góc phải dưới. Đường dẫn tương đối trong public/ (vd "brand/logo.png").
   * Bỏ trống = không đóng logo.
   *
   * render-project.mjs chỉ điền trường này khi file CÓ THẬT trên đĩa — đừng tự đặt tay một đường
   * dẫn không tồn tại, vì <Img> tải lỗi sẽ làm hỏng cả lượt render chứ không âm thầm bỏ qua.
   */
  brandLogo: z.string().optional(),
});

export type SlideshowVideoProps = z.infer<typeof slideshowVideoSchema>;
export type Scene = z.infer<typeof sceneSchema>;
