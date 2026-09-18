"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

const OPERATIONAL_PREFIXES = [
  "/admin",
  "/portal",
  "/caregiver",
  "/platform",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/onboard",
];

function subscribeToMediaQuery(query: string, onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeToMediaQuery(query, onChange),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export default function AfyviaCursor() {
  const pathname = usePathname() || "/";
  const operational = OPERATIONAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const finePointer = useMediaQuery("(pointer: fine)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const enabled = !operational && finePointer && !reducedMotion;
  const [isVisible, setIsVisible] = useState(false);
  const [cursorType, setCursorType] = useState<"default" | "interactive" | "text" | "input">("default");
  const [isClicked, setIsClicked] = useState(false);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const prevRingPos = useRef({ x: -100, y: -100 });
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const rippleCount = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    const render = () => {
      if (!document.hidden) {
        if (dotRef.current) {
          dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
        }

        ringPos.current.x = lerp(ringPos.current.x, mousePos.current.x, 0.18);
        ringPos.current.y = lerp(ringPos.current.y, mousePos.current.y, 0.18);

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
      }
      rafId.current = requestAnimationFrame(render);
    };

    rafId.current = requestAnimationFrame(render);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInteractive = Boolean(
        target.closest(
          'a, button, [role="button"], input[type="submit"], input[type="button"], select, .cursor-pointer',
        ),
      );
      const isInputField = Boolean(
        target.closest('input:not([type="submit"]):not([type="button"]), textarea'),
      );
      const isText = Boolean(
        target.closest(
          '[data-cursor="text"], [data-cursor="wave"], h1, h2, h3, .split-text-wave-char, .split-text-wave-root',
        ),
      );

      const nextType = isInteractive
        ? "interactive"
        : isInputField
          ? "input"
          : isText
            ? "text"
            : "default";
      setCursorType((previous) => (previous === nextType ? previous : nextType));
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsClicked(true);
      const newRipple: ClickRipple = {
        id: ++rippleCount.current,
        x: e.clientX,
        y: e.clientY,
      };
      setRipples((prev) => [...prev.slice(-4), newRipple]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 500);
    };

    const handleMouseUp = () => setIsClicked(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

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
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden select-none"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.25s ease-out",
      }}
    >
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/80 animate-cursor-ripple"
          style={{ left: ripple.x, top: ripple.y, width: "18px", height: "18px" }}
        />
      ))}

      <div ref={ringRef} className="pointer-events-none absolute -left-4 -top-4 will-change-transform">
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

      <div ref={dotRef} className="pointer-events-none absolute -left-1 -top-1 will-change-transform">
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
