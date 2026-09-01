import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import {
  markWebhookProcessed,
  recordInboundWebhook,
} from "@/app/lib/platform/webhooks";

export const runtime = "nodejs";

type DeliveryStatus = "sent" | "delivered" | "failed" | "opened" | "clicked" | "replied";

function timingEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorized(request: NextRequest, rawBody: string) {
  const signature = request.headers.get("x-webhook-signature") || request.headers.get("x-aether-signature");
  const secret = process.env.DELIVERY_WEBHOOK_SECRET?.trim();
  if (signature && secret) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return timingEqual(expected, signature.replace(/^sha256=/, ""));
  }
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function isStatus(value: unknown): value is DeliveryStatus {
  return (
    value === "sent" ||
    value === "delivered" ||
    value === "failed" ||
    value === "opened" ||
    value === "clicked" ||
    value === "replied"
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!authorized(request, rawBody)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = JSON.parse(rawBody || "null") as {
    notificationId?: string;
    messageId?: string;
    deliveryId?: string;
    providerEventId?: string;
    status?: unknown;
  } | null;

  if (!body || !isStatus(body.status)) {
    return Response.json({ error: "Invalid delivery event" }, { status: 400 });
  }

  const notification = body.notificationId
    ? await prismaUnscoped.notification.findUnique({ where: { id: body.notificationId } })
    : null;
  const message = body.messageId
    ? await prismaUnscoped.message.findUnique({
        where: { id: body.messageId },
        include: { conversation: { select: { pharmacyId: true } } },
      })
    : null;

  const pharmacyId = notification?.pharmacyId || message?.conversation.pharmacyId;
  if (!pharmacyId) {
    return Response.json({ error: "notificationId or messageId required" }, { status: 400 });
  }

  const inbound = await recordInboundWebhook({
    pharmacyId,
    provider: "delivery",
    providerEventId: body.providerEventId || `${body.notificationId || ""}:${body.messageId || ""}:${body.status}`,
    eventType: `delivery.${body.status}`,
    payload: body,
  });
  if (inbound.duplicate) return Response.json({ ok: true, note: "duplicate" });

  await withPharmacy(pharmacyId, async () => {
    if (notification) {
      await prismaUnscoped.notification.update({
        where: { id: notification.id },
        data: {
          status: body.status === "replied" ? "delivered" : body.status,
          openedAt: body.status === "opened" ? new Date() : undefined,
          deliveredAt: body.status === "delivered" ? new Date() : undefined,
        },
      });
    }
    if (message) {
      await prismaUnscoped.message.update({
        where: { id: message.id },
        data: { status: body.status },
      });
    }
    if (body.deliveryId) {
      await prismaUnscoped.notificationDelivery.updateMany({
        where: { id: body.deliveryId, pharmacyId },
        data: {
          status: body.status === "replied" ? "delivered" : body.status === "clicked" ? "delivered" : body.status,
          deliveredAt: body.status === "delivered" ? new Date() : undefined,
          openedAt: body.status === "opened" ? new Date() : undefined,
        },
      });
    }
  });

  await markWebhookProcessed(inbound.event.id);
  return Response.json({ ok: true });
}
