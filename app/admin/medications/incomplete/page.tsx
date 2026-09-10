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

  const [total, firstPageRows] = await Promise.all([
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
      ? firstPageRows
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
      subtitle="Start with the lowest enrichment scores and fill the details that improve dispensing safety and patient information."
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
          <Link
            href="/admin/medications"
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-0 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" /> Catalogue
          </Link>
          <Link
            href="/admin/medications/metrics"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] sm:min-h-0 sm:rounded-full sm:py-2"
          >
            <TrendingUp className="h-3.5 w-3.5" /> Metrics
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold admin-text">Enrichment queue</p>
              <p className="mt-0.5 text-[11px] admin-muted">{total} record{total === 1 ? "" : "s"} in this view</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Lowest score first
            </span>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <nav aria-label="Enrichment status filter" className="flex min-w-max gap-2">
              {[
                { value: "", label: "Needs work" },
                { value: "minimal", label: "Minimal" },
                { value: "partial", label: "Partial" },
                { value: "complete", label: "Complete" },
              ].map((item) => {
                const active = (statusFilter || "") === item.value;
                const href = item.value
                  ? `/admin/medications/incomplete?status=${item.value}`
                  : "/admin/medications/incomplete";
                return (
                  <Link
                    key={item.label}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center rounded-full px-3 text-xs font-semibold transition ${
                      active
                        ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300"
                        : "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {paged.length === 0 ? (
          <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-5 py-10 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--admin-inset)]">
              <AlertTriangle className="h-6 w-6 admin-soft" />
            </div>
            <p className="mt-4 text-sm font-semibold admin-text">Nothing needs attention in this view</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 admin-soft">Try another status, or return to the medicine catalogue to continue inventory work.</p>
          </div>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {paged.map((medicine) => {
              const inventory = medicine.pharmacyInventory[0];
              const scoreClass =
                medicine.enrichmentScore >= 80
                  ? "text-emerald-600 dark:text-emerald-300"
                  : medicine.enrichmentScore >= 40
                    ? "text-amber-600 dark:text-amber-300"
                    : "text-rose-600 dark:text-rose-300";

              return (
                <li
                  key={medicine.id}
                  className="group rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 transition duration-200 hover:border-emerald-500/20 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold admin-text">{medicine.name}</p>
                      <p className="mt-1 text-xs leading-5 admin-muted">
                        {medicine.genericName} · {medicine.dosageForm?.value || "No dosage form"}
                      </p>
                      <p className="mt-1 text-[11px] capitalize admin-soft">{medicine.category.replace(/-/g, " ")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-lg font-black ${scoreClass}`}>{medicine.enrichmentScore}%</p>
                      <p className="text-[10px] capitalize admin-soft">{medicine.enrichmentStatus}</p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--admin-inset)]" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-[var(--admin-accent)] transition-[width] duration-500"
                      style={{ width: `${Math.max(4, Math.min(100, medicine.enrichmentScore))}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--admin-border-2)] pt-3">
                    <p className="text-[11px] admin-muted">
                      {inventory ? "Inventory record available" : "Master record only"}
                    </p>
                    {inventory ? (
                      <Link
                        href={`/admin/medications/${inventory.id}`}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Enrich
                      </Link>
                    ) : (
                      <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-[10px] font-medium admin-soft">No pharmacy item</span>
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
      </div>
    </AdminShell>
  );
}
