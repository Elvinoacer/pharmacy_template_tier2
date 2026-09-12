import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { sendDelivery } from "@/app/lib/services/delivery";
import {
  parseVerificationProfile,
  VERIFICATION_PROFILE_EVENT,
} from "@/app/lib/services/pharmacy-verification";

function nairobiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

/**
 * Remove network trust when a previously approved pharmacy's submitted PPB
 * premises licence reaches its expiry date. The pharmacy is moved to
 * `needs_info`, unlisted, and must provide renewed evidence and undergo a fresh
 * reviewer checklist before approval can be restored.
 */
export async function enforceExpiredPharmacyLicences(limit = 100) {
  const take = Math.max(1, Math.min(limit, 500));
  const today = nairobiDateKey();
  const pharmacies = await prismaUnscoped.pharmacy.findMany({
    where: { status: { in: ["approved", "active"] } },
    orderBy: { verifiedAt: "asc" },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      ownerUserId: true,
      owner: {
        select: {
          email: true,
          profile: { select: { fullName: true } },
        },
      },
      onboardingEvents: {
        where: { type: VERIFICATION_PROFILE_EVENT },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { meta: true, createdAt: true },
      },
    },
  });

  let expired = 0;
  let notificationsFailed = 0;

  for (const pharmacy of pharmacies) {
    const event = pharmacy.onboardingEvents[0];
    if (!event) continue;
    const profile = parseVerificationProfile(event.meta);
    const expiryDate = profile.licenseExpiryDate;
    if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || expiryDate >= today) continue;

    await prismaUnscoped.$transaction([
      prismaUnscoped.pharmacy.update({
        where: { id: pharmacy.id },
        data: {
          status: "needs_info",
          listed: false,
          verifiedAt: null,
          verifiedById: null,
          verificationNotes: `PPB premises licence expired on ${expiryDate}. Renewed regulatory evidence and re-verification are required.`,
        },
      }),
      prismaUnscoped.pharmacyOnboardingEvent.create({
        data: {
          pharmacyId: pharmacy.id,
          actorId: null,
          type: "verification_expired",
          message: `PPB premises licence expired on ${expiryDate}; pharmacy requires re-verification`,
          meta: {
            expiryDate,
            detectedAt: new Date().toISOString(),
            sourceProfileCreatedAt: event.createdAt.toISOString(),
            automatic: true,
          },
        },
      }),
    ]);

    await recordAuditRequired({
      actorId: null,
      action: "pharmacy.verification_expired",
      resource: "pharmacy",
      resourceId: pharmacy.id,
      tenantId: pharmacy.id,
      reason: `PPB premises licence expired on ${expiryDate}`,
      details: { expiryDate, automatic: true },
    });

    expired++;

    const email = pharmacy.owner?.email || pharmacy.email;
    if (email) {
      const firstName = pharmacy.owner?.profile?.fullName?.trim().split(/\s+/)[0] || "there";
      const delivery = await sendDelivery({
        channel: "email",
        purpose: "transactional",
        recipient: { email },
        subject: `${pharmacy.name} requires PPB licence re-verification`,
        body: [
          `Hi ${firstName},`,
          "",
          `The PPB premises licence evidence on file for **${pharmacy.name}** expired on ${expiryDate}.`,
          "",
          "The pharmacy has been temporarily removed from public network listing until renewed regulatory evidence is reviewed.",
          "",
          `Update the pharmacy verification dossier: ${appUrl()}/onboard/verification?pharmacyId=${pharmacy.id}`,
          "",
          "Once the renewed dossier is submitted, the platform verification team will repeat the PPB and responsible-professional checks before restoring verified status.",
          "",
          "— Aether Network",
        ].join("\n"),
      });
      if (delivery.status === "failed") {
        notificationsFailed++;
        console.error("[verification expiry] owner notification failed", pharmacy.id, delivery.error);
      }
    }
  }

  return {
    scanned: pharmacies.length,
    expired,
    notificationsFailed,
    today,
    capped: pharmacies.length === take,
  };
}
