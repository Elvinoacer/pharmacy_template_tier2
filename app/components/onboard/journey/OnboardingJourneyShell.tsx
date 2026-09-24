"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Film,
  Maximize2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import { Pharmacy3DStage } from "@/app/components/onboard/cinema/Pharmacy3DStage";
import { CinematicModal3D } from "@/app/components/onboard/cinema/CinematicModal3D";
import { CinematicConduitStepper } from "@/app/components/onboard/cinema/CinematicConduitStepper";
import { CinematicSceneWrapper } from "@/app/components/onboard/cinema/CinematicSceneWrapper";
import { ClickParticles } from "@/app/components/onboard/cinema/ClickParticles";
import { cinematicAudio } from "@/app/components/onboard/cinema/CinematicAudio";

type PharmacyOnboardingStage =
  | "ACCOUNT"
  | "EMAIL_VERIFICATION"
  | "PHARMACY_DETAILS"
  | "VERIFICATION_INFORMATION"
  | "VERIFICATION_PAYMENT"
  | "FINAL_REVIEW"
  | "AWAITING_ADMIN_REVIEW"
  | "NEEDS_INFORMATION"
  | "REJECTED"
  | "POST_APPROVAL_SETUP"
  | "SERVICE_ACTIVATION"
  | "READY_TO_LAUNCH"
  | "COMPLETE";

type OnboardingChapter =
  | "account"
  | "pharmacy"
  | "verification"
  | "review"
  | "launch";

type JourneyChapterMeta = {
  id: OnboardingChapter;
  label: string;
  stages: PharmacyOnboardingStage[];
};

type OnboardingShellSnapshot = {
  pharmacy: {
    id?: string;
    name: string;
    slug: string | null;
    city?: string | null;
    county?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  user?: {
    id?: string;
    email?: string;
    fullName?: string | null;
  } | null;
};

const JOURNEY_CHAPTERS: JourneyChapterMeta[] = [
  { id: "account", label: "Account", stages: ["ACCOUNT", "EMAIL_VERIFICATION"] },
  { id: "pharmacy", label: "Premises", stages: ["PHARMACY_DETAILS"] },
  {
    id: "verification",
    label: "Verification",
    stages: ["VERIFICATION_INFORMATION", "VERIFICATION_PAYMENT", "FINAL_REVIEW"],
  },
  {
    id: "review",
    label: "Review",
    stages: ["AWAITING_ADMIN_REVIEW", "NEEDS_INFORMATION", "REJECTED"],
  },
  {
    id: "launch",
    label: "Launch",
    stages: ["POST_APPROVAL_SETUP", "SERVICE_ACTIVATION", "READY_TO_LAUNCH", "COMPLETE"],
  },
];

function getChapterForStage(stage: PharmacyOnboardingStage): OnboardingChapter {
  for (const chapter of JOURNEY_CHAPTERS) {
    if (chapter.stages.includes(stage)) return chapter.id;
  }
  return "account";
}

const CHAPTER_INDEX_MAP: Record<OnboardingChapter, number> = {
  account: 0,
  pharmacy: 1,
  verification: 2,
  review: 3,
  launch: 4,
};

type Props = {
  snapshot: OnboardingShellSnapshot;
  activeStage: PharmacyOnboardingStage;
  isReviewEdit?: boolean;
  children: ReactNode;
};

export function OnboardingJourneyShell({
  snapshot,
  activeStage,
  isReviewEdit = false,
  children,
}: Props) {
  const currentChapterId = getChapterForStage(activeStage);
  const currentChapterIdx = CHAPTER_INDEX_MAP[currentChapterId];
  const pharmacy = snapshot.pharmacy;
  const [cinemaModalOpen, setCinemaModalOpen] = useState(false);

  return (
    <div className={styles.frame}>
      {/* 3D Global Click Particle & Shockwave Canvas */}
      <ClickParticles />

      {/* Top navigation context & review-edit escape link */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {pharmacy?.name ? (
            <p className={styles.kicker}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {pharmacy.name}
              {pharmacy.slug ? (
                <span className={styles.kickerPath}>
                  · /p/{pharmacy.slug}
                </span>
              ) : null}
            </p>
          ) : (
            <p className={styles.kicker}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Afyvia 3D Pharmacy Odyssey
            </p>
          )}

          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <Film size={10} /> 3D CINEMA ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              cinematicAudio.playClick();
              setCinemaModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all"
            title="Expand Full 3D Cinema Experience"
          >
            <Maximize2 size={12} />
            <span>3D Cinema View</span>
          </button>

          {isReviewEdit ? (
            <Link href="/onboard?stage=review" className={styles.quietLink}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Return to review
            </Link>
          ) : null}
        </div>
      </div>

      {/* 3D Cyber Optical Conduit Stepper */}
      <CinematicConduitStepper currentChapterIdx={currentChapterIdx} />

      {/* Dual Engine Studio: 3D Stage + Cinematic Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive 3D Pharmacy Stage (Sticky on Desktop) */}
        <aside
          className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 order-first lg:order-none"
          aria-label="3D Pharmacy Simulation"
        >
          <Pharmacy3DStage
            initialName={pharmacy?.name || "Your Pharmacy"}
            initialCity={pharmacy?.city || "Kenya"}
            initialSlug={pharmacy?.slug || "your-pharmacy"}
            activeStage={activeStage}
            compact={false}
            onExpandCinema={() => setCinemaModalOpen(true)}
          />

          {/* Holographic Telemetry Deck */}
          <div className="mt-3 p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/25 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                STAGE TELEMETRY
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                ACT {currentChapterIdx + 1} OF 5
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-300 leading-relaxed">
              Your 3D pharmacy reflects your input in real-time. Neon signage, PPB encryption seals, and M-PESA STK rails are live in this simulation.
            </p>
          </div>
        </aside>

        {/* Right Column: Step Forms inside 3D Scene Wrapper */}
        <div className="lg:col-span-7 xl:col-span-7 min-w-0">
          <CinematicSceneWrapper stageKey={activeStage}>
            <div id="pharmacy-application" className={styles.work}>
              {children}
            </div>
          </CinematicSceneWrapper>
        </div>
      </div>

      {/* Full-Screen 3D Cinema Immersion Modal */}
      <CinematicModal3D
        isOpen={cinemaModalOpen}
        onClose={() => setCinemaModalOpen(false)}
        pharmacyName={pharmacy?.name || "Your Pharmacy"}
        city={pharmacy?.city || "Kenya"}
        slug={pharmacy?.slug || "your-pharmacy"}
        activeStage={activeStage}
      />
    </div>
  );
}
