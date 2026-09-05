import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { ArrowLeft, AlertTriangle, Pencil, TrendingUp } from "lucide-react";

export const metadata = { title: "Incomplete Medications" };

const PAGE_SIZE = 25;

export default async function IncompleteMedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const statusFilter = sp.status || undefined;

  const where = {
    ...(statusFilter ? { enrichmentStatus: statusFilter } : { enrichmentStatus: { in: ["minimal", "partial"] } }),
  };

  const [total, rows] = await Promise.all([
    prisma.medicationMaster.count({ where }).catch(() => 0),
    prisma.medicationMaster
      .findMany({
        where,
        orderBy: [{ enrichmentScore: "asc" }, { updatedAt: "desc" }],
        take: PAGE_SIZE,
        include: {
          dosageForm: { select: { value: true } },
          pharmacyInventory: { take: 1, select: { id: true } },
        },
      })
      .catch(() => []),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged =
    page === 1
      ? rows
      : await prisma.medicationMaster
          .findMany({
            where,
            orderBy: [{ enrichmentScore: "asc" }, { updatedAt: "desc" }],
            take: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE,
            include: {
              dosageForm: { select: { value: true } },
              pharmacyInventory: { take: 1, select: { id: true } },
            },
          })
          .catch(() => []);

  return (
    <AdminShell
      user={user}
      title="Missing medicine details"
      subtitle="Find incomplete records and add the information staff and patients need."
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/medications"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Catalog
        </Link>
        <Link
          href="/admin/medications/metrics"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Metrics
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "minimal", "partial", "complete"].map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/medications/incomplete" : `/admin/medications/incomplete?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              (statusFilter || "incomplete") === s ||
              (s === "all" && !statusFilter) ||
              (s === "minimal" && statusFilter === "minimal") ||
              (s === "partial" && statusFilter === "partial") ||
              (s === "complete" && statusFilter === "complete")
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-[var(--admin-inset)] admin-muted hover:text-[var(--admin-text)]"
            }`}
          >
            {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {paged.length === 0 ? (
        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-12 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 admin-soft mb-3" />
          <p className="text-sm font-semibold admin-text">No incomplete medications</p>
          <p className="mt-1 text-xs admin-soft">All MedicationMaster records are fully enriched. Nice work.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {paged.map((m) => {
            const inv = m.pharmacyInventory[0];
            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold admin-text">{m.name}</p>
                  <p className="mt-0.5 text-xs admin-muted">
                    {m.genericName} · {m.dosageForm?.value || "no form"} · {m.category.replace(/-/g, " ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      m.enrichmentScore >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : m.enrichmentScore >= 40
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}>
                      {m.enrichmentScore}%
                    </div>
                    <div className="text-xs admin-soft">{m.enrichmentStatus}</div>
                  </div>
                  {inv && (
                    <Link
                      href={`/admin/medications/${inv.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      <Pencil className="h-3 w-3" /> Enrich
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/medications/incomplete"
        queryParams={statusFilter ? { status: statusFilter } : {}}
        variant="admin"
      />
    </AdminShell>
  );
}
