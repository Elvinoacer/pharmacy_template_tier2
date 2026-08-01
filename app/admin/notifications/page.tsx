import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";

export const metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await prisma.notification.groupBy({
    by: ["status"],
    _count: true,
  });

  return (
    <AdminShell user={user} title="Notification center">
      <div className="mb-6 flex flex-wrap gap-3">
        {counts.map((c) => (
          <div key={c.status} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <span className="capitalize text-teal-100/60">{c.status}</span>:{" "}
            <strong>{c._count}</strong>
          </div>
        ))}
      </div>
      <AdminPanel title="Outbound log">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-teal-100/50">
                <th className="pb-2">Customer</th>
                <th className="pb-2">Channel</th>
                <th className="pb-2">Title</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className="border-b border-white/5">
                  <td className="py-2">{n.customer?.fullName || "—"}</td>
                  <td className="py-2 capitalize">{n.channel}</td>
                  <td className="py-2">{n.title}</td>
                  <td className="py-2 capitalize">{n.status}</td>
                  <td className="py-2 text-teal-100/50">{new Date(n.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
