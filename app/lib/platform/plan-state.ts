import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import { prismaUnscoped } from "@/app/lib/db";
import { resolvePharmacyPlanState } from "./plan-state-model";

/** Accept a transaction so referral reservations and settlement use the same policy. */
export async function getPharmacyPlanState(pharmacyId: string, db: Pick<Prisma.TransactionClient, "pharmacy" | "subscription"> = prismaUnscoped, now = new Date()) {
  const [pharmacy, subscriptions] = await Promise.all([
    db.pharmacy.findUnique({ where: { id: pharmacyId }, select: { status: true, lifecycleStatus: true, verifiedAt: true, setupCompletedAt: true } }),
    db.subscription.findMany({ where: { pharmacyId }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, trialEndsAt: true, cancelAt: true } }),
  ]);
  return resolvePharmacyPlanState(pharmacy, subscriptions, now);
}
