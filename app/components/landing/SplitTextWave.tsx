"use client";

import React, { useId } from "react";

export interface TextLine {
  text: string;
  className?: string;
}

export interface SplitTextWaveProps {
  text?: string;
  lines?: TextLine[];
  splitBy?: "char" | "word";
  delay?: number;
  stagger?: number;
  duration?: number;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  style?: React.CSSProperties;
}

export default function SplitTextWave({
  text,
  lines,
  splitBy = "char",
  delay = 0,
  stagger = 20,
  duration = 700,
  as: Component = "div",
  className = "",
  style = {},
}: SplitTextWaveProps) {
  const baseId = useId();

  const resolvedLines: TextLine[] =
    lines && lines.length > 0
      ? lines
      : text
      ? [{ text, className: "" }]
      : [];

  let globalIndex = 0;
  const isMultiLine = resolvedLines.length > 1;

  return (
    <Component
      className={className}
      style={{
        ...style,
        wordBreak: "break-word",
      }}
    >
      {resolvedLines.map((lineObj, lineIdx) => {
        const words = lineObj.text.split(" ");
        const lineDisplayClass = isMultiLine ? "block" : "inline";

        return (
          <span
            key={`line-${baseId}-${lineIdx}`}
            className={`${lineDisplayClass} ${lineObj.className || ""}`}
            style={isMultiLine ? { lineHeight: 1.15 } : undefined}
          >
            {words.map((word, wordIdx) => {
              const isLastWord = wordIdx === words.length - 1;

              if (splitBy === "word") {
                const currentIndex = globalIndex++;
                const itemDelay = delay + currentIndex * stagger;

                return (
                  <span
                    key={`w-${baseId}-${lineIdx}-${wordIdx}`}
                    className="split-text-wave-word inline-block mr-[0.28em]"
                    style={{
                      animationDelay: `${itemDelay}ms`,
                      animationDuration: `${duration}ms`,
                    }}
                  >
                    {word}
                  </span>
                );
              }

              // Character-level split wave
              const chars = word.split("");
              return (
                <span
                  key={`w-${baseId}-${lineIdx}-${wordIdx}`}
                  className="inline-block whitespace-nowrap mr-[0.28em]"
                >
                  {chars.map((char, charIdx) => {
                    const currentIndex = globalIndex++;
                    const itemDelay = delay + currentIndex * stagger;

                    return (
                      <span
                        key={`c-${baseId}-${lineIdx}-${wordIdx}-${charIdx}`}
                        className="split-text-wave-char inline-block"
                        style={{
                          animationDelay: `${itemDelay}ms`,
                          animationDuration: `${duration}ms`,
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                  {/* Advance global index for inter-word spacing timing */}
                  {(() => {
                    if (!isLastWord) {
                      globalIndex++;
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
