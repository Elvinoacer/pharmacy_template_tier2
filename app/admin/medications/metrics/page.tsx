import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Library, Sparkles, ScanBarcode, FileSpreadsheet, Pencil, Plug } from "lucide-react";

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
    last30Days,
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
    prisma.medicationMaster
      .count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } })
      .catch(() => 0),
  ]);

  const methodCounts: Record<string, number> = {};
  for (const m of byMethod) methodCounts[m.acquisitionMethod] = m._count._all;

  const enrichmentCounts: Record<string, number> = {};
  for (const e of byEnrichment) enrichmentCounts[e.enrichmentStatus] = e._count._all;

  const reuseRate =
    totalMasters > 0
      ? Math.round(
          ((methodCounts["shared_library"] || 0) + (methodCounts["barcode"] || 0)) /
            totalMasters *
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
      <div className="mb-6">
        <Link
          href="/admin/medications"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Catalog
        </Link>
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Shared Library Size" value={totalMasters} sub="MedicationMaster records" />
          <StatCard label="Pharmacy Inventory" value={totalInventory} sub="PharmacyInventory rows" />
          <StatCard label="Added (last 30 days)" value={last30Days} sub="New masters this month" />
          <StatCard label="Reuse Rate" value={`${reuseRate}%`} sub="Library/barcode vs manual entry" highlight={reuseRate >= 50} />
        </div>

        {/* Acquisition method breakdown */}
        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold admin-text">
            <TrendingUp className="h-4 w-4 admin-accent-text" /> Acquisition Method Breakdown
          </h2>
          <p className="mt-1 text-xs admin-soft">
            How medications entered the system. Watch shared_library + barcode grow over time — that&apos;s the feedback loop working.
          </p>
          <div className="mt-4 space-y-3">
            {METHOD_META.map((m) => {
              const count = methodCounts[m.key] || 0;
              const pct = totalMasters > 0 ? Math.round((count / totalMasters) * 100) : 0;
              const Icon = m.icon;
              return (
                <div key={m.key} className="flex items-center gap-3">
                  <div className="flex w-40 shrink-0 items-center gap-2 text-xs font-semibold admin-text">
                    <Icon className="h-3.5 w-3.5 admin-muted" /> {m.label}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-inset)]">
                      <div className={`h-full ${m.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right text-xs font-bold admin-text">
                    {count} <span className="admin-soft">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enrichment status */}
        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-6">
          <h2 className="text-sm font-bold admin-text">Enrichment Status (Phase 5)</h2>
          <p className="mt-1 text-xs admin-soft">How complete the clinical data is across the shared library.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["complete", "partial", "minimal"].map((s) => {
              const count = enrichmentCounts[s] || 0;
              const pct = totalMasters > 0 ? Math.round((count / totalMasters) * 100) : 0;
              const color =
                s === "complete" ? "text-emerald-600 dark:text-emerald-400" :
                s === "partial" ? "text-amber-600 dark:text-amber-400" :
                "text-rose-600 dark:text-rose-400";
              return (
                <Link
                  key={s}
                  href={`/admin/medications/incomplete?status=${s}`}
                  className="rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-4 transition hover:border-[var(--admin-accent)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide admin-soft">{s}</p>
                  <p className={`mt-1 text-2xl font-black ${color}`}>{count}</p>
                  <p className="text-xs admin-soft">{pct}% of library</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent additions */}
        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-6">
          <h2 className="text-sm font-bold admin-text">Recently Added (last 5)</h2>
          <ul className="mt-3 space-y-2">
            {recentMasters.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium admin-text">{m.name}</span>
                <span className="shrink-0 admin-soft">
                  via <strong className="admin-text">{m.acquisitionMethod.replace(/_/g, " ")}</strong>
                </span>
              </li>
            ))}
            {recentMasters.length === 0 && (
              <li className="text-xs admin-soft">No medications yet — add your first via the acquisition chooser.</li>
            )}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: number | string; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--admin-border-2)] bg-[var(--admin-card)]"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide admin-soft">{label}</p>
      <p className="mt-2 text-3xl font-black admin-text">{value}</p>
      <p className="mt-1 text-xs admin-soft">{sub}</p>
    </div>
  );
}
