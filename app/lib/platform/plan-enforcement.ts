import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";
import {
  FREE_MEDICINE_LIMIT,
  FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT,
  FREE_SERVICE_LIMIT,
  type PremiumGrowthFeature,
} from "@/app/lib/platform/plan-policy";

function paymentRequiredError(code: string) {
  const error = new Error(code);
  (error as Error & { status?: number }).status = 402;
  return error;
}

function limitError(code: "FREE_MEDICINE_LIMIT" | "FREE_SERVICE_LIMIT" | "FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT") {
  return paymentRequiredError(code);
}

function monthBoundsUtc(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function assertPremiumGrowthFeature(
  pharmacyId: string,
  feature: PremiumGrowthFeature,
) {
  if (await hasPremiumPlan(pharmacyId)) return;
  throw paymentRequiredError(`PREMIUM_REQUIRED:${feature}`);
}

export async function assertCampaignConfiguration(
  pharmacyId: string,
  options: {
    scheduledFor?: Date | null;
    channel?: string | null;
    segmentId?: string | null;
  },
) {
  if (await hasPremiumPlan(pharmacyId)) return;

  if (options.scheduledFor) {
    throw paymentRequiredError("PREMIUM_REQUIRED:campaign_scheduling");
  }
  if (options.channel === "multi") {
    throw paymentRequiredError("PREMIUM_REQUIRED:multi_channel_campaigns");
  }

  if (options.segmentId) {
    const segment = await prismaUnscoped.segment.findFirst({
      where: { id: options.segmentId, pharmacyId },
      select: { isSystem: true },
    });
    if (!segment?.isSystem) {
      throw paymentRequiredError("PREMIUM_REQUIRED:custom_segments");
    }
  }
}

export async function assertMonthlyCampaignLaunchSlot(
  pharmacyId: string,
  reference = new Date(),
) {
  if (await hasPremiumPlan(pharmacyId)) return;

  const { start, end } = monthBoundsUtc(reference);
  const launched = await prismaUnscoped.campaign.count({
    where: {
      pharmacyId,
      OR: [
        { sentAt: { gte: start, lt: end } },
        {
          status: "sending",
          updatedAt: { gte: start, lt: end },
        },
      ],
    },
  });
  if (launched >= FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT) {
    throw limitError("FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT");
  }
}

/** Premium is an active paid period or an unexpired trial. A past-due renewal is not premium. */
export async function assertPublicMedicineSlot(pharmacyId: string, additional = 1) {
  if (additional <= 0 || (await hasPremiumPlan(pharmacyId))) return;
  const count = await prismaUnscoped.pharmacyInventory.count({
    where: { pharmacyId, active: true, publicListing: true },
  });
  if (count + additional > FREE_MEDICINE_LIMIT) throw limitError("FREE_MEDICINE_LIMIT");
}

export async function assertActiveServiceSlot(pharmacyId: string, additional = 1) {
  if (additional <= 0 || (await hasPremiumPlan(pharmacyId))) return;
  const count = await prismaUnscoped.pharmacyService.count({
    where: { pharmacyId, active: true },
  });
  if (count + additional > FREE_SERVICE_LIMIT) throw limitError("FREE_SERVICE_LIMIT");
}

/**
 * After Premium lapses, keep the newest free allowance public and hide the rest.
 * Stock and booking history stay; only the public catalogue is reduced.
 */
export async function releasePremiumOverflow(pharmacyId: string) {
  if (await hasPremiumPlan(pharmacyId)) return { medicines: 0, services: 0 };

  const listings = await prismaUnscoped.pharmacyInventory.findMany({
    where: { pharmacyId, active: true, publicListing: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  const extraListings = listings.slice(FREE_MEDICINE_LIMIT);
  if (extraListings.length > 0) {
    await prismaUnscoped.pharmacyInventory.updateMany({
      where: { id: { in: extraListings.map((row) => row.id) } },
      data: { publicListing: false },
    });
  }

  const services = await prismaUnscoped.pharmacyService.findMany({
    where: { pharmacyId, active: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  const extraServices = services.slice(FREE_SERVICE_LIMIT);
  if (extraServices.length > 0) {
    await prismaUnscoped.pharmacyService.updateMany({
      where: { id: { in: extraServices.map((row) => row.id) } },
      data: { active: false, bookable: false },
    });
  }

  return { medicines: extraListings.length, services: extraServices.length };
}
