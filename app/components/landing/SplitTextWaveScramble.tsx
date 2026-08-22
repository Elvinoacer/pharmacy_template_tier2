"use client";

import { useEffect, useState, useRef } from "react";

interface TextSegment {
  text: string;
  className?: string;
}

interface SplitTextWaveScrambleProps {
  segments: TextSegment[];
  delay?: number;
  speed?: number;
  as?: "h1" | "h2" | "p" | "div" | "span";
  className?: string;
  style?: React.CSSProperties;
}

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!@#$%&*+";

export default function SplitTextWaveScramble({
  segments,
  delay = 0,
  speed = 28,
  as: Component = "h1",
  className = "",
  style = {},
}: SplitTextWaveScrambleProps) {
  // Compute total character indices map
  const fullText = segments.map((s) => s.text).join("");
  const totalLength = fullText.length;

  const [decodedIndex, setDecodedIndex] = useState(-1);
  const [randomGlyphs, setRandomGlyphs] = useState<string[]>(() =>
    fullText.split("").map((c) => (c === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
  );
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDecodedIndex(totalLength);
      return;
    }

    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const timeout = setTimeout(() => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 1;
        setDecodedIndex(progress);

        // Update randomized characters for the active decoding zone
        setRandomGlyphs((prev) =>
          fullText.split("").map((char, i) => {
            if (char === " ") return " ";
            if (i < progress) return char;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
        );

        if (progress >= totalLength + 3) {
          clearInterval(interval);
          setDecodedIndex(totalLength);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [fullText, totalLength, delay, speed]);

  // Render segments preserving their individual styling
  let charCounter = 0;

  return (
    <Component className={className} style={{ ...style, opacity: 1 }}>
      {segments.map((segment, segIdx) => {
        const segChars = segment.text.split("");
        const segmentStart = charCounter;
        charCounter += segChars.length;

        return (
          <span key={segIdx} className={`${segment.className || ""} inline`}>
            {segChars.map((char, charIdx) => {
              const globalIndex = segmentStart + charIdx;
              const isSolved = decodedIndex >= globalIndex;
              const displayChar = isSolved
                ? char
                : char === " "
                ? " "
                : randomGlyphs[globalIndex] || char;

              return (
                <span
                  key={charIdx}
                  className={`inline-block transition-colors duration-150 ${
                    char === " " ? "whitespace-pre" : ""
                  } ${!isSolved ? "text-amber-300/75" : ""}`}
                >
                  {displayChar}
                </span>
              );
            })}
          </span>
        );
      })}
    </Component>
  );
}
