import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export const VERIFICATION_PROFILE_EVENT = "verification_profile_saved";
export const VERIFICATION_CHECKLIST_EVENT = "verification_checklist_saved";

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

export type ApprovalReadiness = {
  ready: boolean;
  profileMissing: string[];
  checklistMissing: string[];
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
  const event = await prismaUnscoped.pharmacyOnboardingEvent.findFirst({
    where: { pharmacyId, type: VERIFICATION_CHECKLIST_EVENT },
    orderBy: { createdAt: "desc" },
  });
  return event ? { event, checklist: parseVerificationChecklist(event.meta) } : null;
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
  if (!profile.superintendentName) missing.push("superintendent / responsible professional name");
  if (!profile.superintendentRegistrationNumber) missing.push("professional PPB registration/enrolment number");
  if (!profile.superintendentPracticeLicenseNumber) missing.push("current professional practice licence number");
  if (!profile.ownershipType) missing.push("business ownership type");
  if (!profile.businessRegistrationNumber) missing.push("business registration number");
  if (!profile.businessDocumentUrl) missing.push("business registration evidence");
  if (!profile.applicantAuthorityConfirmed) missing.push("applicant authority declaration");

  return missing;
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
  return REQUIRED_REVIEW_CHECKS.filter(({ key }) => !checklist[key]).map(({ label }) => label);
}

export function verificationRiskScore(checklist: VerificationChecklist | null) {
  if (!checklist) return 100;
  const failed = REQUIRED_REVIEW_CHECKS.filter(({ key }) => !checklist[key]).length;
  return Math.round((failed / REQUIRED_REVIEW_CHECKS.length) * 100);
}

export async function loadApprovalReadiness(pharmacyId: string): Promise<ApprovalReadiness> {
  const [pharmacy, profileResult, checklistResult] = await Promise.all([
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
    loadLatestVerificationChecklist(pharmacyId),
  ]);

  if (!pharmacy) {
    return {
      ready: false,
      profileMissing: ["pharmacy application"],
      checklistMissing: ["reviewer verification checklist"],
      riskScore: 100,
      profile: null,
      checklist: null,
    };
  }

  const profile = profileResult?.profile ?? null;
  const checklist = checklistResult?.checklist ?? null;
  const profileMissing = profileMissingItems({
    pharmacy,
    profile,
    ownerEmailVerified: Boolean(pharmacy.owner?.emailVerified),
  });
  const checklistMissing = checklistMissingItems(checklist);

  return {
    ready: profileMissing.length === 0 && checklistMissing.length === 0,
    profileMissing,
    checklistMissing,
    riskScore: verificationRiskScore(checklist),
    profile,
    checklist,
  };
}
