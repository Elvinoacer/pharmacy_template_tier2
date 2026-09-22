import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { sendDelivery, type DeliveryResult } from "@/app/lib/services/delivery";
import { loadLatestVerificationProfile } from "@/app/lib/services/pharmacy-verification";
import { loadLatestVerificationDocumentDrafts } from "@/app/lib/services/pharmacy-verification-documents";

export type PharmacyApplicationNotificationKind = "submitted" | "resubmitted";

type PlatformReviewNotificationResult = DeliveryResult & {
  recipient: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

function reviewRecipient() {
  return (
    process.env.PLATFORM_APPLICATION_REVIEW_EMAIL?.trim() ||
    "omondielvin@gmail.com"
  );
}

function text(value: string | null | undefined, fallback = "Not provided") {
  const cleaned = value?.trim();
  return cleaned || fallback;
}

function formatSubmittedAt(value: Date | null | undefined) {
  if (!value) return "Just submitted";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(value);
}

function documentLine(
  label: string,
  available: boolean,
  href: string,
) {
  return available
    ? `- **${label}:** Provided · [Open secure evidence](${href})`
    : `- **${label}:** Not provided`;
}

export async function notifyPlatformOfPharmacyApplication(
  pharmacyId: string,
  kind: PharmacyApplicationNotificationKind = "submitted",
): Promise<PlatformReviewNotificationResult> {
  const [pharmacy, verification, drafts, invoices, grant] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        id: true,
        slug: true,
        name: true,
        legalName: true,
        description: true,
        licenseNumber: true,
        licenseDocumentUrl: true,
        ppbPremisesNumber: true,
        email: true,
        phone: true,
        whatsapp: true,
        city: true,
        county: true,
        country: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        submittedAt: true,
        ownerUserId: true,
        owner: {
          select: {
            email: true,
            emailVerified: true,
            profile: {
              select: {
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
    loadLatestVerificationProfile(pharmacyId),
    loadLatestVerificationDocumentDrafts(pharmacyId),
    prismaUnscoped.invoice.findMany({
      where: {
        pharmacyId,
        number: { in: [`KYP-${pharmacyId}`, `BUNDLE-${pharmacyId}`] },
      },
      select: { number: true, status: true },
    }),
    prismaUnscoped.pharmacyPromotionGrant.findUnique({
      where: { pharmacyId },
      select: {
        verification: true,
        verificationDiscountKes: true,
      },
    }),
  ]);

  const recipient = reviewRecipient();

  if (!pharmacy) {
    return {
      status: "failed",
      recipient,
      error: "Pharmacy application no longer exists.",
    };
  }

  const base = appUrl();
  const profile = verification?.profile ?? null;
  const kyp = invoices.find((invoice) => invoice.number === `KYP-${pharmacyId}`);
  const bundle = invoices.find((invoice) => invoice.number === `BUNDLE-${pharmacyId}`);
  const verificationCovered =
    kyp?.status === "paid" ||
    bundle?.status === "paid" ||
    Boolean(
      grant &&
        (Number(grant.verificationDiscountKes) >= 100 ||
          (Number(grant.verificationDiscountKes) === 0 && grant.verification)),
    );

  const licenceAvailable = Boolean(
    drafts.license?.reference || pharmacy.licenseDocumentUrl,
  );
  const businessAvailable = Boolean(
    drafts.business?.reference || profile?.businessDocumentUrl,
  );

  const location =
    [profile?.physicalAddress, pharmacy.city, pharmacy.county, pharmacy.country]
      .filter(Boolean)
      .join(", ") || "Not provided";

  const coordinates =
    pharmacy.latitude != null && pharmacy.longitude != null
      ? `${pharmacy.latitude.toFixed(6)}, ${pharmacy.longitude.toFixed(6)}`
      : "Not provided";

  const ownerName = text(pharmacy.owner?.profile?.fullName, "Owner name not provided");
  const ownerEmail = text(pharmacy.owner?.email);
  const ownerPhone = text(pharmacy.owner?.profile?.phone, pharmacy.phone || "Not provided");

  const reviewUrl = `${base}/platform/pharmacies/${pharmacy.id}/verification`;
  const applicationUrl = `${base}/platform/pharmacies/${pharmacy.id}`;
  const storefrontUrl = `${base}/p/${pharmacy.slug}`;
  const licenceUrl = `${base}/api/onboard/verification-documents?pharmacyId=${encodeURIComponent(pharmacy.id)}&kind=license`;
  const businessUrl = `${base}/api/onboard/verification-documents?pharmacyId=${encodeURIComponent(pharmacy.id)}&kind=business`;

  const actionLabel =
    kind === "resubmitted" ? "resubmitted for verification" : "submitted for verification";

  const body = [
    `# Pharmacy ${actionLabel}`,
    "",
    `**${pharmacy.name}** has ${actionLabel} on Afyvia and is waiting for platform review.`,
    "",
    "## Pharmacy",
    `- **Trading name:** ${pharmacy.name}`,
    `- **Legal name:** ${text(pharmacy.legalName)}`,
    `- **Application ID:** \`${pharmacy.id}\``,
    `- **Public slug:** /p/${pharmacy.slug}`,
    `- **Submitted:** ${formatSubmittedAt(pharmacy.submittedAt)}`,
    `- **Description:** ${text(pharmacy.description)}`,
    "",
    "## Applicant / owner",
    `- **Name:** ${ownerName}`,
    `- **Account email:** ${ownerEmail}`,
    `- **Email verified:** ${pharmacy.owner?.emailVerified ? "Yes" : "No"}`,
    `- **Owner phone:** ${ownerPhone}`,
    "",
    "## Pharmacy contact",
    `- **Public email:** ${text(pharmacy.email)}`,
    `- **Phone:** ${text(pharmacy.phone)}`,
    `- **WhatsApp:** ${text(pharmacy.whatsapp)}`,
    "",
    "## Premises & regulatory details",
    `- **Location:** ${location}`,
    `- **Map coordinates:** ${coordinates}`,
    `- **Facility type:** ${text(profile?.facilityType)}`,
    `- **PPB premises / licence number:** ${text(pharmacy.ppbPremisesNumber || pharmacy.licenseNumber)}`,
    `- **Licence expiry:** ${text(profile?.licenseExpiryDate)}`,
    `- **Superintendent / responsible professional:** ${text(profile?.superintendentName)}`,
    `- **Professional registration number:** ${text(profile?.superintendentRegistrationNumber)}`,
    `- **Practice licence number:** ${text(profile?.superintendentPracticeLicenseNumber)}`,
    `- **Ownership type:** ${text(profile?.ownershipType)}`,
    `- **Business registration number:** ${text(profile?.businessRegistrationNumber)}`,
    `- **Applicant authority declared:** ${profile?.applicantAuthorityConfirmed ? "Yes" : "No"}`,
    "",
    "## Submitted evidence",
    documentLine("Premises / pharmacy licence", licenceAvailable, licenceUrl),
    documentLine("Business registration evidence", businessAvailable, businessUrl),
    "",
    "## Verification payment",
    `- **Verification fee:** ${verificationCovered ? "Paid / covered by promotion or waiver" : "Not confirmed"}`,
    `- **KYP invoice:** ${kyp?.status || "Not found"}`,
    `- **Bundle invoice:** ${bundle?.status || "Not found"}`,
    "",
    "Private verification documents are intentionally not attached to this email. Open them through the authenticated platform review screen.",
    "",
    `[Review and verify ${pharmacy.name}](${reviewUrl})`,
    "",
    `[Open application overview](${applicationUrl})`,
    "",
    `[Open pharmacy storefront](${storefrontUrl})`,
    "",
    "— Afyvia Network",
  ].join("\n");

  try {
    const result = await sendDelivery(
      {
        channel: "email",
        purpose: "transactional",
        recipient: { email: recipient },
        subject:
          kind === "resubmitted"
            ? `Pharmacy resubmitted for verification — ${pharmacy.name}`
            : `New pharmacy verification application — ${pharmacy.name}`,
        body,
      },
      { platformSender: true },
    );

    if (result.status === "failed") {
      console.error("[onboard] platform review notification failed", {
        pharmacyId,
        recipient,
        error: result.error,
      });
    } else {
      console.info("[onboard] platform review notification sent", {
        pharmacyId,
        recipient,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        kind,
      });
    }

    return { ...result, recipient };
  } catch (error) {
    console.error("[onboard] platform review notification threw", {
      pharmacyId,
      recipient,
      error,
    });
    return {
      status: "failed",
      recipient,
      error: "Platform reviewer notification could not be sent.",
    };
  }
}
