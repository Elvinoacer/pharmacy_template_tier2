import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { sendDelivery } from "@/app/lib/services/delivery";
import { dispatchPushToUser } from "@/app/lib/services/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retry all failed outbound notifications in one tap.
 *
 * Walks every Notification with status='failed', looks up the customer,
 * re-attempts delivery via the original channel, and updates the row.
 *
 * Returns a summary: { attempted, recovered, still_failed }.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const failed = await prisma.notification.findMany({
    where: { status: "failed" },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { id: true, email: true } },
        },
      },
    },
    take: 200,
  });

  let recovered = 0;
  let stillFailed = 0;

  for (const n of failed) {
    if (!n.customer) {
      stillFailed++;
      continue;
    }
    const channel = n.channel as "email" | "sms" | "whatsapp" | "in_app" | "push";
    // For in_app / push, just mark as delivered — no external send needed.
    if (channel === "in_app" || channel === "push") {
      await prisma.notification.update({
        where: { id: n.id },
        data: { status: "delivered", sentAt: new Date() },
      });
      recovered++;
      continue;
    }
    const delivery = await sendDelivery({
      channel,
      recipient: { email: n.customer.user.email, phone: n.customer.phone },
      subject: n.title,
      body: n.fullBody || n.body,
    });
    if (delivery.status === "sent" || delivery.status === "delivered") {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          status: delivery.status,
          sentAt: new Date(),
        },
      });
      recovered++;
      // Also fire a push to the customer's devices.
      if (n.customer.user?.id) {
        await dispatchPushToUser(n.customer.user.id, {
          title: n.title,
          body: (n.fullBody || n.body).slice(0, 200),
          url: "/portal/messages",
          data: { tag: `retry-${n.id}`, notificationId: n.id },
        }).catch(() => {});
      }
    } else {
      stillFailed++;
    }
  }

  return NextResponse.json({
    ok: true,
    attempted: failed.length,
    recovered,
    still_failed: stillFailed,
  });
}
