import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { updateRefillStatus } from "@/app/lib/services/crm";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import type { RefillStatus } from "@/app/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update a refill's status via API. Mirrors the existing server action
 * `adminUpdateRefillAction` but is callable from a client component so we
 * can show a toast on success without a full page reload.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const id = String(form.get("id") || "");
  const status = String(form.get("status") || "") as RefillStatus;
  if (!id || !status) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const valid: RefillStatus[] = [
    "submitted",
    "under_review",
    "approved",
    "preparing",
    "ready_for_pickup",
    "collected",
    "cancelled",
  ];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    await updateRefillStatus(id, status, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const isStock = message.toLowerCase().includes("insufficient stock");
    await recordAdminNotification({
      type: isStock ? "stock_low" : "reminder_failed",
      title: isStock ? "Refill blocked — low stock" : "Refill status update failed",
      body: `Refill ${id} could not be moved to ${status}: ${message}`,
      severity: isStock ? "critical" : "warning",
      relatedType: "refill_request",
      relatedId: id,
    });
    return NextResponse.json(
      { error: isStock ? "insufficient_stock" : "update_failed", message },
      { status: isStock ? 409 : 500 },
    );
  }
}
