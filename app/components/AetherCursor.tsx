"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export default function AetherCursor() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cursorType, setCursorType] = useState<"default" | "interactive" | "text" | "input">("default");
  const [isClicked, setIsClicked] = useState(false);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);

  // Coordinates refs for high performance 60/120fps RAF loop
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const prevRingPos = useRef({ x: -100, y: -100 });
  
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const rippleCount = useRef(0);

  // Mount check and fine-pointer capability check
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (isFinePointer) {
      setMounted(true);
    }
  }, []);

  // Main animation loop
  useEffect(() => {
    if (!mounted) return;

    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const render = () => {
      // Direct dot transform (instant response)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      // Smooth follower ring with organic inertia (LERP factor 0.18)
      ringPos.current.x = lerp(ringPos.current.x, mousePos.current.x, 0.18);
      ringPos.current.y = lerp(ringPos.current.y, mousePos.current.y, 0.18);

      // Subtle speed-based squash/stretch along movement velocity
      const dx = ringPos.current.x - prevRingPos.current.x;
      const dy = ringPos.current.y - prevRingPos.current.y;
      prevRingPos.current.x = ringPos.current.x;
      prevRingPos.current.y = ringPos.current.y;

      const speed = Math.min(Math.sqrt(dx * dx + dy * dy), 24);
      const angle = Math.atan2(dy, dx);
      const stretch = 1 + speed * 0.015;
      const squash = 1 - speed * 0.008;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) rotate(${angle}rad) scale(${stretch}, ${squash})`;
      }

      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [mounted]);

  // Event listeners for mouse tracking, hover states, clicks
  useEffect(() => {
    if (!mounted) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      if (!isVisible) setIsVisible(true);

      // Inspect target element for contextual state
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInteractive = Boolean(
        target.closest(
          'a, button, [role="button"], input[type="submit"], input[type="button"], select, .cursor-pointer'
        )
      );

      const isInputField = Boolean(
        target.closest('input:not([type="submit"]):not([type="button"]), textarea')
      );

      const isText = Boolean(
        target.closest(
          '[data-cursor="text"], [data-cursor="wave"], h1, h2, h3, .split-text-wave-char, .split-text-wave-root'
        )
      );

      if (isInteractive) {
        setCursorType("interactive");
      } else if (isInputField) {
        setCursorType("input");
      } else if (isText) {
        setCursorType("text");
      } else {
        setCursorType("default");
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsClicked(true);
      const newRipple: ClickRipple = {
        id: ++rippleCount.current,
        x: e.clientX,
        y: e.clientY,
      };
      setRipples((prev) => [...prev.slice(-4), newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 500);
    };

    const handleMouseUp = () => {
      setIsClicked(false);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [mounted, isVisible]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden select-none"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}
    >
      {/* Click Ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/80 animate-cursor-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: "18px",
            height: "18px",
          }}
        />
      ))}

      {/* Trailing Aura Ring */}
      <div
        ref={ringRef}
        className="pointer-events-none absolute -left-4 -top-4 will-change-transform"
      >
        <div
          className={`h-8 w-8 rounded-full border transition-all duration-300 ease-out ${
            cursorType === "interactive"
              ? "scale-[1.85] border-amber-300 bg-amber-400/20 shadow-[0_0_25px_rgba(251,191,36,0.45)] backdrop-blur-[1px]"
              : cursorType === "text"
              ? "scale-x-[2.2] scale-y-[1.3] border-amber-300/70 bg-amber-400/15 backdrop-blur-[2px] shadow-[0_0_20px_rgba(251,191,36,0.3)]"
              : cursorType === "input"
              ? "scale-y-[1.6] scale-x-[0.6] border-emerald-400/80 bg-emerald-400/10"
              : isClicked
              ? "scale-[0.75] border-amber-400 bg-amber-400/30"
              : "scale-100 border-amber-400/40 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
          }`}
        />
      </div>

      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        className="pointer-events-none absolute -left-1 -top-1 will-change-transform"
      >
        <div
          className={`h-2 w-2 rounded-full transition-transform duration-150 ease-out ${
            cursorType === "interactive"
              ? "scale-[0.6] bg-amber-200 shadow-[0_0_8px_rgba(254,240,138,0.9)]"
              : cursorType === "text"
              ? "scale-[0.75] bg-amber-300 shadow-[0_0_10px_rgba(253,224,71,0.8)]"
              : cursorType === "input"
              ? "scale-y-[1.8] scale-x-[0.5] bg-emerald-300"
              : isClicked
              ? "scale-[1.5] bg-yellow-200 shadow-[0_0_12px_rgba(254,240,138,1)]"
              : "scale-100 bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-[0_0_10px_rgba(251,191,36,0.75)]"
          }`}
        />
      </div>
    </div>
  );
}
