import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import {
  loadPharmacyOnboardingSnapshot,
  resolveActiveJourneyView,
} from "@/app/lib/services/pharmacy-onboarding-journey";
import { OnboardingJourneyShell } from "@/app/components/onboard/journey/OnboardingJourneyShell";
import { AccountStep } from "@/app/components/onboard/journey/AccountStep";
import { EmailVerificationStep } from "@/app/components/onboard/journey/EmailVerificationStep";
import { PharmacyDetailsStep } from "@/app/components/onboard/journey/PharmacyDetailsStep";
import { VerificationInformationStep } from "@/app/components/onboard/journey/VerificationInformationStep";
import { VerificationPaymentStep } from "@/app/components/onboard/journey/VerificationPaymentStep";
import { FinalReviewStep } from "@/app/components/onboard/journey/FinalReviewStep";
import { AdminReviewStatusStep } from "@/app/components/onboard/journey/AdminReviewStatusStep";
import { PharmacySetupStep } from "@/app/components/onboard/journey/PharmacySetupStep";
import { ServiceActivationStep } from "@/app/components/onboard/journey/ServiceActivationStep";
import { ReadyToLaunchStep } from "@/app/components/onboard/journey/ReadyToLaunchStep";
import JoinValuePanel from "@/app/components/onboard/JoinValuePanel";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import { isIntasendConfigured } from "@/app/lib/services/intasend";

import { ClickParticles } from "@/app/components/onboard/cinema/ClickParticles";
import { CinematicSceneWrapper } from "@/app/components/onboard/cinema/CinematicSceneWrapper";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Join as a pharmacy | Afyvia",
  description: "One clear journey from registration to verified pharmacy launch.",
};

type PageProps = {
  searchParams: Promise<{
    stage?: string;
    setupStep?: "hours" | "medicines" | "services" | "profile";
    status?: string;
    payment?: string;
    verified?: string;
    pharmacyId?: string;
  }>;
};

export default async function OnboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getSessionUser().catch(() => null);

  const snapshot = await loadPharmacyOnboardingSnapshot({
    userId: user?.id,
    pharmacyId: params.pharmacyId,
  });

  const { stage, isReviewEdit } = resolveActiveJourneyView(
    snapshot,
    params.stage,
  );
  const intasendConfigured = isIntasendConfigured();

  // If already live and setup complete, take owner directly to admin dashboard
  if (stage === "COMPLETE") {
    redirect("/admin");
  }

  // Stage 1 (New visitor with no pharmacy draft yet): render conversion pitch split with 3D Cinema
  if (stage === "ACCOUNT" && !snapshot.pharmacy) {
    return (
      <div className={styles.frame}>
        <ClickParticles />
        <div className={styles.split}>
          <JoinValuePanel />
          <div id="pharmacy-application" className={styles.work}>
            <CinematicSceneWrapper stageKey="ACCOUNT">
              <AccountStep snapshot={snapshot} />
            </CinematicSceneWrapper>
          </div>
        </div>
      </div>
    );
  }

  // Unified canonical journey container
  return (
    <OnboardingJourneyShell
      snapshot={snapshot}
      activeStage={stage}
      isReviewEdit={isReviewEdit}
    >
      {stage === "ACCOUNT" ? (
        <AccountStep snapshot={snapshot} />
      ) : null}

      {stage === "EMAIL_VERIFICATION" ? (
        <EmailVerificationStep snapshot={snapshot} />
      ) : null}

      {stage === "PHARMACY_DETAILS" ? (
        <PharmacyDetailsStep snapshot={snapshot} isReviewEdit={isReviewEdit} />
      ) : null}

      {stage === "VERIFICATION_INFORMATION" ? (
        <VerificationInformationStep snapshot={snapshot} isReviewEdit={isReviewEdit} />
      ) : null}

      {stage === "VERIFICATION_PAYMENT" ? (
        <VerificationPaymentStep
          snapshot={snapshot}
          isReviewEdit={isReviewEdit}
          paymentAvailable={intasendConfigured}
        />
      ) : null}

      {stage === "FINAL_REVIEW" ? (
        <FinalReviewStep snapshot={snapshot} />
      ) : null}

      {stage === "AWAITING_ADMIN_REVIEW" || stage === "NEEDS_INFORMATION" || stage === "REJECTED" ? (
        <AdminReviewStatusStep snapshot={snapshot} />
      ) : null}

      {stage === "POST_APPROVAL_SETUP" ? (
        <PharmacySetupStep snapshot={snapshot} initialStep={params.setupStep} />
      ) : null}

      {stage === "SERVICE_ACTIVATION" ? (
        <ServiceActivationStep snapshot={snapshot} paymentAvailable={intasendConfigured} />
      ) : null}

      {stage === "READY_TO_LAUNCH" ? (
        <ReadyToLaunchStep snapshot={snapshot} />
      ) : null}
    </OnboardingJourneyShell>
  );
}
