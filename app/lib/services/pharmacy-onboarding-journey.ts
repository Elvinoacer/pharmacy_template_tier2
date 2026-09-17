import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { validCoordinates } from "@/app/lib/proximity";
import {
  loadLatestVerificationProfile,
  loadOwnerSubmissionReadiness,
  type OwnerSubmissionReadiness,
  type VerificationProfile,
} from "@/app/lib/services/pharmacy-verification";
import {
  loadLatestVerificationDocumentDrafts,
  type VerificationDocumentDrafts,
} from "@/app/lib/services/pharmacy-verification-documents";
import { loadPharmacySetup } from "@/app/lib/services/pharmacy-setup";

export type PharmacyStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_info"
  | "approved"
  | "active"
  | "suspended"
  | "rejected";

export type PharmacyOnboardingStage =
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

export type OnboardingChapter =
  | "account"
  | "pharmacy"
  | "verification"
  | "review"
  | "launch";

export type JourneyChapterMeta = {
  id: OnboardingChapter;
  label: string;
  stages: PharmacyOnboardingStage[];
};

export const JOURNEY_CHAPTERS: JourneyChapterMeta[] = [
  { id: "account", label: "Account", stages: ["ACCOUNT", "EMAIL_VERIFICATION"] },
  { id: "pharmacy", label: "Premises", stages: ["PHARMACY_DETAILS"] },
  { id: "verification", label: "Verification", stages: ["VERIFICATION_INFORMATION", "VERIFICATION_PAYMENT", "FINAL_REVIEW"] },
  { id: "review", label: "Review", stages: ["AWAITING_ADMIN_REVIEW", "NEEDS_INFORMATION", "REJECTED"] },
  { id: "launch", label: "Launch", stages: ["POST_APPROVAL_SETUP", "SERVICE_ACTIVATION", "READY_TO_LAUNCH", "COMPLETE"] },
];

export type PharmacyOnboardingSnapshot = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    fullName: string | null;
  } | null;
  pharmacy: {
    id: string;
    slug: string;
    name: string;
    legalName: string | null;
    tagline: string | null;
    description: string | null;
    licenseNumber: string | null;
    licenseDocumentUrl: string | null;
    ppbPremisesNumber: string | null;
    kraPin: string | null;
    status: PharmacyStatus;
    listed: boolean;
    verificationNotes: string | null;
    rejectionReason: string | null;
    verifiedAt: Date | null;
    submittedAt: Date | null;
    goLiveAt: Date | null;
    setupCompletedAt: Date | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    city: string | null;
    county: string | null;
    country: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  verificationProfile: VerificationProfile | null;
  documentDrafts: VerificationDocumentDrafts;
  verificationPayment: {
    paid: boolean;
    waived: boolean;
    totalKes: number;
    invoiceId: string | null;
    invoiceNumber: string | null;
    status: string;
    hasPrepaidBundleCredit: boolean;
    isBundlePaid: boolean;
  };
  promotionGrant: {
    verification: boolean;
    recurringMonths: number;
    promotionName: string | null;
    promotionCode: string | null;
  } | null;
  readiness: OwnerSubmissionReadiness | null;
  setup: {
    hoursOk: boolean;
    medicinesOk: boolean;
    servicesOk: boolean;
    profileOk: boolean;
    subscriptionOk: boolean;
    counts: { medicines: number; services: number };
    medicineDeferred: boolean;
    ready: boolean;
  } | null;
  subscription: {
    active: boolean;
    status: string | null;
    currentPeriodEnd: Date | null;
  } | null;
};

