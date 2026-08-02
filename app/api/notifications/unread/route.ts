import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/// Returns the count of notifications the current user has not yet "read".
/// Customers see notifications attached to their customer profile; staff see
/// a roll-up of pending refills + new enquiries + escalated AI conversations.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (user.customerId) {
    const count = await prisma.notification.count({
      where: { customerId: user.customerId, openedAt: null },
    });
    return NextResponse.json({ count });
  }

  // Staff roll-up
  const [refills, enquiries, escalations] = await Promise.all([
    prisma.refillRequest.count({
      where: { status: { in: ["submitted", "under_review", "approved", "preparing"] } },
    }),
    prisma.enquiry.count({ where: { status: { in: ["new", "in_progress"] } } }),
    prisma.aiConversation.count({ where: { escalated: true } }),
  ]);

  return NextResponse.json({ count: refills + enquiries + escalations, refills, enquiries, escalations });
}
