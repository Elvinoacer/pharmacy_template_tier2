import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { formatDate } from "@/app/lib/time";
import { FileText, Plus, Search, X, Activity, DollarSign } from "lucide-react";

export const metadata = { title: "Prescriptions" };

const PAGE_SIZE = 25;
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  on_hold: "bg-amber-500/15 text-amber-700",
  expired: "bg-slate-500/15 text-slate-600",
  discontinued: "bg-rose-500/15 text-rose-600",
};

export default async function AdminPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const q = sp.q?.trim() || undefined;
  const status = sp.status || undefined;

  const where: Prisma.PrescriptionWhereInput = {
    ...(status ? { status: status as "active" | "on_hold" | "expired" | "discontinued" } : {}),
    ...(q
      ? {
          OR: [
            { medicineName: { contains: q, mode: "insensitive" as const } },
            { rxReference: { contains: q, mode: "insensitive" as const } },
            { prescriber: { contains: q, mode: "insensitive" as const } },
            { customer: { fullName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  // Adherence is a newer relation — fall back gracefully if the table is missing.
  const includeBase = {
    customer: { select: { id: true, fullName: true } },
    _count: { select: { refillRequests: true } },
  } as const;

  let total = 0;
  let prescriptions: Awaited<ReturnType<typeof loadPrescriptions>> = [];
  let counts: Record<string, number> = {};

  async function loadPrescriptions(skip = 0) {
    try {
      return await prisma.prescription.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true } },
          _count: { select: { refillRequests: true, adherence: true } },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip,
      });
    } catch {
      // Older DBs without prescription_adherence still list prescriptions.
      const rows = await prisma.prescription.findMany({
        where,
        include: includeBase,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip,
      });
      return rows.map((r) => ({
        ...r,
        _count: { refillRequests: r._count.refillRequests, adherence: 0 },
      }));
    }
  }

  try {
    const [count, rows, statusCounts] = await Promise.all([
      prisma.prescription.count({ where }),
      loadPrescriptions(0),
      prisma.prescription.groupBy({ by: ["status"], _count: true }),
    ]);
    total = count;
    prescriptions = rows;
    for (const s of statusCounts) counts[s.status] = s._count;
  } catch (err) {
    console.error("[admin/prescriptions] Failed to load:", err);
  }

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged =
    page === 1
      ? prescriptions
      : await loadPrescriptions((page - 1) * PAGE_SIZE).catch(() => []);

  return (
    <AdminShell
      user={user}
      title="Prescriptions"
      subtitle={`${total} on file · create, assign, and track adherence`}
      actions={
        <Link
          href="/admin/prescriptions/new"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> New prescription
        </Link>
      }
    >
      {/* Status chips */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link
          href={q ? `/admin/prescriptions?q=${encodeURIComponent(q)}` : "/admin/prescriptions"}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !status ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]" : "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)]"
          }`}
        >
          All <span className="rounded-full bg-black/15 px-1.5 text-[10px]">{total}</span>
        </Link>
        {["active", "on_hold", "expired", "discontinued"].map((s) => (
          <Link
            key={s}
            href={`/admin/prescriptions?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition capitalize ${
              status === s ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]" : "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)]"
            }`}
          >
            {s.replace("_", " ")}
            <span className="rounded-full bg-black/15 px-1.5 text-[10px]">{counts[s] || 0}</span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search medicine, Rx ref, prescriber, customer…"
            className="input-admin pl-9"
          />
          {q && (
            <Link
              href={status ? `/admin/prescriptions?status=${status}` : "/admin/prescriptions"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-110"
        >
          <Search className="h-3.5 w-3.5" /> Search
        </button>
      </form>

      <AdminPanel>
        {paged.length === 0 ? (
          <AdminEmptyState
            icon={FileText}
            title="No prescriptions match your filters"
            description="Try clearing the status filter or search query."
          />
        ) : (
          <div className="overflow-x-auto scroll-admin">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Medicine</th>
                  <th>Rx ref</th>
                  <th>Dosage</th>
                  <th>Refills</th>
                  <th>Next refill</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Adherence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--admin-hover)]">
                    <td>
                      {p.customer ? (
                        <Link
                          href={`/admin/customers/${p.customer.id}`}
                          className="font-semibold admin-text hover:admin-accent-text hover:underline"
                        >
                          {p.customer.fullName}
                        </Link>
                      ) : (
                        <span className="text-xs admin-soft">—</span>
                      )}
                    </td>
                    <td>
                      <p className="font-medium admin-text">{p.medicineName}</p>
                      {p.prescriber && (
                        <p className="text-[10px] admin-soft">by {p.prescriber}</p>
                      )}
                    </td>
                    <td>
                      <p className="font-mono text-[10px] admin-soft">{p.rxReference || "—"}</p>
                    </td>
                    <td>
                      <p className="text-xs admin-text">{p.dosage || "—"}</p>
                      {p.schedule && (
                        <p className="text-[10px] admin-soft">{p.schedule}</p>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-xs admin-text">{p.refillsRemaining ?? 0}</span>
                    </td>
                    <td className="text-xs admin-muted">
                      {p.nextRefillDue ? formatDate(p.nextRefillDue) : "—"}
                    </td>
                    <td className="text-xs admin-text">
                      {p.unitPrice ? (
                        <span className="inline-flex items-center gap-0.5">
                          <DollarSign className="h-2.5 w-2.5" /> {Number(p.unitPrice)}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[p.status]}`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      {p._count.adherence > 0 ? (
                        <Link
                          href={`/admin/prescriptions/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold admin-accent-text hover:underline"
                          title={`${p._count.adherence} adherence logs`}
                        >
                          <Activity className="h-3 w-3" /> {p._count.adherence} logs
                        </Link>
                      ) : (
                        <span className="text-xs admin-soft">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/prescriptions/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/prescriptions"
        queryParams={{ q, status }}
        variant="admin"
      />
    </AdminShell>
  );
}

