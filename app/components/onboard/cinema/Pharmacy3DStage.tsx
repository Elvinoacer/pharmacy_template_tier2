"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Camera,
  Maximize2,
  Package,
  Radio,
  Scan,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import styles from "./Cinematic3D.module.css";
import { cinematicAudio } from "./CinematicAudio";
import {
  getStageCamera,
  clampStageRotation,
  type CameraPreset,
} from "./cinemaUtils";

export type { CameraPreset };

interface Props {
  initialName?: string;
  initialCity?: string;
  initialSlug?: string;
  activeStage?: string;
  compact?: boolean;
  fullHeight?: boolean;
  onExpandCinema?: () => void;
}

export function Pharmacy3DStage({
  initialName = "Your Pharmacy",
  initialCity = "Kenya",
  initialSlug = "your-pharmacy",
  activeStage = "ACCOUNT",
  compact = false,
  fullHeight = false,
  onExpandCinema,
}: Props) {
  const [userCamera, setUserCamera] = useState<CameraPreset | null>(null);
  const camera = userCamera ?? getStageCamera(activeStage);

  const [name, setName] = useState(initialName);
  const [city, setCity] = useState(initialCity);
  const [slug, setSlug] = useState(initialSlug);

  // Drag rotation state
  const [manualRot, setManualRot] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initRotX: 0, initRotY: 0 });

  // Orbitals interactive feedback
  const [activeOrbital, setActiveOrbital] = useState<"capsule" | "mpesa" | "ppb" | null>(null);
  const [stkSimulating, setStkSimulating] = useState(false);

  // Audio state
  const [audioActive, setAudioActive] = useState(() => cinematicAudio.getActive());

  // Timecode
  const [timecode, setTimecode] = useState("00:01:24:16");

  // Sync with live typing events dispatched by Onboard form fields
  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<{ name?: string; city?: string; slug?: string }>;
      if (custom.detail?.name !== undefined) {
        setName(custom.detail.name || "Your Pharmacy");
      }
      if (custom.detail?.city !== undefined) {
        setCity(custom.detail.city || "Kenya");
      }
      if (custom.detail?.slug !== undefined) {
        setSlug(custom.detail.slug || "your-pharmacy");
      }
    };

    window.addEventListener("afyvia-onboard-sync", handleSync);
    return () => window.removeEventListener("afyvia-onboard-sync", handleSync);
  }, []);

  // Audio sound cue when activeStage changes
  useEffect(() => {
    if (activeStage.includes("VERIFICATION")) {
      cinematicAudio.playScanner();
    } else if (activeStage === "READY_TO_LAUNCH") {
      cinematicAudio.playPremiere();
    }
  }, [activeStage]);

  // Timecode ticker
  useEffect(() => {
    let frame = 16;
    let sec = 24;
    let min = 1;
    const interval = setInterval(() => {
      frame += 3;
      if (frame >= 30) {
        frame = 0;
        sec += 1;
        if (sec >= 60) {
          sec = 0;
          min += 1;
        }
      }
      const pad = (n: number) => String(n).padStart(2, "0");
      setTimecode(`00:${pad(min)}:${pad(sec)}:${pad(frame)}`);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // If the pointer event originates on an interactive control, do not initiate viewport camera drag
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, textarea, [role='button'], [role='tab']")) {
      return;
    }

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      initRotX: manualRot.x,
      initRotY: manualRot.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setManualRot(
      clampStageRotation(
        dragStart.current.initRotX - dy * 0.35,
        dragStart.current.initRotY + dx * 0.35
      )
    );
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }
  };

  const handleResetCamera = (preset: CameraPreset) => {
    setUserCamera(preset);
    setManualRot({ x: 0, y: 0 });
    cinematicAudio.playClick();
    if (preset === "scanner") {
      cinematicAudio.playScanner();
    }
  };

  const toggleSound = () => {
    const newState = cinematicAudio.toggle();
    setAudioActive(newState);
  };

  // Base camera angle map
  const getCameraClass = () => {
    switch (camera) {
      case "orbit":
        return styles.camOrbit;
      case "storefront":
        return styles.camStorefront;
      case "scanner":
        return styles.camScanner;
      case "midnight":
        return styles.camMidnight;
      default:
        return styles.camStorefront;
    }
  };

  // Combined manual rotation transform
  const dynamicTransform = `rotateX(${manualRot.x}deg) rotateY(${manualRot.y}deg)`;

  return (
    <div
      className={`${styles.stageViewport} ${fullHeight ? styles.stageFullHeight : compact ? styles.stageCompact : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="region"
      aria-label="Interactive 3D Pharmacy Simulation"
    >
      <div className={styles.ambientHalo} />

      {/* Top Cinema Director HUD */}
      <header className={styles.directorHud}>
        <div className="flex items-center gap-2">
          <span className={styles.hudBadge}>
            <span className={styles.recDot} aria-hidden="true" />
            <span>REC {timecode}</span>
          </span>
          <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-400/80 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
            3D SPATIAL ENGINE
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={styles.audioToggleBtn}
            onClick={toggleSound}
            title={audioActive ? "Mute Cinema Sound" : "Enable Cinema Sound"}
            aria-label={audioActive ? "Mute Cinema Sound" : "Enable Cinema Sound"}
          >
            <div className={styles.eqWaves} aria-hidden="true">
              <span className={`${styles.eqBar} ${audioActive ? styles.eqBarPlaying : styles.eqBarMuted}`} />
              <span className={`${styles.eqBar} ${audioActive ? styles.eqBarPlaying : styles.eqBarMuted}`} />
              <span className={`${styles.eqBar} ${audioActive ? styles.eqBarPlaying : styles.eqBarMuted}`} />
              <span className={`${styles.eqBar} ${audioActive ? styles.eqBarPlaying : styles.eqBarMuted}`} />
            </div>
            <span>{audioActive ? "SOUND ON" : "SOUND MUTED"}</span>
          </button>

          {onExpandCinema ? (
            <button
              type="button"
              className={styles.hudBadge}
              style={{ cursor: "pointer", background: "rgba(6, 182, 212, 0.15)", borderColor: "rgba(6, 182, 212, 0.4)", color: "#a5f3fc" }}
              onClick={() => {
                cinematicAudio.playClick();
                onExpandCinema();
              }}
              title="Full 3D Cinematic Immersion"
            >
              <Maximize2 size={11} aria-hidden="true" />
              <span>EXPAND</span>
            </button>
          ) : null}
        </div>
      </header>

      {/* 3D Preserved World Coordinates */}
      <div
        className={`${styles.stageWorld} ${getCameraClass()}`}
        style={{
          transform: isDragging || manualRot.x !== 0 || manualRot.y !== 0
            ? `${getCameraClass() === styles.camStorefront ? "scale(1.12)" : getCameraClass() === styles.camOrbit ? "scale(0.96)" : "scale(1)"} ${dynamicTransform}`
            : undefined,
        }}
      >
        {/* 1. Cyber Pedestal / Ground Radar */}
        <div className={styles.groundPlane} aria-hidden="true">
          <div className={styles.groundGrid} />
          <div className={styles.radarSweepRing} />
          <div className={styles.radarPulseRing} />
          <div className={styles.pedestalShadow} />
        </div>

        {/* 2. Pharmacy 3D Building */}
        <div className={styles.buildingBase}>
          {/* Active PPB Laser Scanning Beam */}
          {(camera === "scanner" || activeStage.includes("VERIFICATION")) && (
            <div className={styles.scannerBeam} aria-hidden="true" />
          )}

          {/* Facade Wall */}
          <div className={styles.facadeWall}>
            {/* Storefront Window Glass */}
            <div className={styles.storefrontWindow}>
              {/* Shelves with Glowing Medicine Bottles */}
              <div className={styles.interiorShelves}>
                <div className={styles.shelfRow}>
                  <span className={styles.shelfBottle} style={{ height: "16px", color: "#34d399", background: "#10b981" }} />
                  <span className={styles.shelfBottle} style={{ height: "22px", color: "#67e8f9", background: "#06b6d4" }} />
                  <span className={styles.shelfBottle} style={{ height: "14px", color: "#fbbf24", background: "#f59e0b" }} />
                  <span className={styles.shelfBottle} style={{ height: "19px", color: "#34d399", background: "#059669" }} />
                </div>
                <div className={styles.shelfRow}>
                  <span className={styles.shelfBottle} style={{ height: "20px", color: "#67e8f9", background: "#0891b2" }} />
                  <span className={styles.shelfBottle} style={{ height: "15px", color: "#34d399", background: "#10b981" }} />
                  <span className={styles.shelfBottle} style={{ height: "23px", color: "#fbbf24", background: "#d97706" }} />
                </div>
              </div>

              {/* Entrance Doorway */}
              <div className={styles.doorFrame}>
                <div className={styles.doorMat} />
              </div>
            </div>
          </div>

          {/* 3D Overhanging Canopy Awning */}
          <div className={styles.canopyAwning} aria-hidden="true">
            <span className={styles.canopyRib} />
            <span className={styles.canopyRib} />
            <span className={styles.canopyRib} />
            <span className={styles.canopyRib} />
          </div>

          {/* 3D Dynamic Neon Signboard */}
          <div className={styles.neonSignboard}>
            <div className={styles.neonText}>
              {name || "Your Pharmacy"}
            </div>
            <span className={styles.neonLocation}>
              ✦ {city || "Kenya"} · /p/{slug || "store"} ✦
            </span>
          </div>

          {/* 3D Spinning Emerald Medical Cross */}
          <div className={styles.crossContainer} aria-hidden="true">
            <div className={styles.rotatingCross}>
              <span className={styles.crossArmHorizontal} />
              <span className={styles.crossArmVertical} />
            </div>
          </div>

          {/* 3. Floating 3D Interactive Orbitals */}
          {/* Orbital A: Floating 3D Medicine Capsule */}
          <button
            type="button"
            className={styles.orbitalPill}
            onClick={() => {
              cinematicAudio.playClick();
              setActiveOrbital(activeOrbital === "capsule" ? null : "capsule");
            }}
            title="Inspect 1,400+ Formulary Medicines"
            aria-label="Inspect Kenyan Formulary Medicines"
          >
            <div className={styles.capsuleBody}>
              <span className={styles.capsuleLeft} />
              <span className={styles.capsuleRight} />
            </div>
          </button>

          {/* Orbital B: 3D M-PESA STK Pulse Node */}
          <button
            type="button"
            className={styles.orbitalMpesa}
            onClick={() => {
              cinematicAudio.playClick();
              setStkSimulating(true);
              cinematicAudio.playSuccess();
              setTimeout(() => setStkSimulating(false), 2400);
              setActiveOrbital(activeOrbital === "mpesa" ? null : "mpesa");
            }}
            title="Simulate 1-Tap M-PESA Payment"
            aria-label="Simulate M-PESA Payment"
          >
            <div className={styles.mpesaOrb}>
              <Smartphone size={16} />
            </div>
          </button>

          {/* Orbital C: 3D PPB Regulatory Seal */}
          <button
            type="button"
            className={styles.orbitalPpb}
            onClick={() => {
              handleResetCamera("scanner");
              setActiveOrbital(activeOrbital === "ppb" ? null : "ppb");
            }}
            title="PPB Regulatory Verification Hologram"
            aria-label="Inspect PPB Regulatory Verification"
          >
            <div className={styles.ppbShieldBadge}>
              <ShieldCheck size={13} className="text-amber-400" />
              <span>PPB KE</span>
            </div>
          </button>
        </div>
      </div>

      {/* Hologram Popup Details Overlay */}
      {activeOrbital && (
        <div
          className="absolute inset-x-3 bottom-14 z-20 rounded-xl p-3 bg-slate-950/90 border border-emerald-500/40 shadow-2xl backdrop-blur-md animate-fadeIn"
          role="status"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {activeOrbital === "capsule" && <Package className="h-4 w-4 text-emerald-400 shrink-0" />}
              {activeOrbital === "mpesa" && <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />}
              {activeOrbital === "ppb" && <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />}
              <strong className="text-xs font-bold text-white">
                {activeOrbital === "capsule" && "1,400+ Kenyan Formulary Medicines"}
                {activeOrbital === "mpesa" && (stkSimulating ? "⚡ M-PESA STK Push Triggered!" : "1-Tap M-PESA STK Integration")}
                {activeOrbital === "ppb" && "PPB Regulatory Vault Protected"}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setActiveOrbital(null)}
              className="text-white/60 hover:text-white"
              aria-label="Close details"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-300 leading-snug">
            {activeOrbital === "capsule" && "Pre-loaded Kenyan brands & generic molecules (Amoxicillin, Metformin, Inhalers) ready to dispense online immediately."}
            {activeOrbital === "mpesa" && (stkSimulating ? "Direct Safaricom STK prompt sent to patient. KES 950 confirmed directly into your Till/Paybill." : "Automated instant customer checkout directly to your verified pharmacy till.")}
            {activeOrbital === "ppb" && "Superintendent pharmacist credentials and premise licenses encrypted and verified against Pharmacy and Poisons Board standards."}
          </p>
        </div>
      )}

      {/* Bottom Camera Angle Director Controls */}
      <footer className={styles.directorHudBottom}>
        <div className={styles.cameraChipGroup} role="group" aria-label="Camera Angles">
          <button
            type="button"
            className={`${styles.cameraChip} ${camera === "storefront" ? styles.cameraChipActive : ""}`}
            onClick={() => handleResetCamera("storefront")}
            aria-pressed={camera === "storefront"}
          >
            <Camera size={10} aria-hidden="true" />
            <span>FRONT</span>
          </button>
          <button
            type="button"
            className={`${styles.cameraChip} ${camera === "orbit" ? styles.cameraChipActive : ""}`}
            onClick={() => handleResetCamera("orbit")}
            aria-pressed={camera === "orbit"}
          >
            <Radio size={10} aria-hidden="true" />
            <span>ORBIT</span>
          </button>
          <button
            type="button"
            className={`${styles.cameraChip} ${camera === "scanner" ? styles.cameraChipActive : ""}`}
            onClick={() => handleResetCamera("scanner")}
            aria-pressed={camera === "scanner"}
          >
            <Scan size={10} aria-hidden="true" />
            <span>SCAN</span>
          </button>
          <button
            type="button"
            className={`${styles.cameraChip} ${camera === "midnight" ? styles.cameraChipActive : ""}`}
            onClick={() => handleResetCamera("midnight")}
            aria-pressed={camera === "midnight"}
          >
            <Sparkles size={10} aria-hidden="true" />
            <span>NEON</span>
          </button>
        </div>

        <span className="text-[10px] font-semibold text-emerald-400/80 hidden sm:inline">
          Drag to rotate 3D view
        </span>
      </footer>
    </div>
  );
}
