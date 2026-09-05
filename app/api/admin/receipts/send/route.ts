import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, writeAuditLog } from "@/app/lib/auth";
import { requirePermission } from "@/app/lib/platform/policy";
import { sendReceiptEmail, sendReceiptSmsOrWhatsapp } from "@/app/lib/services/receipt";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const actor = await requirePermission(user, "orders.read");

    const body = await req.json();
    const { orderId, channel, recipient } = body;

    if (!orderId) {
      return NextResponse.json({ ok: false, error: "Order ID is required." }, { status: 400 });
    }

    let result: { ok: boolean; message?: string; error?: string };

    if (channel === "email") {
      result = await sendReceiptEmail(orderId, recipient);
    } else if (channel === "whatsapp" || channel === "sms") {
      result = await sendReceiptSmsOrWhatsapp(orderId, recipient, channel);
    } else {
      return NextResponse.json({ ok: false, error: "Invalid channel (choose email, sms, or whatsapp)." }, { status: 400 });
    }

    if (result.ok) {
      await writeAuditLog(actor.id, "receipt_sent", "order", orderId, {
        channel,
        recipient,
      });
      return NextResponse.json({ ok: true, message: result.message });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send receipt.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
