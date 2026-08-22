"use client";

import { useEffect, useState, useRef } from "react";

interface TextDecoderWaveProps {
  text: string;
  delay?: number;
  speed?: number;
  scrambleCycles?: number;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "div";
  style?: React.CSSProperties;
}

const CIPHER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=-~";

export default function TextDecoderWave({
  text,
  delay = 0,
  speed = 30,
  scrambleCycles = 3,
  className = "",
  as: Component = "span",
  style = {},
}: TextDecoderWaveProps) {
  const [displayText, setDisplayText] = useState<string>(text);
  const [isDecoded, setIsDecoded] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplayText(text);
      setIsDecoded(true);
      return;
    }

    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Start with initial scrambled placeholder
    const length = text.length;
    let frame = 0;
    const totalFrames = length + scrambleCycles * 4;

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        frame++;

        const currentOutput = text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            // Characters before current wave are fully solved
            if (index < (frame - scrambleCycles)) {
              return text[index];
            }
            // Characters in active scramble zone
            if (index < frame) {
              return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
            }
            // Characters waiting to start
            return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
          })
          .join("");

        setDisplayText(currentOutput);

        if (frame >= totalFrames) {
          clearInterval(interval);
          setDisplayText(text);
          setIsDecoded(true);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, delay, speed, scrambleCycles]);

  return (
    <Component
      className={`${className} transition-opacity duration-300 ${
        isDecoded ? "opacity-100" : "opacity-95"
      }`}
      style={{
        ...style,
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }}
    >
      {displayText}
    </Component>
  );
}
