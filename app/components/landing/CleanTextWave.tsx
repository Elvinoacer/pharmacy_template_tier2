"use client";

import { useEffect, useState, useRef } from "react";

interface CleanTextWaveProps {
  lines: Array<{
    text: string;
    className?: string;
  }>;
  delay?: number;
  speed?: number;
  as?: "h1" | "h2" | "p" | "div";
  className?: string;
  style?: React.CSSProperties;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export default function CleanTextWave({
  lines,
  delay = 150,
  speed = 22,
  as: Component = "h1",
  className = "",
  style = {},
}: CleanTextWaveProps) {
  // Count total characters across all lines to drive single smooth wave
  const totalChars = lines.reduce((acc, line) => acc + line.text.length, 0);

  const [decodedIndex, setDecodedIndex] = useState(-1);
  const [activeGlyphs, setActiveGlyphs] = useState<string[]>(() =>
    lines
      .flatMap((l) => l.text.split(""))
      .map((c) => (c === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
  );

  const hasAnimated = useRef(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDecodedIndex(totalChars + 10);
      return;
    }

    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const allChars = lines.flatMap((l) => l.text.split(""));

    const timer = setTimeout(() => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 1;
        setDecodedIndex(progress);

        // Update randomized glyphs for characters near the active wave front (±4 chars)
        setActiveGlyphs(
          allChars.map((char, idx) => {
            if (char === " ") return " ";
            if (idx < progress) return char;
            if (idx <= progress + 4) {
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
        );

        if (progress >= totalChars + 2) {
          clearInterval(interval);
          setDecodedIndex(totalChars + 10);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [lines, totalChars, delay, speed]);

  let globalCharIndex = 0;

  return (
    <Component className={className} style={{ ...style, opacity: 1 }}>
      {lines.map((lineObj, lineIdx) => {
        const words = lineObj.text.split(" ");

        return (
          <span
            key={lineIdx}
            className={`block ${lineObj.className || ""}`}
            style={{
              lineHeight: 1.15,
              wordBreak: "break-word",
            }}
          >
            {words.map((word, wordIdx) => {
              const wordChars = word.split("");

              return (
                <span key={wordIdx} className="inline-block whitespace-nowrap mr-[0.28em]">
                  {wordChars.map((char, charIdx) => {
                    const currentIdx = globalCharIndex++;
                    const isSolved = decodedIndex >= currentIdx;
                    const displayChar = isSolved
                      ? char
                      : activeGlyphs[currentIdx] || char;

                    return (
                      <span
                        key={charIdx}
                        className={`inline-block transition-all duration-150 ${
                          !isSolved
                            ? "text-amber-300/80 scale-[0.98] drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                            : ""
                        }`}
                        style={{
                          minWidth: char === " " ? "0.25em" : "auto",
                        }}
                      >
                        {displayChar}
                      </span>
                    );
                  })}
                  {/* Account for the trailing space in global index tracking */}
                  {(() => {
                    if (wordIdx < words.length - 1) {
                      globalCharIndex++;
                    }
                    return null;
                  })()}
                </span>
              );
            })}
          </span>
        );
      })}
    </Component>
  );
}
