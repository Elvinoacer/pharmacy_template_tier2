"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

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
    name: string;
    slug: string | null;
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

type Props = {
  snapshot: OnboardingShellSnapshot;
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
                <span className={styles.kickerPath}>
                  · /p/{pharmacy.slug}
                </span>
              ) : null}
            </p>
          ) : (
            <p className={styles.kicker}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Afyvia Pharmacy Network
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
      <nav aria-label="Onboarding journey progress" className={`mb-5 ${styles.journeyStepper}`}>
        <ol className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center" role="list">
          {JOURNEY_CHAPTERS.map((chapter, idx) => {
            const isCurrent = idx === currentChapterIdx;
            const isCompleted = idx < currentChapterIdx;

            return (
              <li
                key={chapter.id}
                aria-current={isCurrent ? "step" : undefined}
                className={`${styles.journeyChapter} ${
                  isCurrent
                    ? styles.journeyChapterCurrent
                    : isCompleted
                      ? styles.journeyChapterCompleted
                      : styles.journeyChapterUpcoming
                }`}
              >
                <span className={styles.journeyChapterBadge}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <span>{idx + 1}</span>
                  ) : (
                    <span className="opacity-75">{idx + 1}</span>
                  )}
                </span>
                <span className={styles.journeyChapterLabel}>
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
