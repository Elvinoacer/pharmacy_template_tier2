import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { getCustomerDashboard } from "@/app/lib/services/crm";
import { refillStatusMeta } from "@/app/lib/types";
import PortalShell, { Badge, Panel, StatCard } from "@/app/components/portal/PortalShell";
import { redirect } from "next/navigation";

export const metadata = { title: "My dashboard" };

export default async function PortalDashboardPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const data = await getCustomerDashboard(user.customerId);
  const activeRefills = data.refills.filter((r) =>
    !["collected", "cancelled"].includes(r.status),
  ).length;

  return (
    <PortalShell user={user} title={`Hello, ${data.profile?.fullName?.split(" ")[0] || "there"}`}>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active prescriptions" value={data.prescriptions.length} />
        <StatCard label="Open refills" value={activeRefills} />
        <StatCard
          label="Loyalty points"
          value={data.loyalty?.points ?? 0}
          hint={data.loyalty ? `${data.loyalty.tier} tier` : undefined}
        />
        <StatCard label="Upcoming reminders" value={data.reminders.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Active prescriptions"
          action={
            <Link href="/portal/prescriptions" className="text-sm font-medium text-[#0d6e5a]">
              View all
            </Link>
          }
        >
          {data.prescriptions.length === 0 ? (
            <p className="text-sm text-[#5a6b62]">No active prescriptions on file yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.prescriptions.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 rounded-2xl bg-teal-50/50 px-3 py-3">
                  <div>
                    <p className="font-medium text-[#0c1a14]">{p.medicineName}</p>
                    <p className="text-xs text-[#5a6b62]">
                      {p.rxReference || "No Rx ref"} · {p.refillsRemaining ?? 0} refills left
                    </p>
                  </div>
                  <Link
                    href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                    className="shrink-0 rounded-full bg-[#0d6e5a] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Refill
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent refill requests"
          action={
            <Link href="/portal/refills/new" className="text-sm font-medium text-[#0d6e5a]">
              New request
            </Link>
          }
        >
          {data.refills.length === 0 ? (
            <p className="text-sm text-[#5a6b62]">No refill requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.refills.slice(0, 5).map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#0c1a14]">{r.medicineName}</p>
                      <p className="text-xs text-[#5a6b62]">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={meta.color}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Notifications">
          {data.notifications.length === 0 ? (
            <p className="text-sm text-[#5a6b62]">You&apos;re all caught up.</p>
          ) : (
            <ul className="space-y-3">
              {data.notifications.map((n) => (
                <li key={n.id} className="rounded-2xl border border-teal-900/5 px-3 py-3">
                  <p className="text-sm font-medium text-[#0c1a14]">{n.title}</p>
                  <p className="mt-0.5 text-xs text-[#5a6b62]">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Activity timeline">
          <ul className="space-y-3">
            {data.timeline.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                <div>
                  <p className="text-sm font-medium text-[#0c1a14]">{e.title}</p>
                  {e.description && <p className="text-xs text-[#5a6b62]">{e.description}</p>}
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </PortalShell>
  );
}
