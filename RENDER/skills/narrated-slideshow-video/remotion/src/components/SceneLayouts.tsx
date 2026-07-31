import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { resolveSrc } from "../utils";
import { resolveCaptionFontFamily } from "../captionFonts";
import { SlideshowVideoProps } from "../schema";

/**
 * Các bố cục RIÊNG THEO SLIDE — dùng cho kiểu dựng "explainer whiteboard": video không lặp lại
 * đúng một khuôn từ đầu tới cuối, mà đổi cách trình bày theo từng đoạn (lúc chỉ hình, lúc chữ
 * cạnh hình, lúc là một slide liệt kê ý thuần chữ).
 *
 * Tách hẳn ra file này thay vì nhét thêm nhánh vào Caption.tsx: Caption.tsx đang lo phần phụ đề
 * chạy theo lời kể (chunk/karaoke/song ngữ) — các bố cục dưới đây là chuyện bố trí khung hình,
 * không liên quan gì tới việc tô từ đang đọc, gộp chung chỉ làm cả hai khó đọc.
 */

// Bỏ [thẻ cảm xúc] lọt vào từ kịch bản — cùng lý do với stripEmotionTags trong Caption.tsx.
function stripTags(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Tách "**từ**" thành span tô màu, phần còn lại giữ nguyên — giống renderWithHighlights của Caption.tsx. */
function withHighlights(text: string, highlightColor: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    return m ? (
      <span key={i} style={{ color: highlightColor }}>{m[1]}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    );
  });
}

/** Chỉ lấy dòng đầu của caption song ngữ (dòng chính), bỏ dòng dịch. */
function primaryLine(text: string): string {
  return stripTags((text || "").split("\n")[0] || "");
}

/** Dòng thứ 2 (bản dịch) nếu có. */
function secondaryLine(text: string): string {
  return stripTags((text || "").split("\n")[1] || "");
}

// ---------------------------------------------------------------------------
// layout: "bullets" — slide CHỮ THUẦN, không hình.
// ---------------------------------------------------------------------------

/**
 * Các dòng KHÔNG hiện cùng lúc: chúng lần lượt xuất hiện trải đều trong 80% đầu thời lượng scene,
 * để khớp với việc người dẫn đang đọc lần lượt từng ý. 20% cuối để trống cho người xem đọc nốt
 * dòng chót trước khi chuyển cảnh — hiện hết ngay từ giây đầu thì khán giả đọc trước lời kể,
 * mất hẳn cảm giác "đang được dẫn dắt".
 */
