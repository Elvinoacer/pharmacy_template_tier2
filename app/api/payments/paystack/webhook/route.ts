import { NextResponse } from "next/server";

import {
  processPaystackWebhookEvent,
  verifyPaystackWebhookSignature,
  type PaystackWebhookEvent,
} from "@/app/lib/services/paystack-billing";
import {
  processPaystackRetryReference,
  restoreBillingSuspendedFromPaystackEvent,
} from "@/app/lib/services/paystack-dunning";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await withPlatformBypass(async () => {
      if (event.event === "charge.success") {
        const reference = String(event.data?.reference || "").trim();
        if (reference) {
          const retry = await processPaystackRetryReference(reference);
          if (retry.handled) {
            return { status: retry.ok ? 200 : 202, note: retry.note };
          }
        }
      }

      const normal = await processPaystackWebhookEvent(event);
      if (normal.status < 400) await restoreBillingSuspendedFromPaystackEvent(event);
      return normal;
    });

    // subscription.create and charge.success can arrive in either order. If the
    // provider subscription arrives first, deliberately ask Paystack to retry
    // instead of acknowledging and permanently losing the subscription binding.
    if (result.note === "subscription_not_matched") {
      return NextResponse.json({ ok: false, note: result.note }, { status: 503 });
    }
    return NextResponse.json({ ok: result.status < 400, note: result.note }, { status: result.status });
  } catch (error) {
    console.error("[paystack webhook]", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
