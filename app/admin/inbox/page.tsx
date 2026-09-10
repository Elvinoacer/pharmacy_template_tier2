import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminInboxPanel, type AdminNotifRow } from "@/app/components/admin/AdminInboxPanel";
import { parsePageParam } from "@/app/lib/pagination";

export const metadata = { title: "Admin Inbox" };

const PAGE_SIZE = 25;

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !user.role || !["admin", "staff", "manager"].includes(user.role)) {
    redirect("/login");
  }

  const sp = await searchParams;
  const total = await prisma.adminNotification.count();
  const page = parsePageParam(sp.page, total, PAGE_SIZE);

  const rawNotifications = await prisma.adminNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const notifications: AdminNotifRow[] = rawNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    severity: n.severity,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    relatedType: n.relatedType,
    relatedId: n.relatedId,
  }));

  const queryParams: Record<string, string | undefined> = {};

  return (
    <AdminShell
      user={user}
      title="Attention inbox"
      subtitle="A single operational queue for alerts, escalations, enquiries, refill activity, and stock events that may need action."
    >
      <AdminPanel
        title="Needs attention"
        description={`${total} total notification${total === 1 ? "" : "s"} · showing ${notifications.length} on this page`}
      >
        <AdminInboxPanel
          initial={notifications}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          basePath="/admin/inbox"
          queryParams={queryParams}
        />
      </AdminPanel>
    </AdminShell>
  );
}
