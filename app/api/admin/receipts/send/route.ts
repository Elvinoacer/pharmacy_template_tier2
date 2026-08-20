import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireStaff, writeAuditLog } from "@/app/lib/auth";
import { sendReceiptEmail, sendReceiptSmsOrWhatsapp } from "@/app/lib/services/receipt";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    requireStaff(user);

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
      await writeAuditLog(user!.id, "receipt_sent", "order", orderId, {
        channel,
        recipient,
      });
      return NextResponse.json({ ok: true, message: result.message });
    } else {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to send receipt." },
      { status: 500 }
    );
  }
}
