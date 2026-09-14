import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export type PharmacyWorkspaceAccessMode =
  | "operational"
  | "billing_grace"
  | "billing_suspended"
  | "regulatory_hold"
  | "suspended"
  | "unavailable";

export type PharmacyWorkspaceAccess = {
  mode: PharmacyWorkspaceAccessMode;
  blocksOperations: boolean;
  pharmacy: {
    id: string;
    name: string;
    status: string;
    lifecycleStatus: string;
    ownerUserId: string | null;
    setupCompletedAt: Date | null;
    verifiedAt: Date | null;
  } | null;
  subscriptionStatus: string | null;
  dunningStatus: string | null;
  graceUntil: Date | null;
  reason: string | null;
};

const HARD_BLOCKED_LIFECYCLES = new Set([
  "suspended",
  "regulatory_hold",
  "archived",
  "pending_deletion",
  "deleted",
]);

/**
 * Resolves the current tenant workspace state from fresh database evidence.
 * Never infer a billing suspension from `lifecycleStatus` alone: regulatory
 * suspensions must not be repairable by paying an invoice.
 */
export async function getPharmacyWorkspaceAccess(
  pharmacyId: string,
): Promise<PharmacyWorkspaceAccess> {
  const [pharmacy, subscription, dunning, latestSuspension] = await Promise.all([
    prismaUnscoped.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        id: true,
        name: true,
        status: true,
        lifecycleStatus: true,
        ownerUserId: true,
        setupCompletedAt: true,
        verifiedAt: true,
      },
    }),
    prismaUnscoped.subscription.findFirst({
      where: { pharmacyId, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
    prismaUnscoped.dunningCase.findFirst({
      where: { pharmacyId, status: { notIn: ["resolved", "written_off"] } },
      orderBy: { updatedAt: "desc" },
      select: { status: true, graceUntil: true },
    }),
    prismaUnscoped.pharmacyLifecycleEvent.findFirst({
      where: { pharmacyId, toStatus: "suspended" },
      orderBy: { createdAt: "desc" },
      select: { reason: true },
    }),
  ]);

  if (!pharmacy) {
    return {
      mode: "unavailable",
      blocksOperations: true,
      pharmacy: null,
      subscriptionStatus: subscription?.status ?? null,
      dunningStatus: dunning?.status ?? null,
      graceUntil: dunning?.graceUntil ?? null,
      reason: "pharmacy_not_found",
    };
  }

  const lifecycle = String(pharmacy.lifecycleStatus);
  const subscriptionStatus = subscription?.status ?? null;
  const dunningStatus = dunning?.status ?? null;
  const suspensionReason = latestSuspension?.reason ?? null;

  const billingSuspended =
    lifecycle === "suspended" &&
    (subscriptionStatus === "unpaid" ||
      dunningStatus === "suspended" ||
      suspensionReason === "billing_nonpayment");

  if (billingSuspended) {
    return {
      mode: "billing_suspended",
      blocksOperations: true,
      pharmacy,
      subscriptionStatus,
      dunningStatus,
      graceUntil: dunning?.graceUntil ?? null,
      reason: "billing_nonpayment",
    };
  }

  if (lifecycle === "regulatory_hold") {
    return {
      mode: "regulatory_hold",
      blocksOperations: true,
      pharmacy,
      subscriptionStatus,
      dunningStatus,
      graceUntil: dunning?.graceUntil ?? null,
      reason: "regulatory_hold",
    };
  }

  if (HARD_BLOCKED_LIFECYCLES.has(lifecycle)) {
    return {
      mode: lifecycle === "suspended" ? "suspended" : "unavailable",
      blocksOperations: true,
      pharmacy,
      subscriptionStatus,
      dunningStatus,
      graceUntil: dunning?.graceUntil ?? null,
      reason: suspensionReason || lifecycle,
    };
  }

  const inBillingGrace =
    subscriptionStatus === "past_due" ||
    dunningStatus === "warning" ||
    dunningStatus === "grace" ||
    dunningStatus === "restricted";

  return {
    mode: inBillingGrace ? "billing_grace" : "operational",
    blocksOperations: false,
    pharmacy,
    subscriptionStatus,
    dunningStatus,
    graceUntil: dunning?.graceUntil ?? null,
    reason: inBillingGrace ? "payment_overdue_within_grace" : null,
  };
}

export async function assertPharmacyWorkspaceOperable(pharmacyId: string) {
  const access = await getPharmacyWorkspaceAccess(pharmacyId);
  if (!access.blocksOperations) return access;

  const error = new Error(
    access.mode === "billing_suspended"
      ? "PHARMACY_BILLING_SUSPENDED"
      : "PHARMACY_WORKSPACE_PAUSED",
  );
  (error as Error & { code?: string; status?: number }).code =
    access.mode === "billing_suspended"
      ? "PHARMACY_BILLING_SUSPENDED"
      : "PHARMACY_WORKSPACE_PAUSED";
  (error as Error & { status?: number }).status =
    access.mode === "billing_suspended" ? 402 : 403;
  throw error;
}
