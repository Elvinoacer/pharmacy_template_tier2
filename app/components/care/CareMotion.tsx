"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import glass from "./LiquidGlass.module.css";

/** Progressive motion: server-rendered content stays visible without JavaScript. */
export default function CareMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.getElementById("main-content");
    if (!root) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    function setup() {
      cleanup();
      if (preference.matches || !root) return;
      const animations = new Set<Animation>();
      const revealed = new Set<HTMLElement>();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          observer.unobserve(node);
          if (!node.animate) return;
          const animation = node.animate([
            { opacity: 0, transform: "translateY(22px) scale(.985)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ], {
            duration: 850,
            delay: Math.min(index, 3) * 65,
            easing: "cubic-bezier(.16,1,.3,1)",
            fill: "both",
          });
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      }, { threshold: 0.08 });

      const hasRevealedAncestor = (node: HTMLElement) => {
        let parent = node.parentElement;
        while (parent && parent !== root) {
          if (revealed.has(parent)) return true;
          parent = parent.parentElement;
        }
        return false;
      };

      const glassSelector = `article, section, .${glass.liquid}, .liquid-glass, .care-glass, .glass-panel, .glass-panel-strong, .glass-tile, .glass-tile-strong, .card-premium, [data-liquid-glass="true"]`;
      // Avoid nested reveals and keep the first viewport immediately usable.
      const scan = () => root.querySelectorAll<HTMLElement>(glassSelector).forEach(node => {
        if (revealed.has(node)) return;
        if (node.closest("header") || hasRevealedAncestor(node)) return;
        if (node.getBoundingClientRect().top < innerHeight - 30) {
          revealed.add(node);
          return;
        }
        revealed.add(node);
        observer.observe(node);
      });
      scan();
      const contentObserver = new MutationObserver(scan);
      contentObserver.observe(root, { childList: true, subtree: true });
      let frame = 0;
      const pointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const target = (event.target as Element).closest<HTMLElement>(`.${glass.liquid}, .liquid-glass, .care-glass, .glass-panel, .glass-panel-strong, .glass-tile, .glass-tile-strong, .card-premium, [data-liquid-glass="true"]`);
        if (!target) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = target.getBoundingClientRect();
          target.style.setProperty("--glass-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
          target.style.setProperty("--glass-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        });
      };
      const press = (event: PointerEvent) => {
        const target = (event.target as Element).closest<HTMLElement>("a, button");
        if (!target || target.matches(":disabled") || !target.animate) return;
        const animation = target.animate([
          { scale: "1" }, { scale: ".955", offset: .28 },
          { scale: "1.018", offset: .7 }, { scale: "1" },
        ], { duration: 420, easing: "cubic-bezier(.22,.8,.25,1)" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      };
      root.addEventListener("pointermove", pointer, { passive: true });
      root.addEventListener("pointerdown", press, { passive: true });
      cleanup = () => {
        observer.disconnect();
        contentObserver.disconnect();
        cancelAnimationFrame(frame);
        root.removeEventListener("pointermove", pointer);
        root.removeEventListener("pointerdown", press);
        animations.forEach(animation => animation.cancel());
      };
    }
    setup();
    preference.addEventListener("change", setup);
    return () => { cleanup(); preference.removeEventListener("change", setup); };
  }, [pathname]);
  return null;
}
