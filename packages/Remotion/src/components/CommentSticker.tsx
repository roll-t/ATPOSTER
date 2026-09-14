import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const CommentSticker: React.FC<{
  author?: string;
  text: string;
  avatarSrc?: string;
  translateY?: number;
  scale?: number;
  widthPercent?: number;
  durationInFrames: number;
}> = ({
  author = "Trả lời bình luận",
  text,
  avatarSrc,
  translateY = 0,
  scale = 1,
  widthPercent = 88,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hiệu ứng nảy pop-in mượt mà chuẩn phong cách sticker TikTok
  const popSpring = spring({
    frame,
    fps,
    config: {
      damping: 14,
      stiffness: 125,
      mass: 0.85,
    },
  });

  const displayText = (text || "").trim();
  if (!displayText) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: "12%",
        pointerEvents: "none",
        zIndex: 15,
      }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px) scale(${scale * popSpring})`,
          transformOrigin: "center top",
          maxWidth: `${widthPercent}%`,
          width: "fit-content",
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#FFFFFF",
            borderRadius: 28,
            padding: "24px 32px",
            boxShadow: "0 18px 64px rgba(0, 0, 0, 0.35), 0 4px 18px rgba(0, 0, 0, 0.16)",
            border: "1.5px solid rgba(0, 0, 0, 0.05)",
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
          }}
        >
          {/* Mấu nhọn speech bubble sticker bình luận */}
          <div
            style={{
              position: "absolute",
              top: -12,
              left: 42,
              width: 24,
              height: 24,
              background: "#FFFFFF",
              transform: "rotate(45deg)",
              borderRadius: 4,
              boxShadow: "-3px -3px 6px rgba(0,0,0,0.04)",
            }}
          />

          {/* Avatar icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 32,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(59, 130, 246, 0.35)",
              border: "2.5px solid #ffffff",
            }}
          >
            💬
          </div>

          {/* Nội dung câu hỏi / bình luận */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#6b7280",
                  letterSpacing: "0.01em",
                }}
              >
                {author || "Trả lời bình luận"}
              </span>
              <span style={{ fontSize: 20, color: "#9ca3af" }}>• Khán giả</span>
            </div>
            <div
              style={{
                fontFamily: "'Be Vietnam Pro', 'Noto Sans', Arial, sans-serif",
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.35,
                color: "#111827",
                letterSpacing: "0.01em",
                wordBreak: "break-word",
              }}
            >
              {displayText}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
