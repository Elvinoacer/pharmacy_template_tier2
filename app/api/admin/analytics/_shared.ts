import "server-only";

import type { NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import type { OverviewPeriod } from "@/app/lib/services/analytics/overview";

/**
 * Shared helpers for /api/admin/analytics/* routes.
 * Staff-only authorization + period parsing.
 */
export async function requireStaffForAnalytics() {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  if (!["staff", "manager", "pharmacist"].includes(user.role)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }
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
