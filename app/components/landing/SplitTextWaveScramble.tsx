"use client";

import SplitTextWave, { TextLine } from "./SplitTextWave";

interface SplitTextWaveScrambleProps {
  segments?: TextLine[];
  lines?: TextLine[];
  text?: string;
  delay?: number;
  speed?: number;
  as?: "h1" | "h2" | "p" | "div" | "span";
  className?: string;
  style?: React.CSSProperties;
}

export default function SplitTextWaveScramble({
  segments,
  lines,
  text,
  delay = 0,
  speed = 20,
  as = "h1",
  className = "",
  style = {},
}: SplitTextWaveScrambleProps) {
  return (
    <SplitTextWave
      lines={segments || lines}
      text={text}
      delay={delay}
      stagger={speed}
      as={as}
      className={className}
      style={style}
    />
  );
}
