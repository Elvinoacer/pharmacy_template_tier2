import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminDeleteMedicationAction } from "@/app/actions/admin";
import { AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import ConfirmSubmitButton from "@/app/components/admin/ConfirmSubmitButton";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { listActiveCategoryOptions } from "@/app/lib/medication-categories";
import { formatDateTime } from "@/app/lib/time";
import { Pill, Plus, Search, X, Tag, Package, Pencil, Trash2, Boxes } from "lucide-react";
import { MedicationBulkActions } from "@/app/components/admin/MedicationBulkActions";

export const metadata = { title: "Medications" };

const PAGE_SIZE = 25;

/** Plain JSON-safe row for RSC rendering (no Prisma Decimal instances). */
type MedRow = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  publicListing: boolean;
  active: boolean;
  syncedAt: Date | null;
};

function toMedRow(m: {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  price: unknown;
  stockQty: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  publicListing: boolean;
  active: boolean;
  syncedAt: Date | null;
}): MedRow {
  return {
    id: m.id,
    name: m.name,
    category: m.category || "general",
    sku: m.sku,
    price: Number(m.price ?? 0),
    stockQty: m.stockQty ?? 0,
    lowStockThreshold: m.lowStockThreshold ?? 10,
    overTheCounter: Boolean(m.overTheCounter),
    publicListing: Boolean(m.publicListing),
    active: Boolean(m.active),
    syncedAt: m.syncedAt,
  };
}

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

  // Defensive: if the medications table is missing or the DB is briefly
  // unreachable, render an empty catalog instead of the admin error page.
  // (Public /medicines already used this pattern.)
  let total = 0;
  let medications: MedRow[] = [];
  let categoryList: Array<{ slug: string; name: string }> = [];
  let loadError: string | null = null;

  try {
    const [count, rows, categories] = await Promise.all([
      prisma.medication.count({ where }),
      prisma.medication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
      }),
      listActiveCategoryOptions(),
    ]);
    total = count;
    medications = rows.map(toMedRow);
    categoryList = categories;
  } catch (err) {
    console.error("[admin/medications] Failed to load catalog:", err);
    loadError =
      "Could not load the medication catalog. If this is a fresh deploy, run `npm run db:migrate` against production.";
  }

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  let paged = medications;
  if (!loadError && page > 1) {
    try {
      const rows = await prisma.medication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      });
      paged = rows.map(toMedRow);
    } catch (err) {
      console.error("[admin/medications] Failed to load page:", err);
      paged = [];
    }
  }

  return (
    <AdminShell
      user={user}
      title="Medication catalog"
      subtitle={`${total} medications · OTC, prescription, and stock sync`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/medications/categories"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
          >
            <Tag className="h-3.5 w-3.5" /> Categories
          </Link>
          <Link
            href="/admin/medications/new"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/20 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/40"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            <span>New Medication</span>
          </Link>
        </div>
      }
    >
      {loadError && (
        <div className="admin-alert-error mb-4">
          <span>{loadError}</span>
        </div>
      )}

      {/* Search + filter — pure GET form (no client handlers on this RSC page) */}
      <form className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl bg-white/50 p-2 shadow-sm ring-1 ring-black/5 backdrop-blur-xl dark:bg-black/20 dark:ring-white/10" method="get">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search name, SKU, description…"
            className="w-full rounded-xl bg-transparent py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition-colors hover:bg-black/5 focus:bg-white dark:hover:bg-white/5 dark:focus:bg-black/40"
          />
          {q && (
            <Link
              href={category ? `/admin/medications?category=${encodeURIComponent(category)}` : "/admin/medications"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-white/20 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <div className="hidden h-6 w-px bg-gray-200 dark:bg-gray-700 sm:block" />
        <select name="category" defaultValue={category || ""} className="cursor-pointer appearance-none rounded-xl bg-transparent py-2.5 pl-4 pr-10 text-sm font-medium outline-none transition-colors hover:bg-black/5 focus:bg-white dark:hover:bg-white/5 dark:focus:bg-black/40">
          <option value="">All categories</option>
          {categoryList.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="group flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-md dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          <Search className="h-4 w-4 transition-transform group-hover:scale-110" /> Search
        </button>
      </form>

      {/* POS sync banner */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">Automate with POS Integration</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Keep your inventory perfectly synced. Automatically update medications, stock counts, images, and descriptions from your pharmacy POS.
              Contact <strong className="text-indigo-600 dark:text-indigo-400">0790670542</strong> for integration setup. Once configured,
              POST to <code className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-xs text-indigo-600 dark:text-indigo-400">/api/integrations/pos</code> with your{" "}
              <code className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-xs text-indigo-600 dark:text-indigo-400">POS_API_KEY</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="mb-5">
          <h2 className="text-sm font-semibold admin-text">Medication Catalog</h2>
          <p className="mt-0.5 text-xs admin-muted">{`Viewing ${paged.length} of ${total} total medications`}</p>
        </div>
          {paged.length === 0 ? (
            <AdminEmptyState
              icon={Pill}
              title="No medications yet"
              description="Click the 'New Medication' button above to add your first drug to the catalog."
            />
          ) : (
            <>
            <MedicationBulkActions
              rows={paged.map((m) => ({
                id: m.id,
                name: m.name,
                active: m.active,
                publicListing: m.publicListing,
              }))}
            />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paged.map((m) => {
                const lowStock = m.stockQty <= m.lowStockThreshold;
                return (
                  <li
                    key={m.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/60 bg-white/40 p-5 shadow-sm ring-1 ring-black/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 hover:ring-emerald-500/30 dark:border-white/10 dark:bg-black/20 dark:ring-white/10 dark:hover:ring-emerald-500/50"
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{m.name}</p>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Link
                            href={`/admin/medications/${m.id}`}
                            className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-400"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <form action={adminDeleteMedicationAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <ConfirmSubmitButton
                              message={`Are you sure you want to delete ${m.name}?`}
                              title="Delete"
                              className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-rose-100 hover:text-rose-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-rose-500/20 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </div>
                      
                      <div className="mb-4 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {m.category.replace(/-/g, " ")}
                        </span>
                        {m.overTheCounter && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <Boxes className="h-3 w-3" /> OTC
                          </span>
                        )}
                        {m.publicListing && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                            <Tag className="h-3 w-3" /> Public
                          </span>
                        )}
                        {!m.active && (
                          <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between rounded-xl bg-gray-50/50 p-3 dark:bg-white/5">
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        KES {m.price}
                      </span>
                      <div className="text-right">
                        <span className={`block text-xs font-bold ${lowStock ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {m.stockQty} in stock
                        </span>
                        {m.sku && (
                          <span className="block font-mono text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            SKU: {m.sku}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          )}

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
