// app/components/onboard/cinema/cinemaUtils.ts
// Mathematical, spatial, and telemetry utilities for the 3D Cinema Onboarding Experience.

export type CameraPreset = "orbit" | "storefront" | "scanner" | "midnight";

export interface StepperChapter {
  id: string;
  act: string;
  label: string;
}

export const CHAPTERS: StepperChapter[] = [
  { id: "account", act: "ACT I", label: "Identity" },
  { id: "pharmacy", act: "ACT II", label: "Premises" },
  { id: "verification", act: "ACT III", label: "Vault" },
  { id: "review", act: "ACT IV", label: "Verdict" },
  { id: "launch", act: "ACT V", label: "Premiere" },
];

/**
 * Resolves the cinematic camera angle preset based on the current onboarding stage.
 */
export function getStageCamera(stage: string): CameraPreset {
  if (stage === "ACCOUNT") return "storefront";
  if (stage === "PHARMACY_DETAILS") return "orbit";
  if (stage.includes("VERIFICATION")) return "scanner";
  if (stage === "FINAL_REVIEW" || stage === "READY_TO_LAUNCH") return "midnight";
  return "storefront";
}

/**
 * Computes percentage progress (0 to 100) along the 3D optical conduit stepper.
 */
export function computeConduitProgress(currentIdx: number, totalChapters: number = CHAPTERS.length): number {
  if (totalChapters <= 1) return 0;
  return Math.min(100, Math.max(0, (currentIdx / (totalChapters - 1)) * 100));
}

/**
 * Clamps 3D stage manual rotation angles within realistic cinematic bounds
 * to prevent unnatural clipping or inverted perspectives.
 */
export function clampStageRotation(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(-45, Math.min(45, x)),
    y: Math.max(-60, Math.min(60, y)),
  };
}
