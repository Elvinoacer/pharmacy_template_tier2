"use client";

import { useEffect, useRef } from "react";
import { cinematicAudio } from "./CinematicAudio";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  shape: "circle" | "spark" | "cross";
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  decay: number;
  color: string;
}

const PALETTE = [
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#34d399", // Mint
  "#a7f3d0", // Light emerald
  "#fbbf24", // Golden ember
  "#ffffff", // White starlight
];

export function ClickParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect reduced motion preferences
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });

    const spawnParticles = (cx: number, cy: number, isMajorAction: boolean) => {
      const count = isMajorAction ? 26 : 14;
      const paletteIndex = Math.floor(Math.random() * PALETTE.length);

      // Shockwave ring
      shockwavesRef.current.push({
        x: cx,
        y: cy,
        radius: 4,
        maxRadius: isMajorAction ? 75 : 45,
        alpha: 0.85,
        decay: isMajorAction ? 0.035 : 0.05,
        color: PALETTE[paletteIndex],
      });

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 4.5 + 1.5) * (isMajorAction ? 1.4 : 1.0);
        const shapes: Particle["shape"][] = ["circle", "spark", "cross"];

        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8, // slight upward buoyancy
          size: Math.random() * 3.5 + 1.5,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          alpha: 1.0,
          decay: Math.random() * 0.025 + 0.02,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
        });
      }

      // Start animation loop if not running
      if (!rafIdRef.current) {
        animate();
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render & update shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += (sw.maxRadius - sw.radius) * 0.15 + 1.5;
        sw.alpha -= sw.decay;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = 2;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      }

      // Render & update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.09; // subtle gravity
        p.vx *= 0.96; // air drag
        p.alpha -= p.decay;
        p.rotation += p.vRot;

        if (p.alpha <= 0 || p.x < 0 || p.x > canvas.width || p.y > canvas.height) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "cross") {
          const arm = p.size * 1.5;
          ctx.fillRect(-arm, -1, arm * 2, 2);
          ctx.fillRect(-1, -arm, 2, arm * 2);
        } else {
          // spark diamond
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.8);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size * 1.8);
          ctx.lineTo(-p.size, 0);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      if (particlesRef.current.length > 0 || shockwavesRef.current.length > 0) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInteractive = target.closest(
        "button, a, summary, input, select, label, [role='button'], [role='tab'], .btn-primary, .btn-secondary, [data-cinema-click]"
      ) as HTMLElement | null;

      if (isInteractive) {
        const isMajor = Boolean(
          isInteractive.closest(".btn-primary") ||
          isInteractive.closest("[type='submit']") ||
          isInteractive.closest("[role='tab']")
        );

        let cx = e.clientX;
        let cy = e.clientY;
        // Resolve coordinates from bounding rect if synthetic or keyboard trigger (e.detail === 0 or (0, 0))
        if ((cx === 0 && cy === 0) || e.detail === 0) {
          const rect = isInteractive.getBoundingClientRect();
          cx = rect.left + rect.width / 2;
          cy = rect.top + rect.height / 2;
        }

        cinematicAudio.playClick();
        spawnParticles(cx, cy, isMajor);
      }
    };

    window.addEventListener("click", handleClick, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("click", handleClick);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
