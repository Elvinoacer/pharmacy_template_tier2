"use client";

import { CheckCircle2, Film } from "lucide-react";
import styles from "./Cinematic3D.module.css";
import {
  CHAPTERS,
  computeConduitProgress,
  type StepperChapter,
} from "./cinemaUtils";

export type { StepperChapter };

interface Props {
  currentChapterIdx: number;
}

export function CinematicConduitStepper({ currentChapterIdx }: Props) {
  const progressPercent = computeConduitProgress(currentChapterIdx, CHAPTERS.length);

  return (
    <nav
      className={styles.conduitStepper}
      aria-label="Cinematic Onboarding Acts Progress"
    >
      {/* 3D Connecting Optical Conduit */}
      <div className={styles.conduitTrack} aria-hidden="true">
        <div
          className={styles.conduitFill}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="contents" role="list">
        {CHAPTERS.map((chapter, idx) => {
          const isActive = idx === currentChapterIdx;
          const isCompleted = idx < currentChapterIdx;

          return (
            <li
              key={chapter.id}
              className={`${styles.conduitNode} ${
                isActive
                  ? styles.conduitNodeActive
                  : isCompleted
                    ? styles.conduitNodeCompleted
                    : styles.conduitNodeUpcoming
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              <div className={styles.conduitBeacon}>
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isActive ? (
                  <Film className="h-3.5 w-3.5 animate-pulse" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold text-emerald-400/70 tracking-widest">
                  {chapter.act}
                </span>
                <span className={styles.conduitTitle}>
                  {chapter.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
