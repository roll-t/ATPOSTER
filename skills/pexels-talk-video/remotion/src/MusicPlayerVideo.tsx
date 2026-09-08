import React from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig, staticFile } from "remotion";
import { MusicPlayerVideoProps } from "./schema";
import { VideoBackground } from "./components/VideoBackground";
import { PlayerCard } from "./components/PlayerCard";

export const MusicPlayerVideo: React.FC<MusicPlayerVideoProps> = ({
  songs,
  backgroundVideo,
  bgVideoOpacity,
  playerStyle,
  accentColor,
  barCount,
}) => {
  const { width, height, fps } = useVideoConfig();
  const isPortrait = height > width;

  // Compute per-song frame offsets
  let cumFrames = 0;
  const songOffsets: number[] = songs.map((s) => {
    const offset = cumFrames;
    cumFrames += Math.round(s.durationSeconds * fps);
    return offset;
  });

  return (
    <AbsoluteFill>
      {/* Background video — continuous, loops across all songs */}
      <VideoBackground src={backgroundVideo} opacity={bgVideoOpacity} />

      {/* Per-song sequences */}
      {songs.map((song, idx) => {
        const songDurFrames = Math.round(song.durationSeconds * fps);
        const from = songOffsets[idx];

        return (
          <Sequence from={from} durationInFrames={songDurFrames} key={idx}>
            <AbsoluteFill
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isPortrait ? "center" : "flex-end",
                paddingRight: isPortrait ? 0 : "8%",
              }}
            >
              {/* Song audio */}
              <Audio src={staticFile(song.audioFile)} volume={1} />

              {/* Player UI card */}
              <PlayerCard
                song={song}
                playerStyle={playerStyle}
                accentColor={accentColor}
                barCount={barCount}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
