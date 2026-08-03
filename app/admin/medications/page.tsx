import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateMedicationAction, adminDeleteMedicationAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import MedicationForm from "@/app/components/admin/MedicationForm";
import { Pagination, parsePageParam } from "@/app/components/Pagination";
import { formatDateTime } from "@/app/lib/time";
import { Pill, Plus, Search, X, Tag, Package, Pencil, Trash2, Boxes } from "lucide-react";

export const metadata = { title: "Medications" };

const PAGE_SIZE = 25;

export default async function AdminMedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const category = sp.category || undefined;

  const where = {
    ...(category ? { category } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, medications, categories] = await Promise.all([
    prisma.medication.count({ where }),
    prisma.medication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.medication.findMany({
      where: { active: true },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged = page === 1
    ? medications
    : await prisma.medication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });

  const categoryList = categories.map((c) => c.category).sort();

  return (
    <AdminShell
      user={user}
      title="Medication catalog"
      subtitle={`${total} medications · OTC, prescription, and stock sync`}
      actions={
        <Link
          href="/admin/medications/new"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> New medication
        </Link>
      }
    >
      {/* Search + filter */}
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search name, SKU, description…"
            className="input-admin pl-9"
          />
          {q && (
            <Link
              href={category ? `/admin/medications?category=${category}` : "/admin/medications"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
        <select
          name="category"
          defaultValue={category || ""}
          onChange={(e) => {
            const v = e.target.value;
            window.location.href = v
              ? `/admin/medications?category=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`
              : q ? `/admin/medications?q=${encodeURIComponent(q)}` : "/admin/medications";
          }}
          className="input-admin !w-auto"
        >
          <option value="">All categories</option>
          {categoryList.map((c) => (
            <option key={c} value={c}>{c.replace(/-/g, " ")}</option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-110"
        >
          <Search className="h-3.5 w-3.5" /> Search
        </button>
      </form>

      {/* POS sync banner */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--admin-accent)]/20 bg-[var(--admin-accent)]/[0.04] p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
          <Package className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold admin-text">Sync with your POS</p>
          <p className="mt-0.5 text-xs admin-muted">
            To automatically sync medications, stock counts, images, and descriptions from your pharmacy POS,
            contact <strong className="admin-text">0790670542</strong> for integration setup. Once configured,
            POST to <code className="md-code">/api/integrations/pos</code> with your <code className="md-code">POS_API_KEY</code> to upsert medications.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Add medication" description="Create or update a drug in the catalog">
          <MedicationForm action={adminCreateMedicationAction} />
        </AdminPanel>

        <AdminPanel title="Catalog" description={`${total} medications`}>
          {paged.length === 0 ? (
            <AdminEmptyState
              icon={Pill}
              title="No medications yet"
              description="Add your first medication using the form on the left."
            />
          ) : (
            <ul className="space-y-2">
              {paged.map((m) => {
                const lowStock = m.stockQty <= m.lowStockThreshold;
                return (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold admin-text">{m.name}</p>
                        {m.overTheCounter && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <Boxes className="h-2.5 w-2.5" /> OTC
                          </span>
                        )}
                        {m.publicListing && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            <Tag className="h-2.5 w-2.5" /> public
                          </span>
                        )}
                        {!m.active && (
                          <span className="rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            inactive
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs admin-muted">{m.category.replace(/-/g, " ")}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] admin-muted">
                        <span className="font-bold admin-text">KES {Number(m.price)}</span>
                        <span>·</span>
                        <span className={lowStock ? "text-rose-600 font-semibold" : ""}>
                          {m.stockQty} in stock {lowStock && "(low!)"}
                        </span>
                        {m.sku && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{m.sku}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        href={`/admin/medications/${m.id}`}
                        className="rounded-full p-1 admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <form action={adminDeleteMedicationAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="rounded-full p-1 admin-soft transition hover:bg-rose-500/10 hover:text-rose-600"
                          title="Delete"
                          onClick={(e) => {
                            if (!confirm(`Delete ${m.name}?`)) e.preventDefault();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/medications"
        queryParams={{ q, category }}
        variant="admin"
      />

      <p className="mt-4 text-[10px] admin-soft">
        Last sync: {paged[0]?.syncedAt ? formatDateTime(paged[0].syncedAt) : "never"}
      </p>
    </AdminShell>
  );
}
