"use client";

import SplitTextWave from "./SplitTextWave";

interface TextDecoderWaveProps {
  text: string;
  delay?: number;
  speed?: number;
  scrambleCycles?: number;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "div";
  style?: React.CSSProperties;
}

export default function TextDecoderWave({
  text,
  delay = 0,
  speed = 20,
  className = "",
  as = "span",
  style = {},
}: TextDecoderWaveProps) {
  return (
    <SplitTextWave
      text={text}
      delay={delay}
      stagger={speed}
      as={as}
      className={className}
      style={style}
    />
  );
}
