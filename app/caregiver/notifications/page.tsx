import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { formatDateTime, formatTimeAgo } from "@/app/lib/time";
import { Bell } from "lucide-react";

export const metadata = { title: "Notifications" };

export default async function CaregiverNotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver/notifications");

  const links = await getActiveCaregiverLinks(user.id);

  // Only include patients for whom the caregiver can receive pickup notifications.
  const eligibleLinks = links.filter((l) => l.canReceivePickupNotifications);
  const customerIds = eligibleLinks.map((l) => l.customerId);

  const notifications = customerIds.length
    ? await prisma.notification.findMany({
        where: {
          customerId: { in: customerIds },
          deletedAt: null,
          type: { in: ["refill", "pickup", "reminder"] },
        },
        include: { customer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <CaregiverShell
      user={user}
      title="Notifications"
      subtitle="Pickup, refill, and reminder notifications for patients who granted you pickup notification permission."
    >
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ebe6] bg-white p-8 text-center">
          <Bell className="mx-auto h-10 w-10 text-[#8a9a92]" />
          <p className="mt-3 font-semibold text-[#0c1a14]">No notifications yet</p>
          <p className="mt-1 text-sm text-[#5a6b62]">
            {eligibleLinks.length === 0
              ? "No patients have granted you pickup notification permission yet."
              : "Pickup and refill notifications will appear here as soon as they are sent."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border px-4 py-3 ${
                n.type === "pickup"
                  ? "border-emerald-200 bg-emerald-50"
                  : n.type === "reminder"
                    ? "border-blue-200 bg-blue-50"
                    : "border-[#e3ebe6] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0c1a14]">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-[#5a6b62]">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-[#8a9a92]">
                    {n.customer?.fullName} · {formatDateTime(n.createdAt)} · {formatTimeAgo(n.createdAt)}
                  </p>
                </div>
                {n.type === "pickup" && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Pickup
                  </span>
                )}
                {n.type === "reminder" && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    Reminder
                  </span>
                )}
                {n.type === "refill" && (
                  <span className="rounded-full bg-[#e6f4ef] px-2 py-0.5 text-[10px] font-semibold text-[#0d6e5a]">
                    Refill
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </CaregiverShell>
  );
}
