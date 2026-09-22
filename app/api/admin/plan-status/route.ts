import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import {
  FREE_MEDICINE_LIMIT,
  FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT,
  FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT,
  FREE_SERVICE_LIMIT,
} from "@/app/lib/platform/plan-policy";
import { getPrescriptionReferralUsage } from "@/app/lib/platform/prescription-referrals";

export const dynamic = "force-dynamic";

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;

  if (!pharmacyId) {
    return NextResponse.json({ error: "no_active_pharmacy" }, { status: 404 });
  }

  const membership = user.memberships.find(
    (candidate) =>
      candidate.pharmacyId === pharmacyId && candidate.status === "active",
  );

  if (!membership && !user.platformAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [
    pharmacy,
    premiumSubscription,
    latestSubscription,
    publicMedicines,
    activeServices,
    campaignLaunches,
    prescriptionReferrals,
  ] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        id: true,
        name: true,
        ownerUserId: true,
        status: true,
        setupCompletedAt: true,
        verifiedAt: true,
      },
    }),
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
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialEndsAt: true,
        cancelAt: true,
      },
    }),
    prismaUnscoped.subscription.findFirst({
      where: { pharmacyId, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        trialEndsAt: true,
        cancelAt: true,
      },
    }),
    prismaUnscoped.pharmacyInventory.count({
      where: { pharmacyId, active: true, publicListing: true },
    }),
    prismaUnscoped.pharmacyService.count({
      where: { pharmacyId, active: true },
    }),
    prismaUnscoped.campaign.count({
      where: {
        pharmacyId,
        OR: [
          { sentAt: { gte: monthStart, lt: nextMonth } },
          {
            status: "sending",
            updatedAt: { gte: monthStart, lt: nextMonth },
          },
        ],
      },
    }),
    getPrescriptionReferralUsage(pharmacyId),
  ]);

  if (!pharmacy) {
    return NextResponse.json({ error: "pharmacy_not_found" }, { status: 404 });
  }

  const premium = Boolean(premiumSubscription);
  const subscription = premiumSubscription || latestSubscription;
  const subscriptionStatus = subscription?.status ?? null;
  const paymentAttention = Boolean(
    !premium &&
      subscriptionStatus &&
      ["past_due", "unpaid"].includes(subscriptionStatus),
  );

  return NextResponse.json(
    {
      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.name,
        status: pharmacy.status,
        setupCompleted: Boolean(pharmacy.setupCompletedAt),
        verified: Boolean(pharmacy.verifiedAt),
      },
      plan: premium ? "premium" : "free",
      premium,
      isOwner: pharmacy.ownerUserId === user.id,
      subscription: {
        status: subscriptionStatus,
        periodStart: iso(subscription?.currentPeriodStart),
        periodEnd: iso(subscription?.currentPeriodEnd),
        trialEndsAt: iso(subscription?.trialEndsAt),
        cancelAt: iso(subscription?.cancelAt),
        paymentAttention,
      },
      price: {
        premiumMonthlyKes: 500,
      },
      usage: {
        medicines: {
          used: publicMedicines,
          limit: premium ? null : FREE_MEDICINE_LIMIT,
        },
        services: {
          used: activeServices,
          limit: premium ? null : FREE_SERVICE_LIMIT,
        },
        prescriptionReferrals: {
          used: prescriptionReferrals.used,
          limit: premium ? null : FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT,
        },
        campaigns: {
          used: campaignLaunches,
          limit: premium ? null : FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT,
        },
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
