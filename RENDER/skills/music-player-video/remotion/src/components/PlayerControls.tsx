import React from "react";

// Static controls displayed on video — they look like interactive buttons
// but in a rendered video they are visual elements only.
export const PlayerControls: React.FC<{
  color: string;
  size: number;
}> = ({ color, size }) => {
  const btnSize = size;
  const iconSize = size * 0.5;

  const iconStyle: React.CSSProperties = {
    fill: "rgba(255,255,255,0.7)",
    width: `${iconSize}px`,
    height: `${iconSize}px`,
  };

  const btnStyle: React.CSSProperties = {
    width: `${btnSize}px`,
    height: `${btnSize}px`,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.06)",
    flexShrink: 0,
  };

  const playBtnStyle: React.CSSProperties = {
    ...btnStyle,
    width: `${btnSize * 1.35}px`,
    height: `${btnSize * 1.35}px`,
    background: color,
    boxShadow: `0 0 20px ${color}66`,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: `${btnSize * 0.45}px` }}>
      {/* Previous */}
      <div style={btnStyle}>
        <svg style={iconStyle} viewBox="0 0 24 24">
          <polygon points="19,20 9,12 19,4" />
          <line x1="5" y1="4" x2="5" y2="20" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Pause (video is playing, so show pause icon) */}
      <div style={playBtnStyle}>
        <svg
          style={{ ...iconStyle, fill: "#fff", width: `${iconSize * 1.1}px`, height: `${iconSize * 1.1}px` }}
          viewBox="0 0 24 24"
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      </div>

      {/* Next */}
      <div style={btnStyle}>
        <svg style={iconStyle} viewBox="0 0 24 24">
          <polygon points="5,4 15,12 5,20" />
          <line x1="19" y1="4" x2="19" y2="20" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};
