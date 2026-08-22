"use client";

import React, { useId, useState, useRef, useCallback } from "react";

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
  hoverStagger?: number;
  hoverDuration?: number;
  triggerOnHover?: boolean;
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
  hoverStagger = 15,
  hoverDuration = 600,
  triggerOnHover = true,
  as: Component = "div",
  className = "",
  style = {},
}: SplitTextWaveProps) {
  const baseId = useId();
  const [hoverCycle, setHoverCycle] = useState(0);
  const lastHoverTime = useRef(0);

  const handleMouseEnter = useCallback(() => {
    if (!triggerOnHover) return;
    const now = Date.now();
    // 300ms cooldown to keep wave triggers smooth and deliberate
    if (now - lastHoverTime.current > 300) {
      lastHoverTime.current = now;
      setHoverCycle((prev) => prev + 1);
    }
  }, [triggerOnHover]);

  const resolvedLines: TextLine[] =
    lines && lines.length > 0
      ? lines
      : text
      ? [{ text, className: "" }]
      : [];

  let globalIndex = 0;
  const isMultiLine = resolvedLines.length > 1;
  const isHoverReplay = hoverCycle > 0;

  return (
    <Component
      onMouseEnter={handleMouseEnter}
      data-cursor="wave"
      className={`split-text-wave-root inline-block ${className}`}
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
            key={`line-${baseId}-${hoverCycle}-${lineIdx}`}
            className={`${lineDisplayClass} ${lineObj.className || ""}`}
            style={isMultiLine ? { lineHeight: 1.15 } : undefined}
          >
            {words.map((word, wordIdx) => {
              const isLastWord = wordIdx === words.length - 1;

              if (splitBy === "word") {
                const currentIndex = globalIndex++;
                const itemDelay = isHoverReplay
                  ? currentIndex * hoverStagger
                  : delay + currentIndex * stagger;
                const itemDuration = isHoverReplay ? hoverDuration : duration;

                return (
                  <span
                    key={`w-${baseId}-${hoverCycle}-${lineIdx}-${wordIdx}`}
                    className={`split-text-wave-word ${
                      isHoverReplay ? "is-hovering" : ""
                    } inline-block mr-[0.28em] transition-transform duration-200 hover:-translate-y-1 hover:brightness-125`}
                    style={{
                      animationDelay: `${itemDelay}ms`,
                      animationDuration: `${itemDuration}ms`,
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
                  key={`w-${baseId}-${hoverCycle}-${lineIdx}-${wordIdx}`}
                  className="inline-block whitespace-nowrap mr-[0.28em]"
                >
                  {chars.map((char, charIdx) => {
                    const currentIndex = globalIndex++;
                    const itemDelay = isHoverReplay
                      ? currentIndex * hoverStagger
                      : delay + currentIndex * stagger;
                    const itemDuration = isHoverReplay ? hoverDuration : duration;

                    return (
                      <span
                        key={`c-${baseId}-${hoverCycle}-${lineIdx}-${wordIdx}-${charIdx}`}
                        className={`split-text-wave-char ${
                          isHoverReplay ? "is-hovering" : ""
                        } inline-block transition-transform duration-150 hover:-translate-y-1 hover:scale-105 hover:brightness-125`}
                        style={{
                          animationDelay: `${itemDelay}ms`,
                          animationDuration: `${itemDuration}ms`,
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
