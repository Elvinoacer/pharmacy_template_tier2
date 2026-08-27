import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight poll endpoint for live toasts / sidebar badges.
 *
 * - Staff: latest unread How-do-you-feel admin notifications (worse / escalate).
 * - Customers: unread pharmacist replies on their check-ins.
 * - Guests: pass guestKey — returns staff replies on their sessions since `since`.
 *
 * This is intentionally separate from Contact enquiries.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const sinceOk = since && !Number.isNaN(since.getTime()) ? since : null;
  const guestKey = url.searchParams.get("guestKey")?.trim().slice(0, 80) || null;

  const user = await getSessionUser();

  // ── Staff ────────────────────────────────────────────────────
  if (user && isStaff(user.role)) {
    const where = {
      type: { in: ["symptom_escalation", "symptom_checkin"] },
      isRead: false,
      ...(sinceOk ? { createdAt: { gt: sinceOk } } : {}),
    };

    const [items, feelEscalated, feelWorse] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          severity: true,
          relatedId: true,
          createdAt: true,
        },
      }),
      prisma.symptomSession.count({ where: { status: "escalated" } }),
      prisma.symptomSession.count({
        where: {
          feelingTrend: "worse",
          status: { in: ["active", "monitoring", "escalated"] },
        },
      }),
    ]);

    // Badge mirrors unread feel alerts — same source as /api/notifications/unread.
    // Opening a thread marks related notifications read so this clears.
    return NextResponse.json({
      role: "staff",
      feel: items.length,
      feelEscalated,
      feelWorse,
      feelOpenQueue: Math.max(feelEscalated, feelWorse),
      alerts: items.map((n) => ({
        id: n.id,
        kind: n.type === "symptom_checkin" ? "feeling_worse" : "escalation",
        title: n.title,
        body: n.body,
        severity: n.severity,
        url: n.relatedId ? `/admin/feel/${n.relatedId}` : "/admin/feel",
        createdAt: n.createdAt.toISOString(),
      })),
      serverTime: new Date().toISOString(),
    });
  }

  // ── Logged-in customer ───────────────────────────────────────
  if (user?.customerId) {
    const where = {
      customerId: user.customerId,
      type: "symptom_staff_reply",
      openedAt: null,
      deletedAt: null,
      ...(sinceOk ? { createdAt: { gt: sinceOk } } : {}),
    };

    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        body: true,
        relatedId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      role: "customer",
      feel: items.length,
      alerts: items.map((n) => ({
        id: n.id,
        kind: "staff_reply",
        title: n.title,
        body: n.body,
        severity: "info",
        url: "/portal/feel",
        relatedId: n.relatedId,
        createdAt: n.createdAt.toISOString(),
      })),
      serverTime: new Date().toISOString(),
    });
  }

  // ── Guest (public How do you feel) ───────────────────────────
  if (guestKey) {
    const sessions = await prisma.symptomSession.findMany({
      where: { guestKey },
      orderBy: { lastMessageAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        messages: {
          where: {
            role: "staff",
            ...(sinceOk ? { createdAt: { gt: sinceOk } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    const alerts = sessions.flatMap((s) =>
      s.messages.map((m) => ({
        id: m.id,
        kind: "staff_reply" as const,
        title: "Pharmacist replied to your check-in",
        body: m.content.length > 140 ? `${m.content.slice(0, 137)}…` : m.content,
        severity: "info",
        url: "/how-do-you-feel",
        relatedId: s.id,
        createdAt: m.createdAt.toISOString(),
      })),
    );

    return NextResponse.json({
      role: "guest",
      feel: alerts.length,
      alerts,
      serverTime: new Date().toISOString(),
    });
  }

  return NextResponse.json({ role: "anonymous", feel: 0, alerts: [], serverTime: new Date().toISOString() });
}
