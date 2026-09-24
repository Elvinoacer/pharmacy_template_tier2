import "server-only";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

import type { NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { getPharmacyWorkspaceAccess } from "@/app/lib/platform/tenant-access";
import type { OverviewPeriod } from "@/app/lib/services/analytics/overview";

/**
 * Shared helpers for /api/admin/analytics/* routes.
 * Staff-only authorization + active-workspace validation + period parsing.
 */
export async function requireStaffForAnalytics() {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  if (!["staff", "manager", "pharmacist"].includes(user.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
  if (!user.activePharmacyId) {
    return { ok: false as const, status: 403, error: "No active pharmacy" };
  }

  const access = await getPharmacyWorkspaceAccess(user.activePharmacyId);
  if (access.blocksOperations) {
    return {
      ok: false as const,
      status: access.mode === "billing_suspended" ? 402 : 403,
      error:
        access.mode === "billing_suspended"
          ? "Pharmacy subscription is suspended"
          : "Pharmacy workspace is paused",
    };
  }
  if (!user.platformAdmin && !(await hasPremiumPlan(user.activePharmacyId))) return { ok: false as const, status: 402, error: "Advanced analytics is Premium-only." };
  return { ok: true as const, user };
}

export function parsePeriod(request: NextRequest): OverviewPeriod | { from: Date; to: Date } {
  const sp = request.nextUrl.searchParams;
  const raw = sp.get("period") || "30d";
  const validPeriods: OverviewPeriod[] = ["today", "7d", "30d", "quarter", "year"];
  if (raw === "custom") {
    const fromStr = sp.get("from");
    const toStr = sp.get("to");
    if (fromStr && toStr) {
      return { from: new Date(fromStr), to: new Date(toStr) };
    }
  }
  if (validPeriods.includes(raw as OverviewPeriod)) {
    return raw as OverviewPeriod;
  }
  return "30d";
}
