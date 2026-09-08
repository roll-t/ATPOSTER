import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import type { BgClip } from "../schema";

// Chặn vòng lặp dựng playlist chạy vô hạn nếu độ dài đo được là số rác (~0 giây).
const MAX_PLAYLIST_ITEMS = 500;

// Mỗi clip nền chỉ được giữ khung tối đa 30 giây rồi phải nhường cho clip kế tiếp. Clip Pexels có
// bản dài cả phút; để nguyên thì cả đoạn giữa video chỉ có đúng một cảnh đứng yên, xem rất chán.
// Cắt ở 30s giúp nền luôn đổi cảnh đều đặn mà vẫn đủ lâu để không bị rối mắt.
const MAX_CLIP_SECONDS = 30;

type NormalizedClip = { src: string; durationInSeconds: number | null };

function normalizeClip(clip: BgClip): NormalizedClip | null {
  if (typeof clip === "string") {
    return clip ? { src: clip, durationInSeconds: null } : null;
  }
  if (!clip?.src) return null;
  const secs = clip.durationInSeconds;
  return {
    src: clip.src,
    durationInSeconds: typeof secs === "number" && Number.isFinite(secs) && secs > 0 ? secs : null,
  };
}

type PlaylistItem = { src: string; from: number; durationInFrames: number };

/**
 * Nối các clip LIÊN TIẾP theo đúng độ dài THẬT của từng clip: clip 1 chạy hết thì clip 2 vào ngay,
 * hết danh sách mà thoại chưa xong thì quay vòng lại từ clip đầu, và clip cuối bị cắt đúng tại
 * thời điểm video kết thúc. Nền luôn chạy bám theo thoại: không có khoảng đứng hình, không dư.
 *
 * Clip dài hơn MAX_CLIP_SECONDS chỉ được dùng phần đầu, phần còn lại bỏ — xem ghi chú ở hằng số đó.
 */
function buildMeasuredPlaylist(
  clips: NormalizedClip[],
  totalFrames: number,
  fps: number
): PlaylistItem[] {
  const maxClipFrames = Math.round(MAX_CLIP_SECONDS * fps);
  const playlist: PlaylistItem[] = [];
  let cursor = 0;
  let i = 0;
  while (cursor < totalFrames && playlist.length < MAX_PLAYLIST_ITEMS) {
    const clip = clips[i % clips.length];
    const realFrames = Math.max(1, Math.round((clip.durationInSeconds as number) * fps));
    const clipFrames = Math.min(realFrames, maxClipFrames);
    playlist.push({
      src: clip.src,
      from: cursor,
      durationInFrames: Math.min(clipFrames, totalFrames - cursor),
    });
    cursor += clipFrames;
    i++;
  }
  return playlist;
}

/**
 * Nhánh dự phòng cho config KHÔNG kèm độ dài clip (định dạng cũ chỉ có đường dẫn dạng chuỗi, hoặc
 * máy render thiếu ffprobe nên không đo được). Không biết clip dài bao nhiêu thì không thể nối
 * chính xác, nên chia đều thời lượng như trước — clip ngắn hơn ô của nó vẫn sẽ đứng hình ở cuối ô.
 * Cố ý KHÔNG đoán một độ dài mặc định: đoán sai sẽ cắt vụn/lặp lại clip giữa chừng, khó hiểu hơn.
 */
function buildEvenSplitPlaylist(clips: NormalizedClip[], totalFrames: number): PlaylistItem[] {
  const framesPerVideo = Math.ceil(totalFrames / clips.length);
  return clips.map((clip, idx) => {
    const from = idx * framesPerVideo;
    return {
      src: clip.src,
      from,
      durationInFrames: idx === clips.length - 1 ? totalFrames - from : framesPerVideo,
    };
  });
}

export const VideoBackground: React.FC<{
  src: BgClip | BgClip[];
  opacity: number;
}> = ({ src, opacity }) => {
  const { durationInFrames, fps } = useVideoConfig();

  const clips = (Array.isArray(src) ? src : [src])
    .map(normalizeClip)
    .filter((c): c is NormalizedClip => c !== null);

  if (clips.length === 0) {
    return <AbsoluteFill style={{ background: "#000000" }} />;
  }

  const allMeasured = clips.every((c) => c.durationInSeconds !== null);
  const playlist = allMeasured
    ? buildMeasuredPlaylist(clips, durationInFrames, fps)
    : buildEvenSplitPlaylist(clips, durationInFrames);

  return (
    <AbsoluteFill>
      {playlist.map((item, idx) => (
        <Sequence key={idx} from={item.from} durationInFrames={item.durationInFrames}>
          <AbsoluteFill>
            <OffthreadVideo
              src={staticFile(item.src)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              volume={0}
            />
          </AbsoluteFill>
        </Sequence>
      ))}
      {/* Dark overlay để text dễ đọc */}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${opacity})` }} />
    </AbsoluteFill>
  );
};
