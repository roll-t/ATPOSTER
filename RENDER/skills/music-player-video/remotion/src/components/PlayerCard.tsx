import React from "react";
import { useVideoConfig, Img, staticFile } from "remotion";
import { Song } from "../schema";
import { Visualizer } from "./Visualizer";
import { ProgressBar } from "./ProgressBar";
import { PlayerControls } from "./PlayerControls";

const GLASS_CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
};

const MINIMAL_CARD: React.CSSProperties = {
  background: "transparent",
  border: "none",
  boxShadow: "none",
};

const DARK_CARD: React.CSSProperties = {
  background: "rgba(10,8,20,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
};

function cardStyle(playerStyle: string): React.CSSProperties {
  if (playerStyle === "minimal") return MINIMAL_CARD;
  if (playerStyle === "dark") return DARK_CARD;
  return GLASS_CARD;
}

export const PlayerCard: React.FC<{
  song: Song;
  playerStyle: string;
  accentColor: string;
  barCount: number;
}> = ({ song, playerStyle, accentColor, barCount }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  // Card sizing
  const cardW = isPortrait ? width * 0.82 : width * 0.44;
  const cardPad = isPortrait ? 28 : 32;

  // Album art size
  const artSize = isPortrait ? cardW * 0.55 : cardW * 0.38;

  // Visualizer width matches card content area
  const vizW = cardW - cardPad * 2;
  const vizMaxH = isPortrait ? 48 : 40;

  const controlBtnSize = isPortrait ? 36 : 32;
  const progressW = vizW;

  return (
    <div
      style={{
        width: `${cardW}px`,
        borderRadius: "24px",
        padding: `${cardPad}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        ...cardStyle(playerStyle),
      }}
    >
      {/* Album Art */}
      <div
        style={{
          width: `${artSize}px`,
          height: `${artSize}px`,
          borderRadius: "16px",
          background: `linear-gradient(135deg, ${accentColor}44, ${accentColor}22)`,
          border: `1px solid ${accentColor}33`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 12px 40px ${accentColor}33`,
        }}
      >
        {song.albumArt ? (
          <Img
            src={staticFile(song.albumArt)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          // Default music note placeholder
          <svg
            viewBox="0 0 64 64"
            style={{ width: `${artSize * 0.45}px`, height: `${artSize * 0.45}px`, opacity: 0.6 }}
          >
            <path
              d="M48 8v30.5A8 8 0 1 1 40 30V16L24 20v26.5A8 8 0 1 1 16 38V14l32-6z"
              fill={accentColor}
            />
          </svg>
        )}
      </div>

      {/* Song info */}
      <div style={{ textAlign: "center", width: "100%" }}>
        <div
          style={{
            fontSize: isPortrait ? "18px" : "20px",
            fontWeight: 700,
            color: "#fff",
            marginBottom: "4px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {song.title}
        </div>
        <div
          style={{
            fontSize: isPortrait ? "13px" : "14px",
            color: "rgba(255,255,255,0.5)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {song.artist || "Unknown Artist"}
        </div>
      </div>

      {/* Visualizer bars */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Visualizer
          barCount={barCount}
          color={accentColor}
          width={vizW}
          maxHeight={vizMaxH}
        />
      </div>

      {/* Progress bar */}
      <ProgressBar
        durationSeconds={song.durationSeconds}
        color={accentColor}
        width={progressW}
      />

      {/* Player controls */}
      <PlayerControls color={accentColor} size={controlBtnSize} />
    </div>
  );
};
