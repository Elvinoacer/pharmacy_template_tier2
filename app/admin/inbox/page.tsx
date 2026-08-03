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
  }));

  const queryParams: Record<string, string | undefined> = {};

  return (
    <AdminShell
      user={user}
      title="Admin Inbox"
      subtitle="Alerts, enquiries, and escalations needing your attention"
    >
      <div className="grid gap-6">
        <AdminPanel
          title="Inbox"
          description={`${total} items · showing ${notifications.length}`}
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
      </div>
    </AdminShell>
  );
}
