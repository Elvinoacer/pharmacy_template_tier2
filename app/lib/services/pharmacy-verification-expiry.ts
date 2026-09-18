import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { sendDelivery } from "@/app/lib/services/delivery";
import { VERIFICATION_PROFILE_EVENT } from "@/app/lib/services/pharmacy-verification";

type ExpiredPharmacyRow = {
  id: string;
  name: string;
  email: string | null;
  ownerUserId: string | null;
  expiryDate: string;
  profileCreatedAt: Date;
};

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
 * premises licence reaches its expiry date. The query filters expiry in
 * PostgreSQL instead of scanning the first N pharmacies, so a large network
 * cannot starve later tenants from re-verification enforcement.
 */
export async function enforceExpiredPharmacyLicences(limit = 100) {
  const take = Math.max(1, Math.min(limit, 500));
  const today = nairobiDateKey();

  const pharmacies = await prismaUnscoped.$queryRaw<ExpiredPharmacyRow[]>`
    SELECT
      p."id",
      p."name",
      p."email",
      p."owner_user_id" AS "ownerUserId",
      profile."meta"->>'licenseExpiryDate' AS "expiryDate",
      profile."created_at" AS "profileCreatedAt"
    FROM "pharmacies" p
    JOIN LATERAL (
      SELECT e."meta", e."created_at"
      FROM "pharmacy_onboarding_events" e
      WHERE e."pharmacy_id" = p."id"
        AND e."type" = ${VERIFICATION_PROFILE_EVENT}
      ORDER BY e."created_at" DESC
      LIMIT 1
    ) profile ON true
    WHERE p."status"::text IN ('approved', 'active')
      AND CASE
        WHEN COALESCE(profile."meta"->>'licenseExpiryDate', '') ~ '^\\d{4}-\\d{2}-\\d{2}$'
          THEN (profile."meta"->>'licenseExpiryDate')::date
            < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Nairobi')::date
        ELSE false
      END
    ORDER BY (profile."meta"->>'licenseExpiryDate')::date ASC, p."id" ASC
    LIMIT ${take}
  `;

  let expired = 0;
  let notificationsFailed = 0;

  for (const pharmacy of pharmacies) {
    const expiryDate = pharmacy.expiryDate;

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
            sourceProfileCreatedAt: pharmacy.profileCreatedAt.toISOString(),
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

    const owner = pharmacy.ownerUserId
      ? await prismaUnscoped.user.findUnique({
          where: { id: pharmacy.ownerUserId },
          select: {
            email: true,
            profile: { select: { fullName: true } },
          },
        })
      : null;
    const email = owner?.email || pharmacy.email;
    if (email) {
      const firstName = owner?.profile?.fullName?.trim().split(/\s+/)[0] || "there";
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
          "— Afyvia Network",
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
