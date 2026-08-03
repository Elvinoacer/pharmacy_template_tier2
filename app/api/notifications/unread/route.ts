import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/// Returns the count of notifications the current user has not yet "read".
/// Customers see notifications attached to their customer profile; staff see
/// a roll-up of pending refills + new enquiries + escalated AI conversations
/// PLUS unread items in their admin inbox (AdminNotification model).
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (user.customerId) {
    const count = await prisma.notification.count({
      where: { customerId: user.customerId, openedAt: null, deletedAt: null },
    });
    return NextResponse.json({ count });
  }

  // Staff roll-up — counts the things that need attention.
  const [refills, enquiries, escalations, adminInbox] = await Promise.all([
    prisma.refillRequest.count({
      where: { status: { in: ["submitted", "under_review", "approved", "preparing"] } },
    }),
    prisma.enquiry.count({ where: { status: { in: ["new", "in_progress"] } } }),
    prisma.aiConversation.count({ where: { escalated: true } }),
    prisma.adminNotification.count({ where: { isRead: false } }),
  ]);

  return NextResponse.json({
    count: refills + enquiries + escalations + adminInbox,
    refills,
    enquiries,
    escalations,
    adminInbox,
  });
}