export async function loadPharmacyOnboardingSnapshot(input: {
  userId?: string | null;
  pharmacyId?: string | null;
}): Promise<PharmacyOnboardingSnapshot> {
  const { userId, pharmacyId } = input;

  let user = null;
  if (userId) {
    const dbUser = await prismaUnscoped.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        profile: { select: { fullName: true } },
      },
    });
    if (dbUser) {
      user = {
        id: dbUser.id,
        email: dbUser.email,
        emailVerified: Boolean(dbUser.emailVerified),
        fullName: dbUser.profile?.fullName ?? null,
      };
    }
  }

  let pharmacy = null;
  if (pharmacyId) {
    pharmacy = await prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        id: true,
        slug: true,
        name: true,
        legalName: true,
        tagline: true,
        description: true,
        licenseNumber: true,
        licenseDocumentUrl: true,
        ppbPremisesNumber: true,
        kraPin: true,
        status: true,
        listed: true,
        verificationNotes: true,
        rejectionReason: true,
        verifiedAt: true,
        submittedAt: true,
        goLiveAt: true,
        setupCompletedAt: true,
        email: true,
        phone: true,
        whatsapp: true,
        city: true,
        county: true,
        country: true,
        latitude: true,
        longitude: true,
        ownerUserId: true,
      },
    });
    if (pharmacy && user && pharmacy.ownerUserId !== user.id) {
      // Permission boundary: if user does not own this pharmacy
      pharmacy = null;
    }
  } else if (user) {
    const inProgress = await prismaUnscoped.pharmacy.findFirst({
      where: {
        ownerUserId: user.id,
        goLiveAt: null,
        status: { notIn: ["rejected", "suspended"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        legalName: true,
        tagline: true,
        description: true,
        licenseNumber: true,
        licenseDocumentUrl: true,
        ppbPremisesNumber: true,
        kraPin: true,
        status: true,
        listed: true,
        verificationNotes: true,
        rejectionReason: true,
        verifiedAt: true,
        submittedAt: true,
        goLiveAt: true,
        setupCompletedAt: true,
        email: true,
        phone: true,
        whatsapp: true,
        city: true,
        county: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    });

    pharmacy =
      inProgress ||
      (await prismaUnscoped.pharmacy.findFirst({
        where: { ownerUserId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          legalName: true,
          tagline: true,
          description: true,
          licenseNumber: true,
          licenseDocumentUrl: true,
          ppbPremisesNumber: true,
          kraPin: true,
          status: true,
          listed: true,
          verificationNotes: true,
          rejectionReason: true,
          verifiedAt: true,
          submittedAt: true,
          goLiveAt: true,
          setupCompletedAt: true,
          email: true,
          phone: true,
          whatsapp: true,
          city: true,
          county: true,
          country: true,
          latitude: true,
          longitude: true,
        },
      }));
  }

  if (!pharmacy) {
    return {
      user,
      pharmacy: null,
      verificationProfile: null,
      documentDrafts: { license: null, business: null },
      verificationPayment: {
        paid: false,
        waived: false,
        totalKes: 100,
        invoiceId: null,
        invoiceNumber: null,
        status: "open",
        hasPrepaidBundleCredit: false,
        isBundlePaid: false,
      },
      promotionGrant: null,
      readiness: null,
      setup: null,
      subscription: null,
    };
  }

  const pid = pharmacy.id;

  const [
    profileResult,
    documentDrafts,
    kypInvoice,
    bundleInvoice,
    grant,
    setupData,
    dbSubscription,
    bundleCreditEvent,
    readiness,
  ] = await Promise.all([
    loadLatestVerificationProfile(pid),
    loadLatestVerificationDocumentDrafts(pid),
    withPharmacy(pid, () =>
      prismaUnscoped.invoice.findFirst({
        where: { pharmacyId: pid, number: `KYP-${pid}` },
        select: { id: true, number: true, status: true, totalKes: true },
      }),
    ),
    withPharmacy(pid, () =>
      prismaUnscoped.invoice.findFirst({
        where: { pharmacyId: pid, number: `BUNDLE-${pid}` },
        select: { id: true, number: true, status: true, totalKes: true },
      }),
    ),
    withPharmacy(pid, () =>
      prismaUnscoped.pharmacyPromotionGrant.findUnique({
        where: { pharmacyId: pid },
        include: { promotion: { select: { name: true, code: true } } },
      }),
    ),
    loadPharmacySetup(pid).catch(() => null),
    withPharmacy(pid, () =>
      prismaUnscoped.subscription.findFirst({
        where: { pharmacyId: pid, status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" },
        select: { status: true, currentPeriodEnd: true },
      }),
    ),
    prismaUnscoped.pharmacyOnboardingEvent.findFirst({
      where: { pharmacyId: pid, type: "bundle_prepaid_credit_granted" },
      select: { id: true },
    }),
    loadOwnerSubmissionReadiness(pid).catch(() => null),
  ]);

  const isBundlePaid = bundleInvoice?.status === "paid";
  const isKypPaid = kypInvoice?.status === "paid";
  const isWaived = Boolean(grant?.verification);
  const feePaid = isKypPaid || isBundlePaid || isWaived;

  const hasPrepaidBundleCredit =
    isBundlePaid ||
    Boolean(bundleCreditEvent) ||
    Boolean(grant?.recurringMonths && grant.recurringMonths > 0);

  const activeInvoice = isBundlePaid
    ? bundleInvoice
    : kypInvoice ?? bundleInvoice ?? null;

  const verificationPayment = {
    paid: feePaid,
    waived: isWaived,
    totalKes: activeInvoice ? Number(activeInvoice.totalKes) : isWaived ? 0 : 100,
    invoiceId: activeInvoice?.id ?? null,
    invoiceNumber: activeInvoice?.number ?? null,
    status: feePaid ? "paid" : activeInvoice?.status ?? "open",
    hasPrepaidBundleCredit,
    isBundlePaid,
  };

  const promotionGrant = grant
    ? {
        verification: grant.verification,
        recurringMonths: grant.recurringMonths,
        promotionName: grant.promotion?.name ?? null,
        promotionCode: grant.promotion?.code ?? null,
      }
    : null;

  const check = (key: string) => setupData?.checks.find((item) => item.key === key)?.ok === true;

  const setup = setupData
    ? {
        hoursOk: check("hours"),
        medicinesOk: check("medicines"),
        servicesOk: check("services"),
        profileOk: check("about"),
        subscriptionOk: check("subscription"),
        counts: setupData.counts,
        medicineDeferred: setupData.medicineDeferred,
        ready: setupData.ready,
      }
    : null;

  const subscription = dbSubscription
    ? {
        active: dbSubscription.status === "active" && Boolean(dbSubscription.currentPeriodEnd && dbSubscription.currentPeriodEnd > new Date()),
        status: dbSubscription.status,
        currentPeriodEnd: dbSubscription.currentPeriodEnd,
      }
    : null;

  return {
    user,
    pharmacy,
    verificationProfile: profileResult?.profile ?? null,
    documentDrafts,
    verificationPayment,
    promotionGrant,
    readiness,
    setup,
    subscription,
  };
}

/**
 * Derives the single authoritative minimum required / current stage for the
 * pharmacy applicant based strictly on persisted database facts.
 */
export function resolvePharmacyOnboardingStage(
  snapshot: PharmacyOnboardingSnapshot,
): PharmacyOnboardingStage {
  if (!snapshot.user) {
    return "ACCOUNT";
  }

  if (!snapshot.pharmacy) {
    return "ACCOUNT";
  }

  // Security gate: owner email must be verified before proceeding past account creation.
  if (!snapshot.user.emailVerified) {
    return "EMAIL_VERIFICATION";
  }

  const { pharmacy, verificationProfile, verificationPayment, setup, subscription } = snapshot;

  // Terminal or reviewed application states
  if (pharmacy.status === "rejected") {
    return "REJECTED";
  }

  if (pharmacy.status === "active" && pharmacy.listed && pharmacy.setupCompletedAt) {
    return "COMPLETE";
  }

  if (pharmacy.status === "approved" || pharmacy.status === "active") {
    const storefrontSetupComplete = Boolean(
      setup && setup.hoursOk && setup.medicinesOk && setup.servicesOk && setup.profileOk,
    );

    if (!storefrontSetupComplete) {
      return "POST_APPROVAL_SETUP";
    }

    if (!subscription?.active) {
      return "SERVICE_ACTIVATION";
    }

    return "READY_TO_LAUNCH";
  }

  if (pharmacy.status === "submitted" || pharmacy.status === "under_review") {
    return "AWAITING_ADMIN_REVIEW";
  }

  if (pharmacy.status === "needs_info") {
    return "NEEDS_INFORMATION";
  }

  // Pharmacy is in 'draft' status: check applicant prerequisites sequentially
  const hasPhone = Boolean(pharmacy.phone && pharmacy.phone.trim());
  const hasCity = Boolean(pharmacy.city && pharmacy.city.trim());
  const hasCoordinates =
    pharmacy.latitude != null &&
    pharmacy.longitude != null &&
    validCoordinates(pharmacy.latitude, pharmacy.longitude);

  if (!hasPhone || !hasCity || !hasCoordinates) {
    return "PHARMACY_DETAILS";
  }

  // Verification information: requires authority declaration confirmed
  const hasAuthorityConfirmed = Boolean(verificationProfile?.applicantAuthorityConfirmed);
  if (!verificationProfile || !hasAuthorityConfirmed) {
    return "VERIFICATION_INFORMATION";
  }

  // Verification payment
  if (!verificationPayment.paid && !verificationPayment.waived) {
    return "VERIFICATION_PAYMENT";
  }

  // All prerequisites complete; applicant can review and submit
  return "FINAL_REVIEW";
}

const STAGE_ORDER: Record<PharmacyOnboardingStage, number> = {
  ACCOUNT: 0,
  EMAIL_VERIFICATION: 1,
  PHARMACY_DETAILS: 2,
  VERIFICATION_INFORMATION: 3,
  VERIFICATION_PAYMENT: 4,
  FINAL_REVIEW: 5,
  AWAITING_ADMIN_REVIEW: 6,
  NEEDS_INFORMATION: 6,
  REJECTED: 6,
  POST_APPROVAL_SETUP: 7,
  SERVICE_ACTIVATION: 8,
  READY_TO_LAUNCH: 9,
  COMPLETE: 10,
};

const STAGE_ALIAS_MAP: Record<string, PharmacyOnboardingStage> = {
  account: "ACCOUNT",
  email: "EMAIL_VERIFICATION",
  verify_email: "EMAIL_VERIFICATION",
  details: "PHARMACY_DETAILS",
  premises: "PHARMACY_DETAILS",
  contact: "PHARMACY_DETAILS",
  verification: "VERIFICATION_INFORMATION",
  dossier: "VERIFICATION_INFORMATION",
  licence: "VERIFICATION_INFORMATION",
  payment: "VERIFICATION_PAYMENT",
  billing: "VERIFICATION_PAYMENT",
  review: "FINAL_REVIEW",
  submitted: "AWAITING_ADMIN_REVIEW",
  admin_review: "AWAITING_ADMIN_REVIEW",
  needs_info: "NEEDS_INFORMATION",
  setup: "POST_APPROVAL_SETUP",
  activate: "SERVICE_ACTIVATION",
  service: "SERVICE_ACTIVATION",
  launch: "READY_TO_LAUNCH",
  publish: "READY_TO_LAUNCH",
  complete: "COMPLETE",
};

export function parseStageAlias(alias?: string | null): PharmacyOnboardingStage | null {
  if (!alias) return null;
  const key = alias.trim().toLowerCase();
  return STAGE_ALIAS_MAP[key] ?? null;
}

/**
 * Resolves which stage should actually be rendered in response to user navigation.
 * Guarantees that:
 * - A user CANNOT skip forward to an unearned stage.
 * - An applicant in draft/needs_info CAN revisit earlier completed stages to edit them.
 * - Direct URLs to locked stages safely canonicalize back to the required stage.
 */
export function resolveActiveJourneyView(
  snapshot: PharmacyOnboardingSnapshot,
  requestedStageParam?: string | null,
): {
  stage: PharmacyOnboardingStage;
  isReviewEdit: boolean;
  permittedStages: PharmacyOnboardingStage[];
} {
  const authoritativeCurrentStage = resolvePharmacyOnboardingStage(snapshot);
  const currentRank = STAGE_ORDER[authoritativeCurrentStage];

  // Derive all stages that have been unlocked so far
  const permittedStages = (Object.keys(STAGE_ORDER) as PharmacyOnboardingStage[]).filter(
    (stage) => STAGE_ORDER[stage] <= currentRank,
  );

  const requestedStage = parseStageAlias(requestedStageParam);

  if (!requestedStage) {
    return {
      stage: authoritativeCurrentStage,
      isReviewEdit: false,
      permittedStages,
    };
  }

  // Disallow skipping ahead
  const requestedRank = STAGE_ORDER[requestedStage];
  if (requestedRank > currentRank) {
    return {
      stage: authoritativeCurrentStage,
      isReviewEdit: false,
      permittedStages,
    };
  }

  // Check editable stages during draft or needs_info
  const isDraftOrNeedsInfo =
    snapshot.pharmacy && ["draft", "needs_info"].includes(snapshot.pharmacy.status);

  if (isDraftOrNeedsInfo) {
    const editableStages: PharmacyOnboardingStage[] = [
      "PHARMACY_DETAILS",
      "VERIFICATION_INFORMATION",
      "VERIFICATION_PAYMENT",
      "FINAL_REVIEW",
    ];

    if (editableStages.includes(requestedStage)) {
      const isReviewEdit =
        (authoritativeCurrentStage === "FINAL_REVIEW" ||
          authoritativeCurrentStage === "NEEDS_INFORMATION") &&
        requestedStage !== authoritativeCurrentStage;
      return {
        stage: requestedStage,
        isReviewEdit,
        permittedStages,
      };
    }
  }

  // In post-approval:
  if (snapshot.pharmacy && ["approved", "active"].includes(snapshot.pharmacy.status)) {
    if (authoritativeCurrentStage === "SERVICE_ACTIVATION" && requestedStage === "POST_APPROVAL_SETUP") {
      return { stage: "POST_APPROVAL_SETUP", isReviewEdit: true, permittedStages };
    }
    if (authoritativeCurrentStage === "READY_TO_LAUNCH") {
      if (requestedStage === "POST_APPROVAL_SETUP" || requestedStage === "SERVICE_ACTIVATION") {
        return { stage: requestedStage, isReviewEdit: true, permittedStages };
      }
    }
  }

  return {
    stage: authoritativeCurrentStage,
    isReviewEdit: false,
    permittedStages,
  };
}

export function getChapterForStage(stage: PharmacyOnboardingStage): OnboardingChapter {
  for (const chapter of JOURNEY_CHAPTERS) {
    if (chapter.stages.includes(stage)) return chapter.id;
  }
  return "account";
}
