import type { NextRequest } from "next/server";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";
import {
  markWebhookProcessed,
  recordInboundWebhook,
  verifyInboundProvider,
} from "@/app/lib/platform/webhooks";

export const runtime = "nodejs";

type DeliveryStatus = "sent" | "delivered" | "failed" | "opened" | "clicked" | "replied";

function authorized(request: NextRequest, rawBody: string) {
  const provider = request.headers.get("x-delivery-provider") || "delivery";
  const secret =
    provider === "twilio"
      ? process.env.TWILIO_AUTH_TOKEN
      : provider === "whatsapp"
        ? process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_ACCESS_TOKEN
        : provider === "resend"
          ? process.env.RESEND_WEBHOOK_SECRET
          : process.env.DELIVERY_WEBHOOK_SECRET;
  return verifyInboundProvider({
    provider,
    rawBody,
    headers: request.headers,
    secret,
  });
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

  const { notification, message } = await withPlatformBypass(async () => {
    const notification = body.notificationId
      ? await prismaUnscoped.notification.findUnique({ where: { id: body.notificationId } })
      : null;
    const message = body.messageId
      ? await prismaUnscoped.message.findUnique({
          where: { id: body.messageId },
          include: { conversation: { select: { pharmacyId: true } } },
        })
      : null;
    return { notification, message };
  });

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
          status: (body.status === "replied" ? "delivered" : body.status) as
            "sent" | "delivered" | "failed" | "opened" | "clicked",
          openedAt: body.status === "opened" ? new Date() : undefined,
          deliveredAt: body.status === "delivered" ? new Date() : undefined,
        },
      });
    }
    if (message) {
      await prismaUnscoped.message.update({
        where: { id: message.id },
        data: {
          status: (body.status === "replied" ? "delivered" : body.status) as
            "sent" | "delivered" | "failed" | "opened" | "clicked",
        },
      });
    }
    if (body.deliveryId) {
      await prismaUnscoped.notificationDelivery.updateMany({
        where: { id: body.deliveryId, pharmacyId },
        data: {
          status:
            body.status === "failed"
              ? "failed"
              : body.status === "sent"
                ? "sent"
                : "delivered",
          deliveredAt: body.status === "delivered" ? new Date() : undefined,
          openedAt: body.status === "opened" ? new Date() : undefined,
        },
      });
    }
  });

  await markWebhookProcessed(inbound.event.id);
  return Response.json({ ok: true });
}
