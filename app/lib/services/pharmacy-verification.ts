import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export const VERIFICATION_PROFILE_EVENT = "verification_profile_saved";
export const VERIFICATION_CHECKLIST_EVENT = "verification_checklist_saved";
export const VERIFICATION_INPUT_CHANGED_EVENT = "verification_input_changed";

export type VerificationProfile = {
  facilityType: string | null;
  physicalAddress: string | null;
  licenseExpiryDate: string | null;
  licenseQrPayload: string | null;
  superintendentName: string | null;
  superintendentRegistrationNumber: string | null;
  superintendentPracticeLicenseNumber: string | null;
  ownershipType: string | null;
  businessRegistrationNumber: string | null;
  businessDocumentUrl: string | null;
  applicantAuthorityConfirmed: boolean;
  declaredAt: string | null;
};

export type VerificationChecklist = {
  ppbRegistryMatched: boolean;
  licenceActive: boolean;
  licenceDocumentMatched: boolean;
  practitionerMatched: boolean;
  locationMatched: boolean;
  ownershipVerified: boolean;
  applicantAuthorityVerified: boolean;
  contactVerified: boolean;
  noCriticalMismatch: boolean;
  ppbRegistrySource: string | null;
  practitionerRegistrySource: string | null;
  checkedAt: string | null;
  notes: string | null;
};

export type OwnerSubmissionReadiness = {
  ready: boolean;
  missing: string[];
  profile: VerificationProfile | null;
  profileEventCreatedAt: Date | null;
};

