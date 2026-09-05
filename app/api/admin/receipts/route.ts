import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { requirePermission } from "@/app/lib/platform/policy";
import { getReceiptData } from "@/app/lib/services/receipt";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    await requirePermission(user, "orders.read");

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Order ID is required." }, { status: 400 });
    }

    const receipt = await getReceiptData(orderId);
    if (!receipt) {
      return NextResponse.json({ ok: false, error: "Receipt not found for this order." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, receipt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load receipt.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
