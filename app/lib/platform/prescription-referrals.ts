import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT } from "@/app/lib/platform/plan-policy";

export const PRESCRIPTION_REFERRAL_USAGE_METRIC = "marketplace_prescription_referral";
export const PRESCRIPTION_REFERRAL_OVERFLOW_METRIC = "marketplace_prescription_referral_overflow";

export type PrescriptionReferralUsage = {
  period: string;
  premium: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  overflowed: number;
};

export type PrescriptionReferralAlternative = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  county: string | null;
  premium: boolean;
};

function periodFor(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || String(date.getUTCFullYear());
  const month = parts.find((part) => part.type === "month")?.value || String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function premiumInTransaction(
  tx: Prisma.TransactionClient,
  pharmacyId: string,
  now: Date,
) {
  return Boolean(await tx.subscription.findFirst({
    where: {
      pharmacyId,
      currentPeriodEnd: { gt: now },
      OR: [
        { status: "active", currentPeriodStart: { lte: now } },
        { status: "trialing", trialEndsAt: null },
        { status: "trialing", trialEndsAt: { gt: now } },
      ],
    },
    select: { id: true },
  }));
}

export async function getPrescriptionReferralUsage(
  pharmacyId: string,
  date = new Date(),
): Promise<PrescriptionReferralUsage> {
  const period = periodFor(date);
  const now = date;
  return withPlatformBypass(async () => {
    const [subscription, usedAgg, overflowAgg] = await Promise.all([
      prismaUnscoped.subscription.findFirst({
        where: {
          pharmacyId,
          currentPeriodEnd: { gt: now },
          OR: [
            { status: "active", currentPeriodStart: { lte: now } },
            { status: "trialing", trialEndsAt: null },
            { status: "trialing", trialEndsAt: { gt: now } },
          ],
        },
        select: { id: true },
      }),
      prismaUnscoped.usageRecord.aggregate({
        where: { pharmacyId, metric: PRESCRIPTION_REFERRAL_USAGE_METRIC, period },
        _sum: { quantity: true },
      }),
      prismaUnscoped.usageRecord.aggregate({
        where: { pharmacyId, metric: PRESCRIPTION_REFERRAL_OVERFLOW_METRIC, period },
        _sum: { quantity: true },
      }),
    ]);

    const premium = Boolean(subscription);
    const used = usedAgg._sum.quantity ?? 0;
    const overflowed = overflowAgg._sum.quantity ?? 0;
    return {
      period,
      premium,
      used,
      limit: premium ? null : FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT,
      remaining: premium
        ? null
        : Math.max(0, FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT - used),
      overflowed,
    };
  });
}

export async function reservePrescriptionReferralSlot(
  pharmacyId: string,
  eventId: string = randomUUID(),
): Promise<{ accepted: boolean; eventId: string; usage: PrescriptionReferralUsage }> {
  const period = periodFor();
  const now = new Date();

  return withPlatformBypass(() =>
    prismaUnscoped.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`prescription-referral:${pharmacyId}:${period}`}))`;

      const premium = await premiumInTransaction(tx, pharmacyId, now);
      const aggregate = await tx.usageRecord.aggregate({
        where: { pharmacyId, metric: PRESCRIPTION_REFERRAL_USAGE_METRIC, period },
        _sum: { quantity: true },
      });
      const used = aggregate._sum.quantity ?? 0;
      const overflowAgg = await tx.usageRecord.aggregate({
        where: { pharmacyId, metric: PRESCRIPTION_REFERRAL_OVERFLOW_METRIC, period },
        _sum: { quantity: true },
      });
      const overflowed = overflowAgg._sum.quantity ?? 0;

      if (!premium && used >= FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT) {
        return {
          accepted: false,
          eventId,
          usage: {
            period,
            premium: false,
            used,
            limit: FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT,
            remaining: 0,
            overflowed,
          },
        };
      }

      await tx.usageRecord.create({
        data: {
          pharmacyId,
          metric: PRESCRIPTION_REFERRAL_USAGE_METRIC,
          quantity: 1,
          period,
          eventId,
          billable: false,
          unit: "referral",
          meta: { source: "afyvia_marketplace" },
        },
      });

      return {
        accepted: true,
        eventId,
        usage: {
          period,
          premium,
          used: used + 1,
          limit: premium ? null : FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT,
          remaining: premium
            ? null
            : Math.max(0, FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT - used - 1),
          overflowed,
        },
      };
    }),
  );
}

export async function releasePrescriptionReferralSlot(
  pharmacyId: string,
  eventId: string,
): Promise<void> {
  await withPlatformBypass(() =>
    prismaUnscoped.usageRecord.deleteMany({
      where: {
        pharmacyId,
        eventId,
        metric: PRESCRIPTION_REFERRAL_USAGE_METRIC,
      },
    }),
  );
}

export async function recordPrescriptionReferralOverflow(
  pharmacyId: string,
  eventId: string,
): Promise<void> {
  const period = periodFor();
  await withPlatformBypass(() =>
    prismaUnscoped.$transaction(async (tx) => {
      const marker = `overflow:${eventId}`;
      const existing = await tx.usageRecord.findFirst({
        where: { pharmacyId, eventId: marker },
        select: { id: true },
      });
      if (existing) return;

      await tx.usageRecord.create({
        data: {
          pharmacyId,
          metric: PRESCRIPTION_REFERRAL_OVERFLOW_METRIC,
          quantity: 1,
          period,
          eventId: marker,
          billable: false,
          unit: "attempt",
          meta: { source: "afyvia_marketplace", patientDataShared: false },
        },
      });
      await tx.adminNotification.create({
        data: {
          pharmacyId,
          type: "prescription_referral_overflow",
          title: "A direct prescription opportunity could not enter your free inbox",
          body:
            "A patient selected your pharmacy from Afyvia after the 10 monthly direct-referral allowance was used. No patient or prescription details were shared with you; Afyvia offered the patient another available pharmacy instead of blocking care. Upgrade to Premium for unlimited direct marketplace prescription referrals.",
          severity: "info",
          relatedType: "billing",
        },
      });
    }),
  );
}

async function candidateWithCapacity(
  candidates: Array<{
    id: string;
    slug: string;
    name: string;
    city: string | null;
    county: string | null;
  }>,
): Promise<PrescriptionReferralAlternative | null> {
  if (!candidates.length) return null;
  const withUsage = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      usage: await getPrescriptionReferralUsage(candidate.id),
    })),
  );

  // Patient routing should follow the candidate order and available capacity,
  // not a pharmacy's billing state. Premium's benefit is that its capacity never
  // runs out; it is not an artificial ranking boost.
  const available = withUsage.find(
    (item) => item.usage.premium || (item.usage.remaining ?? 0) > 0,
  );
  if (!available) return null;

  return {
    ...available.candidate,
    premium: available.usage.premium,
  };
}

export async function findPrescriptionReferralAlternative(
  preferredPharmacyId: string,
): Promise<PrescriptionReferralAlternative | null> {
  return withPlatformBypass(async () => {
    const preferred = await prismaUnscoped.pharmacy.findUnique({
      where: { id: preferredPharmacyId },
      select: { city: true, county: true },
    });

    const baseWhere = {
      id: { not: preferredPharmacyId },
      status: "active" as const,
      listed: true,
      verifiedAt: { not: null },
      memberships: { some: { status: "active" as const } },
    };

    const areaFilters = [
      ...(preferred?.city ? [{ city: preferred.city }] : []),
      ...(preferred?.county ? [{ county: preferred.county }] : []),
    ];

    if (areaFilters.length) {
      const nearby = await prismaUnscoped.pharmacy.findMany({
        where: { ...baseWhere, OR: areaFilters },
        select: { id: true, slug: true, name: true, city: true, county: true },
        orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
        take: 20,
      });
      const local = await candidateWithCapacity(nearby);
      if (local) return local;
    }

    const broader = await prismaUnscoped.pharmacy.findMany({
      where: baseWhere,
      select: { id: true, slug: true, name: true, city: true, county: true },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 30,
    });
    return candidateWithCapacity(broader);
  });
}
