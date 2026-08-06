import React from "react";
import { AbsoluteFill } from "remotion";

export const Background: React.FC<{ color: string }> = ({ color }) => (
  <AbsoluteFill style={{ backgroundColor: color }} />
);
