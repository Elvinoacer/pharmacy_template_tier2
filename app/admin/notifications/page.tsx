import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PushSettingsPanel } from "@/app/components/admin/PushSettingsPanel";
import { PushEnablePanel } from "@/app/components/PushNotificationCenter";
import { AdminNotificationsPanel, type NotifRow } from "@/app/components/admin/AdminNotificationsPanel";
import { parsePageParam } from "@/app/lib/pagination";
import { AlertTriangle, BellRing } from "lucide-react";

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
      title="Notification settings & history"
      subtitle="Review delivery activity, recover failed sends, and manage push preferences."
    >
      <div className="mx-auto w-full max-w-[1280px] space-y-4 sm:space-y-6">
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          <div className="admin-stat col-span-2 min-w-0 border-l-4 border-rose-500 p-4 sm:col-span-1 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold uppercase tracking-wide admin-soft sm:text-sm">Failed sends</p>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">{failedCount}</p>
            <p className="mt-1 text-sm admin-soft sm:text-sm">Retryable delivery failures</p>
          </div>

          <div className="admin-stat min-w-0 border-l-4 border-amber-500 p-4 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold uppercase tracking-wide admin-soft sm:text-sm">Admin unread</p>
              <BellRing className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
            </div>
            <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">{adminInboxCount}</p>
          </div>

          {counts.map((c) => (
            <div key={c.status} className="admin-stat min-w-0 p-4 transition-transform hover:-translate-y-0.5 sm:p-4">
              <span className={`inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-sm font-bold uppercase sm:text-sm ${statusColor(c.status)}`}>
                {c.status}
              </span>
              <p className="mt-1 text-xl font-black admin-text sm:text-2xl">{c._count}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <AdminPanel
            title="Outbound log"
            description={`${total} notifications · showing ${notifications.length}`}
            className="min-w-0 lg:col-span-2"
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
          </AdminPanel>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
            <PushEnablePanel audience="admin" />
            <PushSettingsPanel devices={pushDevices} />
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}

function statusColor(status: string): string {
  const m: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    sent: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    failed: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    opened: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    clicked: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  };
  return m[status] || "bg-slate-500/15 text-slate-700 dark:text-slate-300";
}
