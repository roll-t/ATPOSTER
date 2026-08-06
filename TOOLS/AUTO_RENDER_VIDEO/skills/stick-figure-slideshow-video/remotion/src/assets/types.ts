import React from "react";

export interface AssetProps {
  color?: string;         // stroke color, default "#000000"
  accentColor?: string;   // highlight/accent color, default "#FE2C55"
  drawProgress?: number;  // 0→1: controls draw-in animation (1 = fully visible)
  style?: React.CSSProperties;
}

// Element descriptor output by Gemini — positions one asset on the canvas
export type AssetElement = {
  asset: string;       // e.g. "pose_standing_neutral", "prop_laptop", "sym_checkmark"
  x: number;           // center-x as % of canvas width (0–100)
  y: number;           // center-y as % of canvas height (0–100)
  scale?: number;      // size multiplier (1.0 = 200px base size in 1080p)
  flip?: boolean;      // mirror horizontally
  delay?: number;      // seconds before this element starts its draw-in
  color?: string;
  accentColor?: string;
  zIndex?: number;
};
