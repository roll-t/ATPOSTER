import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const NewsOpeningBanner: React.FC<{
  brand?: string;
  headline: string;
  likes?: string;
  translateY?: number;
  scale?: number;
  heightPercent?: number;
  durationInFrames: number;
}> = ({
  brand = "TIN TỨC",
  headline,
  likes = "27.1K",
  translateY = 0,
  scale = 1,
  heightPercent = 42,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hiệu ứng trượt lên và nảy nhẹ chuẩn phong cách đồ hoạ tin tức mạng xã hội
  const slideSpring = spring({
    frame,
    fps,
    config: {
      damping: 14,
      stiffness: 110,
      mass: 0.9,
    },
  });

  const displayHeadline = (headline || "").trim();
  if (!displayHeadline) return null;

  const displayBrand = (brand || "TIN TỨC").trim();
  const displayLikes = (likes || "27.1K").trim();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 14,
      }}
    >
      <div
        style={{
          width: "100%",
          transform: `translateY(${translateY + (1 - slideSpring) * 120}px) scale(${scale})`,
          opacity: Math.min(1, slideSpring * 1.2),
          transformOrigin: "center bottom",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: `${heightPercent}vh`,
            background: "linear-gradient(180deg, rgba(190, 18, 60, 0.94) 0%, rgba(136, 19, 55, 0.98) 100%)",
            borderRadius: "28px 28px 0 0",
            padding: "32px 36px 48px 36px",
            boxSizing: "border-box",
            boxShadow: "0 -12px 48px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.2)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          {/* Hoạ tiết đồ hoạ bản đồ / hình học mờ đặc trưng phong cách video báo chí TikTok */}
          <div
            style={{
              position: "absolute",
              right: "-10%",
              bottom: "-15%",
              width: "320px",
              height: "320px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "40px",
              bottom: "20px",
              width: "140px",
              height: "140px",
              border: "1.5px solid rgba(255, 255, 255, 0.06)",
              transform: "rotate(45deg)",
              pointerEvents: "none",
            }}
          />

          {/* HÀNG 1: THƯƠNG HIỆU / KÊNH + CỤM BIỂU TƯỢNG TƯƠNG TÁC */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Logo / Tên thương hiệu */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0, 0, 0, 0.35)",
                backdropFilter: "blur(6px)",
                border: "1.5px solid rgba(255, 255, 255, 0.3)",
                padding: "6px 14px",
                borderRadius: "10px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
              }}
            >
              <span
                style={{
                  color: "#FFFFFF",
                  fontFamily: "'Paytone One', 'Be Vietnam Pro', sans-serif",
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                {displayBrand}
              </span>
            </div>

            {/* Cụm nút tương tác nhỏ (Like, Comment, Share) */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#EF4444",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  color: "#fff",
                }}
              >
                👍
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  color: "#BE123C",
                }}
              >
                💬
              </div>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#EF4444",
                  border: "1px solid rgba(255, 255, 255, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  color: "#fff",
                }}
              >
                ↗️
              </div>
            </div>
          </div>

          {/* HÀNG 2: TIÊU ĐỀ GIẬT TÍT NỔI BẬT DỄ ĐỌC */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "16px",
              margin: "24px 0 20px 0",
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Vạch dọc nhấn màu vàng gold */}
            <div
              style={{
                width: "6px",
                borderRadius: "3px",
                background: "#FACC15",
                boxShadow: "0 0 12px rgba(250, 204, 21, 0.6)",
                flexShrink: 0,
              }}
            />

            {/* Chữ tiêu đề */}
            <div
              style={{
                fontFamily: "'Paytone One', 'Be Vietnam Pro', 'Montserrat', Arial, sans-serif",
                fontSize: 38,
                fontWeight: 900,
                lineHeight: 1.28,
                color: "#FACC15",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                textShadow: "0 3px 12px rgba(0, 0, 0, 0.6)",
                wordBreak: "break-word",
              }}
            >
              {displayHeadline}
            </div>
          </div>

          {/* HÀNG 3: SỐ LƯỢNG TIM / THÍCH TƯƠNG TÁC */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              position: "relative",
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontSize: 26,
                color: "#FFFFFF",
                fontWeight: 800,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
              }}
            >
              ♡
            </span>
            <span
              style={{
                fontFamily: "'Be Vietnam Pro', sans-serif",
                fontSize: 24,
                fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "0.04em",
                textShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }}
            >
              {displayLikes}
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
