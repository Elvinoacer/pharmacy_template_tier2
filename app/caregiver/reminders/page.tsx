import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { formatDateTime, formatTimeAgo } from "@/app/lib/time";
import { Clock, Bell, Pill, Activity, Calendar } from "lucide-react";

export const metadata = { title: "Reminders" };

export default async function CaregiverRemindersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver/reminders");

  const links = await getActiveCaregiverLinks(user.id);
  const customerIds = links.map((l) => l.customerId);
  const customerNameById = new Map(links.map((l) => [l.customerId, l.customer.fullName]));

  // Fetch all reminders (upcoming + recent) for these patients.
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const reminders = customerIds.length
    ? await prisma.reminder.findMany({
        where: {
          customerId: { in: customerIds },
          scheduledFor: { gte: since },
        },
        include: { customer: { select: { fullName: true } } },
        orderBy: { scheduledFor: "desc" },
        take: 100,
      })
    : [];

  const now = new Date();
  const upcoming = reminders.filter((r) => r.scheduledFor >= now && r.status !== "cancelled");
  const past = reminders.filter((r) => r.scheduledFor < now || r.status === "cancelled");

  return (
    <CaregiverShell
      user={user}
      title="Reminders"
      subtitle="Medication, pickup, and follow-up reminders for your patients (read-only)."
    >
      {reminders.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ebe6] bg-white p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-[#8a9a92]" />
          <p className="mt-3 font-semibold text-[#0c1a14]">No reminders scheduled</p>
          <p className="mt-1 text-sm text-[#5a6b62]">
            Reminders will appear here as soon as the pharmacy schedules them for your patients.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="card-premium p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
              <Calendar className="h-4 w-4 text-[#0d6e5a]" /> Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-xs text-[#5a6b62]">No upcoming reminders.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f4f7f4] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0c1a14]">{r.title}</p>
                      {r.body && <p className="text-xs text-[#5a6b62]">{r.body}</p>}
                      <p className="text-[10px] text-[#8a9a92]">
                        {r.customer?.fullName} · {r.type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[#0d6e5a]">{formatDateTime(r.scheduledFor)}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        r.status === "sent" ? "bg-blue-100 text-blue-700"
                        : r.status === "answered" ? "bg-emerald-100 text-emerald-700"
                        : r.status === "escalated" ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-700"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-premium p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
              <Clock className="h-4 w-4 text-[#8a9a92]" /> Recent ({past.length})
            </h2>
            {past.length === 0 ? (
              <p className="text-xs text-[#5a6b62]">No recent reminders.</p>
            ) : (
              <ul className="space-y-1.5">
                {past.slice(0, 30).map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#fafbfa] px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-[#0c1a14]">{r.title}</span>
                      <span className="ml-2 text-[#8a9a92]">{r.customer?.fullName} · {r.type.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#5a6b62]">{formatTimeAgo(r.scheduledFor)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        r.status === "answered" ? "bg-emerald-100 text-emerald-700"
                        : r.status === "escalated" ? "bg-rose-100 text-rose-700"
                        : r.status === "sent" ? "bg-blue-100 text-blue-700"
                        : r.status === "cancelled" ? "bg-slate-100 text-slate-500"
                        : "bg-slate-100 text-slate-700"
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </CaregiverShell>
  );
}
