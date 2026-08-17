import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { SceneImage, Caption } from "@atposter/remotion-shared";

/**
 * Ảnh bìa (thumbnail) cho skill "Video Nói Chuyện Đạo Lý" — MỘT composition riêng, render bằng
 * `remotion still` sau khi video chính render xong (xem render-project.mjs), KHÔNG phải một khung
 * hình trích từ video.
 *
 * Cố tình tái dùng đúng 2 khối đã có (SceneImage + Caption style="hook") thay vì tự vẽ lại text —
 * đây chính xác là cách slide 1 hiển thị khi người dùng chọn Kiểu phụ đề "Tiêu đề mở đầu", nên ảnh
 * bìa luôn khớp 100% với phong cách chữ to/viết hoa/1 cụm tô màu nhấn mà video thật đang dùng, thay
 * vì có nguy cơ lệch nếu tự viết layout riêng ở đây.
 *
 * `frame={20}` khi gọi `remotion still` (đặt trong render-project.mjs): HookCaption có animation
 * trượt/mờ dần vào lúc frame 0-12 — chọn frame nằm sau mốc đó để ảnh chụp được lúc chữ đã hiện đầy
 * đủ, không phải giữa lúc đang mờ dần vào.
 */
export const MoralTalkCover: React.FC<{
  image: string;
  headline: string;
  highlightColor?: string;
}> = ({ image, headline, highlightColor }) => {
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <SceneImage
        src={image}
        fit="cover"
        kenBurns="none"
        durationInFrames={1}
        topOffsetPercent={5}
        // Ảnh nguồn (pictogram) thường vẽ nhân vật khá nhỏ giữa rất nhiều nền đen trống — đúng chủ ý
        // của prompt sinh ảnh (không được lấp đầy khung, xem SIZE LIMIT trong buildSegmentedPrompts.js),
        // nhưng để NGUYÊN 1:1 như vậy làm ảnh bìa trông trống trải, kém nổi bật. Phóng to riêng ở
        // bước HIỂN THỊ này (không đụng gì đến ảnh gốc/prompt sinh ảnh) để nhân vật chiếm phần khung
        // rõ ràng hơn, giống bố cục ảnh mẫu — cắt bớt viền đen dư thừa quanh mép chứ không kéo méo.
        imageScale={1.15}
        patchBottomRightCorner
        cornerPatchColor="#000000"
      />
      <Caption
        text=""
        sceneIndex={0}
        videoTitle={headline}
        position="top"
        captionMarginY={0}
        fontFamily="'Paytone One','Be Vietnam Pro',Arial,sans-serif"
        captionFont="paytone-one"
        mode="full"
        wordsPerChunk={999}
        style="hook"
        captionFontSize={58}
        captionBgColor="transparent"
        highlightColor={highlightColor || "#d9a620"}
        showBilingual={false}
        durationInFrames={300}
        opacity={1}
      />
      {/* Watermark Logo tinh tế phía dưới ảnh */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 4,
          opacity: 0.45,
        }}
      >
        <Img
          src={staticFile("logo/the-mind-logo.png")}
          style={{
            width: 260,
            height: "auto",
            objectFit: "contain",
            mixBlendMode: "screen",
            filter: "brightness(0.98)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
