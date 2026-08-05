import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/// Returns attention counts for the current user.
/// Customers: unread in-app notifications (incl. pharmacist replies on How do you feel).
/// Staff: roll-up of work queues PLUS a dedicated How-do-you-feel urgent count for sidebar badges.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (user.customerId) {
    const [count, feelReplies] = await Promise.all([
      prisma.notification.count({
        where: { customerId: user.customerId, openedAt: null, deletedAt: null },
      }),
      prisma.notification.count({
        where: {
          customerId: user.customerId,
          openedAt: null,
          deletedAt: null,
          type: "symptom_staff_reply",
        },
      }),
    ]);
    return NextResponse.json({
      count,
      feel: feelReplies,
      feelReplies,
    });
  }

  if (!isStaff(user.role)) {
    return NextResponse.json({ count: 0 });
  }

  // Staff roll-up — counts the things that need attention.
  // How do you feel is tracked separately from Contact enquiries.
  const [refills, enquiries, escalations, adminInbox, feelEscalated, feelWorse, feelCriticalInbox] =
    await Promise.all([
      prisma.refillRequest.count({
        where: { status: { in: ["submitted", "under_review", "approved", "preparing"] } },
      }),
      // Contact-page enquiries only (symptom triage no longer creates enquiries).
      prisma.enquiry.count({ where: { status: { in: ["new", "in_progress"] } } }),
      prisma.aiConversation.count({ where: { escalated: true } }),
      prisma.adminNotification.count({ where: { isRead: false } }),
      prisma.symptomSession.count({ where: { status: "escalated" } }),
      // Feeling worse, still open — life-critical path for pharmacists.
      prisma.symptomSession.count({
        where: {
          feelingTrend: "worse",
          status: { in: ["active", "monitoring", "escalated"] },
        },
      }),
      prisma.adminNotification.count({
        where: {
          isRead: false,
          type: { in: ["symptom_escalation", "symptom_checkin"] },
        },
      }),
    ]);

  // Sidebar badge = unread How-do-you-feel alerts only.
  // Viewing or resolving a session marks those notifications read, so the badge
  // clears and leaves room for brand-new escalations / "feeling worse" events.
  // Open-queue counts (escalated / worse) stay available for the inbox page stats.
  const feelUrgent = feelCriticalInbox;

  return NextResponse.json({
    count: refills + enquiries + escalations + adminInbox,
    refills,
    enquiries,
    escalations,
    adminInbox,
    feel: feelUrgent,
    feelEscalated,
    feelWorse,
    feelCriticalInbox,
    feelOpenQueue: Math.max(feelEscalated, feelWorse),
  });
}
