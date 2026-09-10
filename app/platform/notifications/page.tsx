import { AlertTriangle, CheckCircle2, Clock3, Send } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Delivery" };
export const dynamic = "force-dynamic";

const statusClass = (status: string) => {
  const value = status.toLowerCase();
  if (value === "sent" || value === "delivered") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200";
  }
  if (value === "failed" || value === "dead" || value === "dead_letter") {
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200";
  }
  return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200";
};

export default async function PlatformNotificationsPage() {
  const rows = await prismaUnscoped.notificationDelivery
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { pharmacy: { select: { name: true } } },
    })
    .catch(() => []);

  const sent = rows.filter((row) => ["sent", "delivered"].includes(row.status.toLowerCase())).length;
  const failed = rows.filter((row) => ["failed", "dead", "dead_letter"].includes(row.status.toLowerCase())).length;
  const pending = Math.max(rows.length - sent - failed, 0);

  const metrics = [
    { label: "Recent deliveries", value: rows.length, icon: Send },
    { label: "Sent", value: sent, icon: CheckCircle2 },
    { label: "Pending", value: pending, icon: Clock3 },
    { label: "Needs attention", value: failed, icon: AlertTriangle },
  ];

  return (
    <PlatformPage
      title="Notification delivery"
      description="Queued, sent, failed and dead-lettered tenant messages. Failures are surfaced first visually so operational issues are easy to spot."
    >
      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4 sm:gap-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-[#dce7e1] bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#718078] dark:text-teal-100/55">
                {label}
              </p>
              <Icon className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-200/70" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#15231c] dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <PlatformTable
        headers={["Pharmacy", "Channel", "Status", "Attempts", "Error"]}
        empty="No deliveries yet."
        rows={rows.map((r) => [
          <span key={`${r.id}-pharmacy`} className="font-semibold">{r.pharmacy.name}</span>,
          <span key={`${r.id}-channel`} className="capitalize">{r.channel}</span>,
          <span
            key={`${r.id}-status`}
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(r.status)}`}
          >
            {r.status.replace(/_/g, " ")}
          </span>,
          <span key={`${r.id}-attempt`} className="tabular-nums">{r.attempt}</span>,
          <span
            key={`${r.id}-error`}
            className={r.error ? "text-rose-700 dark:text-rose-200" : "text-[#89958e] dark:text-teal-100/40"}
          >
            {r.error || "—"}
          </span>,
        ])}
      />
    </PlatformPage>
  );
}
