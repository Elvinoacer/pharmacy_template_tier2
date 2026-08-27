import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireStaff } from "@/app/lib/auth";
import { getReceiptData } from "@/app/lib/services/receipt";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireStaff(user);

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
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load receipt." },
      { status: 500 }
    );
  }
}
