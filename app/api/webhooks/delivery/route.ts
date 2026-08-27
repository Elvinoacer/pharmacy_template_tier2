import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";

type DeliveryStatus = "sent" | "delivered" | "failed" | "opened" | "clicked" | "replied";

function authorized(request: NextRequest) {
  const secret = process.env.DELIVERY_WEBHOOK_SECRET?.trim();
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
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    notificationId?: string;
    messageId?: string;
    status?: unknown;
  } | null;

  if (!body || !isStatus(body.status)) {
    return Response.json({ error: "Invalid delivery event" }, { status: 400 });
  }

  const writes = [];
  if (body.notificationId) {
    writes.push(
      prisma.notification.update({
        where: { id: body.notificationId },
        data: {
          status: body.status === "replied" ? "delivered" : body.status,
          openedAt: body.status === "opened" ? new Date() : undefined,
        },
      }),
    );
  }
  if (body.messageId) {
    writes.push(
      prisma.message.update({
        where: { id: body.messageId },
        data: { status: body.status },
      }),
    );
  }

  if (writes.length === 0) {
    return Response.json({ error: "notificationId or messageId required" }, { status: 400 });
  }

  await prisma.$transaction(writes);
  return Response.json({ ok: true });
}
