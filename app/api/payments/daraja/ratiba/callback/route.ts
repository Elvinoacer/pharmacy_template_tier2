import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { markWebhookProcessed, recordInboundWebhook } from "@/app/lib/platform/webhooks";
import {
  parseRatibaCallback,
  processRatibaCallback,
  verifyRatibaCallbackToken,
} from "@/app/lib/services/daraja-subscriptions";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!verifyRatibaCallbackToken(token)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const facts = parseRatibaCallback(payload);
    const providerEventId =
      facts.transactionId ||
      facts.standingOrderId ||
      facts.responseRefId ||
      createHash("sha256").update(rawBody).digest("hex");

    const result = await withPlatformBypass(() => processRatibaCallback(payload));
    if (!result.pharmacyId) {
      console.warn("[daraja ratiba callback] subscription not found", {
        providerEventId,
        responseRefId: facts.responseRefId,
        standingOrderId: facts.standingOrderId,
      });
      return NextResponse.json({ ok: true, note: result.note });
    }

    const inbound = await withPlatformBypass(() =>
      recordInboundWebhook({
        pharmacyId: result.pharmacyId!,
        provider: "daraja",
        providerEventId,
        eventType: facts.transactionId ? "ratiba.payment.callback" : "ratiba.authorization.callback",
        payload,
      }),
    );
    if (!inbound.duplicate || inbound.event.status !== "delivered") {
      await markWebhookProcessed(inbound.event.id);
    }

    return NextResponse.json({ ok: true, note: result.note });
  } catch (error) {
    console.error("[daraja ratiba callback]", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
