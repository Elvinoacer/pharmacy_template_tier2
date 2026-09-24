"use client";

import { useEffect } from "react";
import { X, Sparkles, Film, ShieldCheck } from "lucide-react";
import { Pharmacy3DStage } from "./Pharmacy3DStage";
import { cinematicAudio } from "./CinematicAudio";
import styles from "./Cinematic3D.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pharmacyName?: string;
  city?: string;
  slug?: string;
  activeStage?: string;
}

export function CinematicModal3D({
  isOpen,
  onClose,
  pharmacyName = "Your Pharmacy",
  city = "Kenya",
  slug = "your-pharmacy",
  activeStage = "ACCOUNT",
}: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.cinemaModalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="3D Cinema Pharmacy Immersion"
    >
      <div className={styles.cinemaModalContent}>
        <button
          type="button"
          onClick={() => {
            cinematicAudio.playClick();
            onClose();
          }}
          className={styles.cinemaModalClose}
          aria-label="Close 3D Cinema"
        >
          <X size={18} />
        </button>

        <header className="p-3 sm:p-4 border-b border-emerald-500/20 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Film size={15} />
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Afyvia 3D Cinema Studio · {pharmacyName}
              </h2>
              <p className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                <ShieldCheck size={11} /> Live Telemetry Projection · {city}
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
            <Sparkles size={12} /> Real-Time 3D Immersion
          </span>
        </header>

        <div className="flex-1 min-h-0 relative bg-black/90">
          <Pharmacy3DStage
            initialName={pharmacyName}
            initialCity={city}
            initialSlug={slug}
            activeStage={activeStage}
            compact={false}
            fullHeight={true}
          />
        </div>

        <footer className="p-2 sm:p-3 border-t border-emerald-500/20 bg-slate-950/90 text-center text-[11px] text-slate-400">
          Touch and drag anywhere to orbit the 3D camera · Switch angles with bottom controls · Click floating 3D orbitals
        </footer>
      </div>
    </div>
  );
}
