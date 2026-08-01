import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateReminderAction, adminProcessRemindersAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import ReminderForm from "@/app/components/admin/ReminderForm";

export const metadata = { title: "Reminders" };

export default async function AdminRemindersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [reminders, customers] = await Promise.all([
    prisma.reminder.findMany({
      include: { customer: true },
      orderBy: { scheduledFor: "desc" },
      take: 50,
    }),
    prisma.customerProfile.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return (
    <AdminShell user={user} title="Reminder engine">
      <form action={adminProcessRemindersAction} className="mb-4">
        <button type="submit" className="rounded-xl bg-amber-400/90 px-4 py-2 text-sm font-semibold text-[#422006]">
          Process due reminders now
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Schedule reminder">
          <ReminderForm
            action={adminCreateReminderAction}
            customers={customers}
          />
        </AdminPanel>
        <AdminPanel title="Scheduled & sent">
          <ul className="space-y-3">
            {reminders.map((r) => (
              <li key={r.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{r.title}</p>
                  <span className="text-xs capitalize text-teal-100/50">{r.status}</span>
                </div>
                <p className="text-xs text-teal-100/50">
                  {r.customer.fullName} · {r.type} · {r.channel} ·{" "}
                  {new Date(r.scheduledFor).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
