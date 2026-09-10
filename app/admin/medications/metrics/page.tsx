import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Library, Sparkles, ScanBarcode, FileSpreadsheet, Pencil, Plug, Activity } from "lucide-react";

export const metadata = { title: "Medication Metrics" };

export default async function MetricsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [
    totalMasters,
    byMethod,
    byEnrichment,
    recentMasters,
    totalInventory,
    last30DayRows,
  ] = await Promise.all([
    prisma.medicationMaster.count().catch(() => 0),
    prisma.medicationMaster
      .groupBy({ by: ["acquisitionMethod"], _count: { _all: true } })
      .catch(() => []),
    prisma.medicationMaster
      .groupBy({ by: ["enrichmentStatus"], _count: { _all: true } })
      .catch(() => []),
    prisma.medicationMaster
      .findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, acquisitionMethod: true, createdAt: true } })
      .catch(() => []),
    prisma.pharmacyInventory.count().catch(() => 0),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "medication_masters"
      WHERE "created_at" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    `.catch(() => []),
  ]);

  const last30Days = Number(last30DayRows[0]?.count ?? 0);
  const methodCounts: Record<string, number> = {};
  for (const m of byMethod) methodCounts[m.acquisitionMethod] = m._count._all;

  const enrichmentCounts: Record<string, number> = {};
  for (const e of byEnrichment) enrichmentCounts[e.enrichmentStatus] = e._count._all;

  const reuseRate =
    totalMasters > 0
      ? Math.round(
          (((methodCounts["shared_library"] || 0) + (methodCounts["barcode"] || 0)) /
            totalMasters) *
            100,
        )
      : 0;

  const METHOD_META: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
    { key: "shared_library", label: "Shared Library", icon: Library, color: "bg-emerald-500" },
    { key: "barcode", label: "Barcode Scan", icon: ScanBarcode, color: "bg-indigo-500" },
    { key: "ai_import", label: "AI Import", icon: Sparkles, color: "bg-purple-500" },
    { key: "csv_import", label: "CSV Import", icon: FileSpreadsheet, color: "bg-amber-500" },
    { key: "manual", label: "Manual Entry", icon: Pencil, color: "bg-slate-500" },
    { key: "pos_sync", label: "POS Sync", icon: Plug, color: "bg-blue-500" },
    { key: "unknown", label: "Unknown / Legacy", icon: Pencil, color: "bg-gray-400" },
  ];

  return (
    <AdminShell
      user={user}
      title="Catalogue activity"
      subtitle="See how medicines are added and how often existing records are reused."
    >
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/medications"
            className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-3.5 text-sm font-medium admin-muted transition hover:border-[var(--admin-accent)] hover:admin-accent-text"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to catalogue
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-accent-soft)] px-3 py-1.5 text-xs font-semibold admin-accent-text">
            <Activity className="h-3.5 w-3.5" /> Live catalogue signals
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Shared library" value={totalMasters} sub="master records" />
          <StatCard label="Inventory" value={totalInventory} sub="pharmacy rows" />
          <StatCard label="Last 30 days" value={last30Days} sub="new medicines" />
          <StatCard label="Reuse rate" value={`${reuseRate}%`} sub="library + barcode" highlight={reuseRate >= 50} />
        </div>

        <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex items-start gap-3">
            <span className="admin-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <TrendingUp className="h-4 w-4 admin-accent-text" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold admin-text">Acquisition method</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed admin-soft">
                Where catalogue records come from. A growing shared-library and barcode share means less repeated manual entry.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3.5">
            {METHOD_META.map((m) => {
              const count = methodCounts[m.key] || 0;
              const pct = totalMasters > 0 ? Math.round((count / totalMasters) * 100) : 0;
              const Icon = m.icon;
              return (
                <div
                  key={m.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2.5 transition-colors hover:bg-[var(--admin-hover)] sm:grid-cols-[10rem_minmax(0,1fr)_5rem] sm:bg-transparent sm:px-0 sm:py-0"
                >
                  <div className="flex min-w-0 items-center gap-2 text-xs font-semibold admin-text">
                    <Icon className="h-3.5 w-3.5 shrink-0 admin-muted" />
                    <span className="truncate">{m.label}</span>
                  </div>
                  <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-inset-2)]">
                      <div className={`h-full rounded-full ${m.color} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs font-bold admin-text">
                    {count} <span className="font-medium admin-soft">· {pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <h2 className="text-sm font-bold admin-text">Clinical enrichment</h2>
          <p className="mt-1 text-xs leading-relaxed admin-soft">Prioritize incomplete records before they reach high-traffic workflows.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {["complete", "partial", "minimal"].map((s) => {
              const count = enrichmentCounts[s] || 0;
              const pct = totalMasters > 0 ? Math.round((count / totalMasters) * 100) : 0;
              const color =
                s === "complete"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : s === "partial"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-rose-700 dark:text-rose-300";
              return (
                <Link
                  key={s}
                  href={`/admin/medications/incomplete?status=${s}`}
                  className="group min-w-0 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-3 transition-all hover:-translate-y-0.5 hover:border-[var(--admin-accent)] hover:bg-[var(--admin-hover)] sm:p-4"
                >
                  <p className="truncate text-[10px] font-bold uppercase tracking-wide admin-soft sm:text-xs">{s}</p>
                  <p className={`mt-1 text-xl font-black sm:text-2xl ${color}`}>{count}</p>
                  <p className="mt-0.5 text-[10px] admin-soft sm:text-xs">{pct}%</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold admin-text">Recently added</h2>
              <p className="mt-1 text-xs admin-soft">Latest five catalogue records.</p>
            </div>
            <span className="text-xs font-semibold admin-soft">Newest first</span>
          </div>
          <ul className="mt-3 divide-y divide-[var(--admin-border-2)]">
            {recentMasters.map((m) => (
              <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-xs first:pt-1 last:pb-0">
                <span className="truncate font-semibold admin-text">{m.name}</span>
                <span className="max-w-[9rem] truncate rounded-full bg-[var(--admin-inset)] px-2 py-1 text-[10px] font-semibold capitalize admin-muted sm:max-w-none sm:text-xs">
                  {m.acquisitionMethod.replace(/_/g, " ")}
                </span>
              </li>
            ))}
            {recentMasters.length === 0 && (
              <li className="py-4 text-xs admin-soft">No medications yet — add your first via the acquisition chooser.</li>
            )}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: number | string; sub: string; highlight?: boolean }) {
  return (
    <div
      className={`min-w-0 rounded-2xl border p-3.5 shadow-sm transition-transform hover:-translate-y-0.5 sm:p-5 ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-400/10"
          : "border-[var(--admin-border-2)] bg-[var(--admin-card)]"
      }`}
    >
      <p className="truncate text-[10px] font-bold uppercase tracking-wide admin-soft sm:text-xs">{label}</p>
      <p className="mt-1.5 truncate text-2xl font-black admin-text sm:mt-2 sm:text-3xl">{value}</p>
      <p className="mt-0.5 truncate text-[10px] admin-soft sm:mt-1 sm:text-xs">{sub}</p>
    </div>
  );
}
