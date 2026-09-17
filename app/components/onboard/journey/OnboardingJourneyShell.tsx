"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  OnboardingChapter,
  PharmacyOnboardingSnapshot,
  PharmacyOnboardingStage,
} from "@/app/lib/services/pharmacy-onboarding-journey";
import { JOURNEY_CHAPTERS, getChapterForStage } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

type Props = {
  snapshot: PharmacyOnboardingSnapshot;
  activeStage: PharmacyOnboardingStage;
  isReviewEdit?: boolean;
  children: ReactNode;
};

const CHAPTER_INDEX_MAP: Record<OnboardingChapter, number> = {
  account: 0,
  pharmacy: 1,
  verification: 2,
  review: 3,
  launch: 4,
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

  return (
    <div className={styles.narrow}>
      {/* Top navigation context & review-edit escape link */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {pharmacy?.name ? (
            <p className={styles.kicker}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {pharmacy.name}
              {pharmacy.slug ? (
                <span className="text-[var(--muted)] font-normal lowercase tracking-normal">
                  · /p/{pharmacy.slug}
                </span>
              ) : null}
            </p>
          ) : (
            <p className={styles.kicker}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Aether Pharmacy Network
            </p>
          )}
        </div>

        {isReviewEdit ? (
          <Link href="/onboard?stage=review" className={styles.quietLink}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Return to application review
          </Link>
        ) : null}
      </div>

      {/* Persistent Journey Chapter Stepper */}
      <nav aria-label="Onboarding journey progress" className="mb-5">
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center" role="list">
          {JOURNEY_CHAPTERS.map((chapter, idx) => {
            const isCurrent = idx === currentChapterIdx;
            const isCompleted = idx < currentChapterIdx;

            return (
              <li
                key={chapter.id}
                aria-current={isCurrent ? "step" : undefined}
                className={`relative flex flex-col items-center rounded-xl p-2 transition-all ${
                  isCurrent
                    ? "bg-[var(--brand-soft)]/50 ring-2 ring-[var(--brand)]/30 text-[var(--brand)] font-bold shadow-xs"
                    : isCompleted
                      ? "text-emerald-700 dark:text-emerald-400 font-medium"
                      : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold mb-1 bg-white/70 dark:bg-black/20">
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <span>{idx + 1}</span>
                  ) : (
                    <span className="opacity-75">{idx + 1}</span>
                  )}
                </span>
                <span className="text-[10px] sm:text-xs tracking-tight truncate max-w-full">
                  {chapter.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Main stage work area */}
      <div id="pharmacy-application" className={styles.work}>
        {children}
      </div>
    </div>
  );
}
