import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/app/lib/services/commerce/reservations";
import { writeAuditLog } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

/**
 * Reservation expiry cron (audit §10).
 *
 * Releases all InventoryReservations whose `expiresAt` has passed, restores
 * the physical stock, marks the parent Order as expired/cancelled, and writes
 * a CommerceEvent.reservation_expired entry per affected order.
 *
 * Recommended schedule: every 15–30 minutes.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://…/api/cron/reservations
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await releaseExpiredReservations();
    if (result.ordersAffected.length > 0) {
      await writeAuditLog(null, "cron_reservations_expired", "inventory_reservation", undefined, {
        releasedCount: result.releasedCount,
        ordersAffected: result.ordersAffected,
      });
    }
    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/reservations]", err);
    return NextResponse.json(
      { error: "expiry_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