export type ApprovalReadiness = {
  ready: boolean;
  profileMissing: string[];
  checklistMissing: string[];
  checklistStale: boolean;
  riskScore: number;
  profile: VerificationProfile | null;
  checklist: VerificationChecklist | null;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function licenceExpired(dateInput: string | null) {
  if (!dateInput) return false;
  const parsed = new Date(`${dateInput}T23:59:59+03:00`);
  return Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now();
}

function latestDate(values: Array<Date | null | undefined>) {
  return values
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

export function parseVerificationProfile(meta: unknown): VerificationProfile {
  const row = asRecord(meta);
  return {
    facilityType: stringValue(row.facilityType),
    physicalAddress: stringValue(row.physicalAddress),
    licenseExpiryDate: stringValue(row.licenseExpiryDate),
    licenseQrPayload: stringValue(row.licenseQrPayload),
    superintendentName: stringValue(row.superintendentName),
    superintendentRegistrationNumber: stringValue(row.superintendentRegistrationNumber),
    superintendentPracticeLicenseNumber: stringValue(row.superintendentPracticeLicenseNumber),
    ownershipType: stringValue(row.ownershipType),
    businessRegistrationNumber: stringValue(row.businessRegistrationNumber),
    businessDocumentUrl: stringValue(row.businessDocumentUrl),
    applicantAuthorityConfirmed: booleanValue(row.applicantAuthorityConfirmed),
    declaredAt: stringValue(row.declaredAt),
  };
}

export function parseVerificationChecklist(meta: unknown): VerificationChecklist {
  const row = asRecord(meta);
  return {
    ppbRegistryMatched: booleanValue(row.ppbRegistryMatched),
    licenceActive: booleanValue(row.licenceActive),
    licenceDocumentMatched: booleanValue(row.licenceDocumentMatched),
    practitionerMatched: booleanValue(row.practitionerMatched),
    locationMatched: booleanValue(row.locationMatched),
    ownershipVerified: booleanValue(row.ownershipVerified),
    applicantAuthorityVerified: booleanValue(row.applicantAuthorityVerified),
    contactVerified: booleanValue(row.contactVerified),
    noCriticalMismatch: booleanValue(row.noCriticalMismatch),
    ppbRegistrySource: stringValue(row.ppbRegistrySource),
    practitionerRegistrySource: stringValue(row.practitionerRegistrySource),
    checkedAt: stringValue(row.checkedAt),
    notes: stringValue(row.notes),
  };
}

export async function loadLatestVerificationProfile(pharmacyId: string) {
  const event = await prismaUnscoped.pharmacyOnboardingEvent.findFirst({
    where: { pharmacyId, type: VERIFICATION_PROFILE_EVENT },
    orderBy: { createdAt: "desc" },
  });
  return event ? { event, profile: parseVerificationProfile(event.meta) } : null;
}

export async function loadLatestVerificationChecklist(pharmacyId: string) {
  const [event, latestProfile, latestInputChange] = await Promise.all([
    prismaUnscoped.pharmacyOnboardingEvent.findFirst({
      where: { pharmacyId, type: VERIFICATION_CHECKLIST_EVENT },
      orderBy: { createdAt: "desc" },
    }),
    prismaUnscoped.pharmacyOnboardingEvent.findFirst({
      where: { pharmacyId, type: VERIFICATION_PROFILE_EVENT },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prismaUnscoped.pharmacyOnboardingEvent.findFirst({
      where: { pharmacyId, type: VERIFICATION_INPUT_CHANGED_EVENT },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (!event) return null;
  const parsed = parseVerificationChecklist(event.meta);
  const latestTrustInputAt = latestDate([
    latestProfile?.createdAt,
    latestInputChange?.createdAt,
  ]);
  const stale = Boolean(
    latestTrustInputAt && event.createdAt.getTime() < latestTrustInputAt.getTime(),
  );

  return {
    event,
    checklist: stale ? null : parsed,
    previousChecklist: parsed,
    stale,
    latestTrustInputAt,
  };
}

export function profileMissingItems(input: {
  pharmacy: {
    licenseNumber: string | null;
    licenseDocumentUrl: string | null;
    ppbPremisesNumber: string | null;
    city: string | null;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  profile: VerificationProfile | null;
  ownerEmailVerified: boolean;
}) {
  const missing: string[] = [];
  const { pharmacy, profile } = input;

  if (!pharmacy.licenseNumber) missing.push("PPB / premises licence number");
  if (!pharmacy.ppbPremisesNumber) missing.push("PPB premises/facility number");
  if (!pharmacy.licenseDocumentUrl) missing.push("current PPB licence image");
  if (!pharmacy.city) missing.push("pharmacy city");
  if (!pharmacy.phone) missing.push("public phone number");
  if (pharmacy.latitude == null || pharmacy.longitude == null) missing.push("precise premises map pin");
  if (!input.ownerEmailVerified) missing.push("verified owner email address");

  if (!profile) {
    missing.push("regulatory verification dossier");
    return missing;
  }

  if (!profile.facilityType) missing.push("facility type");
  if (!profile.physicalAddress) missing.push("physical premises address");
  if (!profile.licenseExpiryDate) missing.push("licence expiry date");
  else if (licenceExpired(profile.licenseExpiryDate)) missing.push("current unexpired PPB premises licence");
  if (!profile.superintendentName) missing.push("superintendent / responsible professional name");
  if (!profile.superintendentRegistrationNumber) missing.push("professional PPB registration/enrolment number");
  if (!profile.superintendentPracticeLicenseNumber) missing.push("current professional practice licence number");
  if (!profile.ownershipType) missing.push("business ownership type");
  if (!profile.businessRegistrationNumber) missing.push("business registration number");
  if (!profile.businessDocumentUrl) missing.push("business registration evidence");
  if (!profile.applicantAuthorityConfirmed) missing.push("applicant authority declaration");

  return missing;
}

export async function loadOwnerSubmissionReadiness(pharmacyId: string): Promise<OwnerSubmissionReadiness> {
  const [pharmacy, profileResult] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        licenseNumber: true,
        licenseDocumentUrl: true,
        ppbPremisesNumber: true,
        city: true,
        phone: true,
        latitude: true,
        longitude: true,
        owner: { select: { emailVerified: true } },
      },
    }),
    loadLatestVerificationProfile(pharmacyId),
  ]);

  if (!pharmacy) {
    return {
      ready: false,
      missing: ["pharmacy application"],
      profile: null,
      profileEventCreatedAt: null,
    };
  }
  const profile = profileResult?.profile ?? null;
  const missing = profileMissingItems({
    pharmacy,
    profile,
    ownerEmailVerified: Boolean(pharmacy.owner?.emailVerified),
  });
  return {
    ready: missing.length === 0,
    missing,
    profile,
    profileEventCreatedAt: profileResult?.event.createdAt ?? null,
  };
}

export const REQUIRED_REVIEW_CHECKS: Array<{
  key: keyof Pick<
    VerificationChecklist,
    | "ppbRegistryMatched"
    | "licenceActive"
    | "licenceDocumentMatched"
    | "practitionerMatched"
    | "locationMatched"
    | "ownershipVerified"
    | "applicantAuthorityVerified"
    | "contactVerified"
    | "noCriticalMismatch"
  >;
  label: string;
}> = [
  { key: "ppbRegistryMatched", label: "PPB facility register match" },
  { key: "licenceActive", label: "PPB premises licence is current/active" },
  { key: "licenceDocumentMatched", label: "Uploaded licence matches submitted facility/licence data" },
  { key: "practitionerMatched", label: "Responsible professional is found and current on the PPB register" },
  { key: "locationMatched", label: "Physical address and map pin are consistent with the licensed premises" },
  { key: "ownershipVerified", label: "Business registration / ownership evidence is consistent" },
  { key: "applicantAuthorityVerified", label: "Applicant is authorized to represent the pharmacy" },
  { key: "contactVerified", label: "Owner/contact identity is verified" },
  { key: "noCriticalMismatch", label: "No unresolved critical identity or regulatory mismatch" },
];

export function checklistMissingItems(checklist: VerificationChecklist | null) {
  if (!checklist) return ["reviewer verification checklist"];
  const missing = REQUIRED_REVIEW_CHECKS.filter(({ key }) => !checklist[key]).map(({ label }) => label);
  if (!checklist.ppbRegistrySource) missing.push("PPB facility-register evidence source");
  if (!checklist.practitionerRegistrySource) missing.push("PPB practitioner-register evidence source");
  if (!checklist.checkedAt) missing.push("review timestamp");
  if (!checklist.notes) missing.push("reviewer evidence notes");
  return missing;
}

export function verificationRiskScore(checklist: VerificationChecklist | null) {
  if (!checklist) return 100;
  const failed = REQUIRED_REVIEW_CHECKS.filter(({ key }) => !checklist[key]).length;
  return Math.round((failed / REQUIRED_REVIEW_CHECKS.length) * 100);
}

export async function loadApprovalReadiness(pharmacyId: string): Promise<ApprovalReadiness> {
  const [ownerReadiness, checklistResult] = await Promise.all([
    loadOwnerSubmissionReadiness(pharmacyId),
    loadLatestVerificationChecklist(pharmacyId),
  ]);

  const checklist = checklistResult?.checklist ?? null;
  const checklistStale = checklistResult?.stale ?? false;
  const checklistMissing = checklistMissingItems(checklist);
  const fee = await prismaUnscoped.invoice.findUnique({ where: { number: `KYP-${pharmacyId}` } });
  if (fee?.status !== "paid") checklistMissing.push("verification fee paid or promotional waiver allocated");
  if (checklistStale) {
    checklistMissing.push("reviewer checklist must be repeated after the latest pharmacy evidence change");
  }

  return {
    ready: ownerReadiness.missing.length === 0 && checklistMissing.length === 0,
    profileMissing: ownerReadiness.missing,
    checklistMissing,
    checklistStale,
    riskScore: checklistStale ? 100 : verificationRiskScore(checklist),
    profile: ownerReadiness.profile,
    checklist,
  };
}
