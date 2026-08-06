import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

// Quy ước tên: "<số hàng>x<số cột>". "1x3" = 1 hàng 3 cột (chia NGANG), "3x1" = 3 hàng 1 cột
// (chia DỌC). Video ngang 16:9 hợp với chia ngang, video dọc 9:16 hợp với chia dọc — mỗi ô mới
// giữ được tỉ lệ gần vuông thay vì bị bẹp dí.
export type RevealLayout = "1x2" | "1x3" | "1x4" | "2x1" | "3x1" | "4x1" | "2x2";

const GRID: Record<RevealLayout, { cols: number; rows: number }> = {
  "1x2": { cols: 2, rows: 1 },
  "1x3": { cols: 3, rows: 1 },
  "1x4": { cols: 4, rows: 1 },
  "2x1": { cols: 1, rows: 2 },
  "3x1": { cols: 1, rows: 3 },
  "4x1": { cols: 1, rows: 4 },
  "2x2": { cols: 2, rows: 2 },
};

// Số khung để tấm che của ô vừa tới lượt mờ hẳn đi. ~0.3s ở 30fps — đủ nhanh để giữ nhịp dồn dập
// của video whiteboard, đủ chậm để mắt kịp nhận ra "có thứ mới vừa xuất hiện".
const REVEAL_FRAMES = 9;

/**
 * Che các ô CHƯA tới lượt của một ảnh nhiều chi tiết bằng đúng màu nền, để cùng một ảnh có thể
 * được hé lộ dần qua nhiều cảnh liên tiếp (xem revealLayout/revealIndex trong schema.ts).
 *
 * Vì sao che thay vì cắt-và-phóng-to từng ô: giữ nguyên khung hình gốc thì nhân vật, đường chân
 * trời và cỡ nét giữ nguyên vị trí tuyệt đối xuyên suốt cả đoạn — chi tiết mới trông như vừa được
 * vẽ thêm vào cùng một bức tranh. Nếu phóng to từng ô thì mỗi cảnh là một khung hình khác nhau,
 * mất hẳn cảm giác đó và lộ rõ là đang zoom quanh một ảnh có sẵn.
 *
 * Ô đã hé lộ ở các cảnh TRƯỚC không render tấm che nào cả (return null) — chúng phải hiện ngay từ
 * khung đầu của cảnh này, không được mờ dần lại lần nữa.
 */
export const RevealMask: React.FC<{
  layout: RevealLayout;
  revealIndex: number;
  bgColor: string;
}> = ({ layout, revealIndex, bgColor }) => {
  const frame = useCurrentFrame();
  const grid = GRID[layout];
  if (!grid) return null;

  const { cols, rows } = grid;
  const total = cols * rows;
  // Kẹp lại phòng khi Gemini trả revealIndex lớn hơn số ô thật của layout (vd layout "1x2" nhưng
  // nhóm có 3 câu) — thà hiện hết ảnh còn hơn che mất một mảng vĩnh viễn.
  const shown = Math.max(1, Math.min(revealIndex, total));

  const newCoverOpacity = interpolate(frame, [0, REVEAL_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: total }, (_, i) => {
        if (i < shown - 1) return null;
        const isNew = i === shown - 1;
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(col / cols) * 100}%`,
              top: `${(row / rows) * 100}%`,
              width: `${100 / cols}%`,
              height: `${100 / rows}%`,
              background: bgColor,
              opacity: isNew ? newCoverOpacity : 1,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
