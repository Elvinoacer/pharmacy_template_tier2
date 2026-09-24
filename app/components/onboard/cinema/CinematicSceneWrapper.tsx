"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Cinematic3D.module.css";
import { cinematicAudio } from "./CinematicAudio";

interface Props {
  stageKey: string;
  children: ReactNode;
}

export function CinematicSceneWrapper({ stageKey, children }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const isFirstRender = useRef(true);

  // Play cinematic act transition sound whenever stageKey changes between acts
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    cinematicAudio.playActTransition();
  }, [stageKey]);

  // Subtle 3D Card tilt on mouse move over the card, suppressed during typing
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) {
      if (tilt.x !== 0 || tilt.y !== 0) setTilt({ x: 0, y: 0 });
      return;
    }

    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 2.5;
    const rotY = ((x - centerX) / centerX) * 2.5;

    setTilt({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      key={stageKey}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`${styles.sceneContainer} ${styles.tiltCard}`}
      style={{
        transform: tilt.x !== 0 || tilt.y !== 0
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}