export const BulletsLayout: React.FC<{
  bullets: string[];
  durationInFrames: number;
  fontFamily: string;
  captionFont?: SlideshowVideoProps["captionFont"];
  fontSize: number;
  textColor: string;
  bgColor: string;
  highlightColor: string;
}> = ({ bullets, durationInFrames, fontFamily, captionFont, fontSize, textColor, bgColor, highlightColor }) => {
  const frame = useCurrentFrame();
  const resolvedFont = resolveCaptionFontFamily(captionFont, fontFamily);
  const items = bullets.filter((b) => (b || "").trim().length > 0);
  const revealWindow = durationInFrames * 0.8;

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "0 10%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: fontSize * 0.85, width: "100%" }}>
        {items.map((raw, i) => {
          const appearAt = items.length > 1 ? (i / items.length) * revealWindow : 0;
          const p = interpolate(frame, [appearAt, appearAt + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: fontSize * 0.5,
                alignItems: "flex-start",
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-24, 0])}px)`,
                fontFamily: resolvedFont,
                fontSize,
                fontWeight: 700,
                color: textColor,
                lineHeight: 1.4,
              }}
            >
              <span style={{ flexShrink: 0 }}>•</span>
              <span>{withHighlights(stripTags(raw), highlightColor)}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// layout: "split" — chia đôi khung: chữ một bên, hình một bên.
// ---------------------------------------------------------------------------

/**
 * Hình dùng objectFit "contain" và chỉ chiếm nửa khung — KHÔNG dùng "cover" như bố cục mặc định:
 * cover sẽ cắt mất rìa nhân vật khi bị ép vào nửa khung hẹp, đúng thứ phá hỏng hình người que vốn
 * là một nét vẽ liền mạch.
 */
export const SplitLayout: React.FC<{
  image: string;
  caption: string;
  side: "left" | "right";
  fontFamily: string;
  captionFont?: SlideshowVideoProps["captionFont"];
  fontSize: number;
  secondaryFontSize: number;
  textColor: string;
  highlightColor: string;
  showBilingual: boolean;
  durationInFrames: number;
}> = ({
  image,
  caption,
  side,
  fontFamily,
  captionFont,
  fontSize,
  secondaryFontSize,
  textColor,
  highlightColor,
  showBilingual,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const resolvedFont = resolveCaptionFontFamily(captionFont, fontFamily);
  const primary = primaryLine(caption);
  const secondary = secondaryLine(caption);
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Nhích nhẹ theo thời lượng để khung không đứng chết cứng (thay cho Ken Burns vốn chỉ hợp ảnh phủ kín).
  const drift = interpolate(frame, [0, durationInFrames], [0, 1.03], { extrapolateRight: "clamp" });

  const textBlock = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 4%",
        opacity: fadeIn,
      }}
    >
      <div
        style={{
          fontFamily: resolvedFont,
          fontSize,
          fontWeight: 700,
          color: textColor,
          lineHeight: 1.35,
          textAlign: "center",
        }}
      >
        {withHighlights(primary, highlightColor)}
      </div>
      {showBilingual && secondary ? (
        <div
          style={{
            fontFamily: resolvedFont,
            fontSize: secondaryFontSize,
            fontWeight: 500,
            color: textColor,
            opacity: 0.62,
            lineHeight: 1.35,
            textAlign: "center",
            marginTop: fontSize * 0.35,
          }}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );

  const imageBlock = (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Img
        src={resolveSrc(image)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `scale(${drift})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "stretch" }}>
      {side === "right" ? textBlock : imageBlock}
      {side === "right" ? imageBlock : textBlock}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// layout: "caption-left" — hình phủ kín khung, phụ đề dồn về góc DƯỚI-TRÁI.
// ---------------------------------------------------------------------------

/**
 * Khác bố cục mặc định ở chỗ phụ đề KHÔNG căn giữa mà nép hẳn vào góc dưới-trái, kiểu chú thích
 * của video giảng giải — để trống phần giữa/phải khung cho hình thở, thay vì đè chữ ngang giữa hình.
 */
export const CaptionLeftOverlay: React.FC<{
  caption: string;
  fontFamily: string;
  captionFont?: SlideshowVideoProps["captionFont"];
  fontSize: number;
  secondaryFontSize: number;
  textColor: string;
  highlightColor: string;
  showBilingual: boolean;
}> = ({ caption, fontFamily, captionFont, fontSize, secondaryFontSize, textColor, highlightColor, showBilingual }) => {
  const frame = useCurrentFrame();
  const resolvedFont = resolveCaptionFontFamily(captionFont, fontFamily);
  const primary = primaryLine(caption);
  const secondary = secondaryLine(caption);
  if (!primary) return null;

  const p = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 0 7% 7%" }}>
      <div
        style={{
          maxWidth: "70%",
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: resolvedFont,
            fontSize,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.3,
            textAlign: "left",
          }}
        >
          {withHighlights(primary, highlightColor)}
        </div>
        {showBilingual && secondary ? (
          <div
            style={{
              fontFamily: resolvedFont,
              fontSize: secondaryFontSize,
              fontWeight: 500,
              color: textColor,
              opacity: 0.62,
              lineHeight: 1.3,
              textAlign: "left",
              marginTop: fontSize * 0.28,
            }}
          >
            {secondary}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
