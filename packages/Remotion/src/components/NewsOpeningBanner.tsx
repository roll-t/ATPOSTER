import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadBeVietnamPro } from "@remotion/google-fonts/BeVietnamPro";

let cachedBannerFont: string | null = null;
export function getNewsBannerFontFamily(): string {
  if (!cachedBannerFont) {
    const montserrat = loadMontserrat("normal", {
      weights: ["700", "900"],
      subsets: ["latin", "vietnamese"],
    }).fontFamily;
    const beVietnam = loadBeVietnamPro("normal", {
      weights: ["700", "800", "900"],
      subsets: ["latin", "vietnamese"],
    }).fontFamily;
    cachedBannerFont = `'${montserrat}', '${beVietnam}', Arial, sans-serif`;
  }
  return cachedBannerFont;
}

export function getNewsTagConfig(brandText: string) {
  const text = (brandText || "TIN TỨC").trim();
  const lower = text.toLowerCase();

  let icon = "⚡";
  if (lower.includes("kiến thức") || lower.includes("khoa học") || lower.includes("học tập")) {
    icon = "💡";
  } else if (lower.includes("sự thật") || lower.includes("thú vị") || lower.includes("bất ngờ")) {
    icon = "✨";
  } else if (lower.includes("bí ẩn") || lower.includes("khám phá") || lower.includes("kỳ lạ") || lower.includes("tâm linh")) {
    icon = "🔮";
  } else if (lower.includes("chưa biết") || lower.includes("bạn có biết") || lower.includes("có thể bạn")) {
    icon = "🧠";
  } else if (lower.includes("tin tức") || lower.includes("tin nóng") || lower.includes("thời sự")) {
    icon = "🔴";
  }

  // Đồng bộ 1 màu Primary Red thống nhất với màu chủ đạo của banner, cách điệu sang trọng
  return {
    icon,
    text: text.toUpperCase(),
    gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.98) 100%)",
    border: "1.5px solid rgba(255, 255, 255, 0.45)",
    shadow: "0 4px 16px rgba(185, 28, 28, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
  };
}

export const NewsOpeningBanner: React.FC<{
  brand?: string;
  headline: string;
  likes?: string;
  translateY?: number;
  scale?: number;
  heightPercent?: number;
  durationInFrames: number;
  titleColor?: string;
  titleFontSize?: number;
  headlineWidth?: number;
  fontFamily?: string;
}> = ({
  brand = "TIN TỨC",
  headline,
  likes = "27.1K",
  translateY = 0,
  scale = 1,
  heightPercent = 50,
  durationInFrames,
  titleColor = "#FFE24A",
  titleFontSize,
  headlineWidth = 82,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  // Preload và dùng font hỗ trợ 100% tiếng Việt chuẩn (Montserrat + Be Vietnam Pro)
  const defaultFont = getNewsBannerFontFamily();
  const bannerFontFamily = fontFamily && !fontFamily.includes("Paytone One")
    ? `${fontFamily}, ${defaultFont}`
    : defaultFont;

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
  const tagConfig = getNewsTagConfig(displayBrand);

  // Chiều cao chiếm 50% màn hình (nửa màn hình dưới)
  const bannerHeight = Math.round(height * (heightPercent / 100));

  // Kích thước font chữ tiêu đề lớn nổi bật (title lớn show tiêu đề)
  const titleLength = displayHeadline.length;
  const autoTitleFontSize = titleLength > 90 ? 44 : titleLength > 60 ? 50 : titleLength > 35 ? 58 : 64;
  const effectiveTitleFontSize = titleFontSize && titleFontSize > 0 ? titleFontSize : autoTitleFontSize;

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
          height: bannerHeight,
          transform: `translateY(${translateY + (1 - slideSpring) * 140}px) scale(${scale})`,
          opacity: Math.min(1, slideSpring * 1.2),
          transformOrigin: "center bottom",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg, rgba(185, 28, 28, 0) 0%, rgba(200, 30, 30, 0.45) 16%, rgba(220, 38, 38, 0.88) 34%, rgba(185, 28, 28, 0.96) 55%, rgba(127, 29, 29, 0.98) 80%, rgba(69, 10, 10, 1) 100%)",
            padding: "38px 44px 40px 44px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: "50px",
            overflow: "hidden",
          }}
        >
          {/* Vầng sáng radial vàng & đỏ nhẹ sau tiêu đề */}
          <div
            style={{
              position: "absolute",
              left: "-10%",
              top: "25%",
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(254, 240, 138, 0.12) 0%, rgba(220, 38, 38, 0) 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Hoạ tiết vòng sóng radar sóng phát thanh góc dưới bên phải */}
          <div
            style={{
              position: "absolute",
              right: "-20px",
              bottom: "10px",
              width: "280px",
              height: "280px",
              borderRadius: "50%",
              border: "1.5px solid rgba(255, 255, 255, 0.08)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "20px",
              bottom: "40px",
              width: "190px",
              height: "190px",
              borderRadius: "50%",
              border: "1.5px solid rgba(255, 255, 255, 0.06)",
              pointerEvents: "none",
            }}
          />

          {/* Hoạ tiết khối lập phương kim cương xoay mờ góc dưới */}
          <div
            style={{
              position: "absolute",
              right: "40px",
              bottom: "40px",
              width: "160px",
              height: "160px",
              border: "1.5px solid rgba(255, 255, 255, 0.05)",
              transform: "rotate(45deg)",
              pointerEvents: "none",
            }}
          />

          {/* HÀNG 1: THƯƠNG HIỆU / CHUYÊN MỤC TAG (ĐỒNG BỘ MÀU PRIMARY, CÁCH ĐIỆU) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "14px",
                background: tagConfig.gradient,
                border: "2px solid rgba(255, 255, 255, 0.5)",
                padding: "8px 26px 8px 10px",
                borderRadius: "32px",
                boxShadow: "0 6px 20px rgba(185, 28, 28, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.45)",
              }}
            >
              {/* Vòng tròn cách điệu ôm icon */}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.32)",
                  border: "1.5px solid rgba(255, 255, 255, 0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                }}
              >
                {tagConfig.icon}
              </div>

              <span
                style={{
                  color: "#FFFFFF",
                  fontFamily: bannerFontFamily,
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                }}
              >
                {tagConfig.text}
              </span>
            </div>
          </div>

          {/* HÀNG 2: SHOW TIÊU ĐỀ KHỦNG (GRAND TITLE SHOWCASE - SÁT DƯỚI TAG) */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "28px",
              position: "relative",
              zIndex: 2,
              width: `${headlineWidth || 82}%`,
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
              {/* Vạch dọc nhấn màu vàng neon */}
              <div
                style={{
                  width: "8px",
                  borderRadius: "4px",
                  background: "linear-gradient(180deg, #FDE047 0%, #F59E0B 70%, #EA580C 100%)",
                  boxShadow: "0 0 18px rgba(250, 204, 21, 0.85)",
                  flexShrink: 0,
                }}
              />

              {/* Chữ tiêu đề lớn nổi bật */}
              <div
                style={{
                  fontFamily: bannerFontFamily,
                  fontSize: effectiveTitleFontSize,
                  fontWeight: 900,
                  lineHeight: 1.25,
                  color: titleColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  textShadow: "none",
                  wordBreak: "break-word",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {displayHeadline}
              </div>
            </div>
          </div>
        </div>
    </AbsoluteFill>
  );
};
