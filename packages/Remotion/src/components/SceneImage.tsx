import { AbsoluteFill, Img, Video, interpolate, useCurrentFrame } from "remotion";
import { resolveSrc } from "../utils";
import type { KenBurnsDirection } from "../types";

export type { KenBurnsDirection };

/**
 * Ô che góc phải dưới của ảnh nguồn.
 *
 * Số đo lấy từ ảnh thật do pipeline sinh ra (768×1376): ô cần che nằm cách mép phải 74px, cách mép
 * dưới 73px, kích thước 48×48. Quy hết về phần trăm để không phụ thuộc độ phân giải, và nới rộng
 * thêm khoảng 20px mỗi phía — nền của dòng ảnh này là đen tuyền nên che dư ra hoàn toàn không nhìn
 * thấy, trong khi che thiếu thì lòi ra một góc sáng rất lộ.
 */
const CORNER_PATCH = {
  widthPercentOfWidth: 12,
  rightPercentOfWidth: 6.9,
  bottomPercentOfHeight: 3.85,
};

export const SceneImage: React.FC<{
  src: string;
  fit: "cover" | "contain";
  kenBurns: KenBurnsDirection;
  durationInFrames: number;
  topOffsetPercent?: number;
  imageScale?: number;
  imageTranslateY?: number;
  /**
   * Phủ một ô nền lên góc phải dưới của ảnh. Mặc định TẮT: component này dùng chung cho nhiều
   * skill, chỉ skill nào bật mới có (hiện chỉ moral_talk_slideshow).
   */
  patchBottomRightCorner?: boolean;
  /** Màu ô che — để khớp nền của ảnh. Mặc định đen tuyền, đúng nền của dòng ảnh pictogram. */
  cornerPatchColor?: string;
}> = ({
  src,
  fit,
  kenBurns,
  durationInFrames,
  topOffsetPercent = 0,
  imageScale = 1,
  imageTranslateY = 0,
  patchBottomRightCorner = false,
  cornerPatchColor = "#000000",
}) => {
  const frame = useCurrentFrame();
  const progress = durationInFrames > 1 ? frame / (durationInFrames - 1) : 0;

  let scale = 1;
  let translateX = 0;

  switch (kenBurns) {
    case "in":
      scale = interpolate(progress, [0, 1], [1, 1.12]);
      break;
    case "out":
      scale = interpolate(progress, [0, 1], [1.12, 1]);
      break;
    case "pan-left":
      scale = 1.1;
      translateX = interpolate(progress, [0, 1], [3, -3]);
      break;
    case "pan-right":
      scale = 1.1;
      translateX = interpolate(progress, [0, 1], [-3, 3]);
      break;
    case "none":
    default:
      scale = 1;
      translateX = 0;
  }

  const offsetScale = topOffsetPercent > 0 ? 1 + (topOffsetPercent / 100) * 2 : 1;
  const isVideo = src.toLowerCase().endsWith(".mp4") || src.toLowerCase().endsWith(".webm");

  // Phép biến đổi được nâng lên LỚP BỌC thay vì đặt trên chính thẻ ảnh/video. Nhờ vậy ô che góc
  // nằm cùng một hệ toạ độ với ảnh và tự động đi theo mọi chuyển động Ken Burns (phóng to, lia
  // ngang). Nếu neo ô che vào khung hình, chỉ cần ảnh zoom một chút là nó trượt khỏi vị trí cần che.
  // Hộp bao và điểm gốc của lớp bọc trùng khít với thẻ ảnh cũ (đều phủ kín khung, cùng
  // transform-origin), nên video không đổi so với trước ở mọi trường hợp không bật ô che.
  const mediaTransform = `scale(${scale * offsetScale * imageScale}) translateX(${translateX}%) translateY(${topOffsetPercent + imageTranslateY}%)`;
  const mediaStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: fit };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transform: mediaTransform,
          transformOrigin: "center center",
        }}
      >
        {isVideo ? (
          <Video src={resolveSrc(src)} style={mediaStyle} startFrom={0} muted loop />
        ) : (
          <Img src={resolveSrc(src)} style={mediaStyle} />
        )}

        {patchBottomRightCorner ? (
          <div
            style={{
              position: "absolute",
              right: `${CORNER_PATCH.rightPercentOfWidth}%`,
              bottom: `${CORNER_PATCH.bottomPercentOfHeight}%`,
              width: `${CORNER_PATCH.widthPercentOfWidth}%`,
              aspectRatio: "1 / 1",
              background: cornerPatchColor,
            }}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
