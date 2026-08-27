import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PushSettingsPanel } from "@/app/components/admin/PushSettingsPanel";
import { PushEnablePanel } from "@/app/components/PushNotificationCenter";
import { AdminNotificationsPanel, type NotifRow } from "@/app/components/admin/AdminNotificationsPanel";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";

export const metadata = { title: "Notifications" };

const PAGE_SIZE = 25;

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; channel?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const status = sp.status || undefined;
  const channel = sp.channel || undefined;

  // Build where clause.
  const where: Prisma.NotificationWhereInput = {
    ...(status ? { status: status as "pending" | "sent" | "delivered" | "failed" | "opened" | "clicked" } : {}),
    ...(channel ? { channel: channel as "email" | "sms" | "whatsapp" | "push" | "in_app" } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { body: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // First get the count, then the page (since page depends on count).
  const total = await prisma.notification.count({ where });
  const page = parsePageParam(sp.page, total, PAGE_SIZE);

  const [failedCount, rawNotifications, counts, pushDevices, adminInboxCount] = await Promise.all([
    prisma.notification.count({ where: { status: "failed" } }),
    prisma.notification.findMany({
      where,
      include: { customer: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.notification.groupBy({ by: ["status"], _count: true }),
    prisma.pushDevice.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.adminNotification.count({ where: { isRead: false } }),
  ]);

  const notifications: NotifRow[] = rawNotifications.map((n) => ({
    id: n.id,
    channel: n.channel,
    type: n.type,
    title: n.title,
    body: n.body,
    fullBody: n.fullBody,
    status: n.status,
    customerName: n.customer?.fullName ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  const queryParams: Record<string, string | undefined> = {
    q,
    status,
    channel,
  };

  return (
    <AdminShell
      user={user}
      title="Notification center"
      subtitle="Outbound log, admin inbox, and Firebase Cloud Messaging setup"
    >
      {/* Stats */}
      <div className="mb-6 flex flex-wrap gap-3">
        {counts.map((c) => (
          <div key={c.status} className="admin-stat px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(c.status)}`}>
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold admin-text">{c._count}</p>
          </div>
        ))}
        <div className="admin-stat px-4 py-3 border-l-4 border-rose-500">
          <p className="text-[10px] uppercase tracking-wide admin-soft">Failed (retryable)</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{failedCount}</p>
        </div>
        <div className="admin-stat px-4 py-3 border-l-4 border-amber-500">
          <p className="text-[10px] uppercase tracking-wide admin-soft">Admin inbox (unread)</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{adminInboxCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Outbound log */}
        <AdminPanel
          title="Outbound log"
          description={`${total} notifications · showing ${notifications.length}`}
          className="lg:col-span-2"
        >
          <AdminNotificationsPanel
            initial={notifications}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            basePath="/admin/notifications"
            queryParams={queryParams}
            failedCount={failedCount}
          />
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            basePath="/admin/notifications"
            queryParams={queryParams}
            variant="admin"
          />
        </AdminPanel>

        {/* Push settings + admin inbox summary */}
        <div className="space-y-4">
          <PushEnablePanel audience="admin" />
          <PushSettingsPanel devices={pushDevices} />
        </div>
      </div>
    </AdminShell>
  );
}

function statusColor(status: string): string {
  const m: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700",
    sent: "bg-blue-500/15 text-blue-700",
    delivered: "bg-emerald-500/15 text-emerald-700",
    failed: "bg-rose-500/15 text-rose-600",
    opened: "bg-cyan-500/15 text-cyan-700",
    clicked: "bg-violet-500/15 text-violet-700",
  };
  return m[status] || "bg-slate-500/15 text-slate-600";
}
