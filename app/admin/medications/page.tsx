import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminDeleteMedicationAction } from "@/app/actions/admin";
import { AdminCard, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { listActiveCategoryOptions } from "@/app/lib/medication-categories";
import { formatDateTime } from "@/app/lib/time";
import {
  MedicationCatalog,
  type CatalogMed,
} from "@/app/components/admin/MedicationCatalog";
import {
  AlertTriangle,
  Boxes,
  FileText,
  Package,
  Pill,
  Plus,
  Search,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";

export const metadata = { title: "Medications" };

const PAGE_SIZE = 25;

/** Sentinel UUID when a filter must match zero rows (`id IN []` is invalid). */
const NONE_UUID = "00000000-0000-0000-0000-000000000000";

type SearchFilters = {
  q?: string;
  category?: string;
  stock?: string;
  type?: string;
  status?: string;
  listing?: string;
  page?: string;
};

function toCatalogMed(m: {
  id: string;
  sku: string | null;
  shelfLocation: string | null;
  supplier: string | null;
  price: unknown;
  purchasePrice: unknown;
  currentStock: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  publicListing: boolean;
  active: boolean;
  medicationMaster: {
    name: string;
    genericName: string;
    brandName: string | null;
    strengthDisplay: string | null;
    packSize: string | null;
    category: string;
    imageUrl: string | null;
    barcode: string | null;
    controlledDrug: boolean;
    controlledDrugSchedule: string | null;
    pediatricUse: boolean;
    requiresRefrigeration: boolean;
    enrichmentStatus: string;
    enrichmentScore: number;
    dosageForm: { value: string } | null;
    manufacturer: { name: string } | null;
  };
  _count: { prescriptions: number; orderItems: number };
}): CatalogMed {
  return {
    id: m.id,
    name: m.medicationMaster.name,
    genericName: m.medicationMaster.genericName,
    brandName: m.medicationMaster.brandName,
    strengthDisplay: m.medicationMaster.strengthDisplay,
    packSize: m.medicationMaster.packSize,
    category: m.medicationMaster.category || "general",
    imageUrl: m.medicationMaster.imageUrl,
    dosageForm: m.medicationMaster.dosageForm?.value ?? null,
    manufacturer: m.medicationMaster.manufacturer?.name ?? null,
    barcode: m.medicationMaster.barcode,
    sku: m.sku,
    shelfLocation: m.shelfLocation,
    supplier: m.supplier,
    price: Number(m.price ?? 0),
    purchasePrice: m.purchasePrice != null ? Number(m.purchasePrice) : null,
    currentStock: m.currentStock ?? 0,
    lowStockThreshold: m.lowStockThreshold ?? 10,
    overTheCounter: Boolean(m.overTheCounter),
    prescriptionRequired: Boolean(m.prescriptionRequired),
    publicListing: Boolean(m.publicListing),
    active: Boolean(m.active),
    controlledDrug: Boolean(m.medicationMaster.controlledDrug),
    controlledDrugSchedule: m.medicationMaster.controlledDrugSchedule,
    pediatricUse: Boolean(m.medicationMaster.pediatricUse),
    requiresRefrigeration: Boolean(m.medicationMaster.requiresRefrigeration),
    enrichmentStatus: m.medicationMaster.enrichmentStatus,
    enrichmentScore: m.medicationMaster.enrichmentScore ?? 0,
    prescriptionCount: m._count.prescriptions,
    orderItemCount: m._count.orderItems,
  };
}

/** Filters that map cleanly to Prisma (low/healthy stock need column-to-column compare). */
function buildBaseWhere(sp: SearchFilters): Prisma.PharmacyInventoryWhereInput {
  const q = sp.q?.trim() || undefined;
  const and: Prisma.PharmacyInventoryWhereInput[] = [];

  if (sp.category) {
    and.push({ medicationMaster: { category: sp.category } });
  }

  if (q) {
    and.push({
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { shelfLocation: { contains: q, mode: "insensitive" } },
        { supplier: { contains: q, mode: "insensitive" } },
        {
          medicationMaster: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { genericName: { contains: q, mode: "insensitive" } },
              { brandName: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ],
    });
  }

  if (sp.type === "otc") and.push({ overTheCounter: true });
  if (sp.type === "rx") and.push({ prescriptionRequired: true, overTheCounter: false });
  if (sp.type === "controlled") and.push({ medicationMaster: { controlledDrug: true } });

  if (sp.status === "active") and.push({ active: true });
  if (sp.status === "inactive") and.push({ active: false });

  if (sp.listing === "public") and.push({ publicListing: true });
  if (sp.listing === "private") and.push({ publicListing: false });

  if (sp.stock === "out") and.push({ currentStock: { lte: 0 } });

  return and.length ? { AND: and } : {};
}

export default async function AdminMedicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchFilters>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const category = sp.category || undefined;
  const stock = sp.stock || undefined;
  const type = sp.type || undefined;
  const status = sp.status || undefined;
  const listing = sp.listing || undefined;

  const baseWhere = buildBaseWhere({ q, category, stock, type, status, listing });

  const include = {
    medicationMaster: {
      select: {
        name: true,
        genericName: true,
        brandName: true,
        strengthDisplay: true,
        packSize: true,
        category: true,
        imageUrl: true,
        barcode: true,
        controlledDrug: true,
        controlledDrugSchedule: true,
        pediatricUse: true,
        requiresRefrigeration: true,
        enrichmentStatus: true,
        enrichmentScore: true,
        dosageForm: { select: { value: true } },
        manufacturer: { select: { name: true } },
      },
    },
    _count: { select: { prescriptions: true, orderItems: true } },
  } as const;

  let total = 0;
  let paged: CatalogMed[] = [];
  let categoryList: Array<{ slug: string; name: string }> = [];
  let loadError: string | null = null;
  let stats = {
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    otc: 0,
    rx: 0,
    publicListed: 0,
  };
  let lastSynced: Date | null = null;

  try {
    // Exact low-stock IDs (current_stock vs low_stock_threshold needs raw SQL).
    const lowRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM pharmacy_inventory
      WHERE current_stock > 0 AND current_stock <= low_stock_threshold
    `;
    const lowStockIds = lowRows.map((r) => r.id);

    let where: Prisma.PharmacyInventoryWhereInput = baseWhere;
    if (stock === "low") {
      where = {
        AND: [baseWhere, { id: { in: lowStockIds.length ? lowStockIds : [NONE_UUID] } }],
      };
    } else if (stock === "healthy") {
      where = {
        AND: [
          baseWhere,
          { currentStock: { gt: 0 } },
          ...(lowStockIds.length ? [{ id: { notIn: lowStockIds } }] : []),
        ],
      };
    }

    const [
      count,
      categories,
      totalAll,
      activeCount,
      outCount,
      otcCount,
      rxCount,
      publicCount,
      latestSync,
    ] = await Promise.all([
      prisma.pharmacyInventory.count({ where }),
      listActiveCategoryOptions(),
      prisma.pharmacyInventory.count(),
      prisma.pharmacyInventory.count({ where: { active: true } }),
      prisma.pharmacyInventory.count({ where: { currentStock: { lte: 0 } } }),
      prisma.pharmacyInventory.count({ where: { overTheCounter: true } }),
      prisma.pharmacyInventory.count({
        where: { prescriptionRequired: true, overTheCounter: false },
      }),
      prisma.pharmacyInventory.count({ where: { publicListing: true } }),
      prisma.pharmacyInventory.findFirst({
        where: { syncedAt: { not: null } },
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true },
      }),
    ]);

    total = count;
    categoryList = categories;
    stats = {
      total: totalAll,
      active: activeCount,
      lowStock: lowStockIds.length,
      outOfStock: outCount,
      otc: otcCount,
      rx: rxCount,
      publicListed: publicCount,
    };
    lastSynced = latestSync?.syncedAt ?? null;

    const pageNum = parsePageParam(sp.page, total, PAGE_SIZE);
    const pageRows = await prisma.pharmacyInventory.findMany({
      where,
      include,
      orderBy: [{ active: "desc" }, { medicationMaster: { name: "asc" } }],
      take: PAGE_SIZE,
      skip: (pageNum - 1) * PAGE_SIZE,
    });
    paged = pageRows.map(toCatalogMed);
  } catch (err) {
    console.error("[admin/medications] Failed to load catalog:", err);
    loadError =
      "Could not load the medication catalog. If this is a fresh deploy, run `npm run db:migrate` against production.";
  }

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const queryParams = { q, category, stock, type, status, listing };
  const hasFilters = Boolean(q || category || stock || type || status || listing);

  function filterHref(overrides: Partial<SearchFilters>) {
    const params = new URLSearchParams();
    const merged: SearchFilters = { q, category, stock, type, status, listing, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && k !== "page") params.set(k, v);
    }
    const s = params.toString();
    return s ? `/admin/medications?${s}` : "/admin/medications";
  }

  return (
    <AdminShell
      user={user}
      title="Medication catalog"
      subtitle={`${stats.total} in inventory · ${stats.active} active · manage stock, Rx links & public listing`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/medications/incomplete"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
            title="Incomplete medications (enrichment queue)"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Incomplete
          </Link>
          <Link
            href="/admin/medications/metrics"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
          >
            <TrendingUp className="h-3.5 w-3.5" /> Metrics
          </Link>
          <Link
            href="/admin/medications/categories"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
          >
            <Tag className="h-3.5 w-3.5" /> Categories
          </Link>
          <Link
            href="/admin/medications/add"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/20 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/40"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            <span>Add Medication</span>
          </Link>
        </div>
      }
    >
      {loadError && (
        <div className="admin-alert-error mb-4">
          <span>{loadError}</span>
        </div>
      )}

      {/* At-a-glance stats — clickable filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <AdminCard label="Total" value={stats.total} icon={Pill} accent="neutral" />
        <AdminCard label="Active" value={stats.active} icon={Package} accent="accent" />
        <Link href={filterHref({ stock: "low" })} className="block">
          <AdminCard
            label="Low stock"
            value={stats.lowStock}
            icon={AlertTriangle}
            accent={stats.lowStock > 0 ? "danger" : "neutral"}
            hint="Tap to filter"
          />
        </Link>
        <Link href={filterHref({ stock: "out" })} className="block">
          <AdminCard
            label="Out of stock"
            value={stats.outOfStock}
            icon={Package}
            accent={stats.outOfStock > 0 ? "danger" : "neutral"}
            hint="Tap to filter"
          />
        </Link>
        <Link href={filterHref({ type: "otc" })} className="block">
          <AdminCard label="OTC" value={stats.otc} icon={Boxes} accent="info" hint="Tap to filter" />
        </Link>
        <Link href={filterHref({ type: "rx" })} className="block">
          <AdminCard label="Rx only" value={stats.rx} icon={FileText} accent="info" hint="Tap to filter" />
        </Link>
        <Link href={filterHref({ listing: "public" })} className="block">
          <AdminCard
            label="Public"
            value={stats.publicListed}
            icon={Tag}
            accent="accent"
            hint="On catalog"
          />
        </Link>
      </div>

      {/* Search + filters */}
      <form
        className="mb-6 space-y-3 rounded-2xl border border-gray-200/60 bg-white/50 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20 dark:ring-white/10"
        method="get"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              defaultValue={q || ""}
              placeholder="Search name, generic, brand, SKU, barcode, shelf…"
              className="w-full rounded-xl bg-transparent py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition-colors hover:bg-black/5 focus:bg-white dark:hover:bg-white/5 dark:focus:bg-black/40"
            />
            {q && (
              <Link
                href={filterHref({ q: undefined })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-white/20 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            name="category"
            defaultValue={category || ""}
            className="cursor-pointer rounded-xl border border-transparent bg-[var(--admin-inset)] py-2 pl-3 pr-8 text-xs font-medium outline-none hover:border-[var(--admin-border-2)]"
          >
            <option value="">All categories</option>
            {categoryList.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="stock"
            defaultValue={stock || ""}
            className="cursor-pointer rounded-xl border border-transparent bg-[var(--admin-inset)] py-2 pl-3 pr-8 text-xs font-medium outline-none hover:border-[var(--admin-border-2)]"
          >
            <option value="">Any stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
            <option value="healthy">Healthy stock</option>
          </select>

          <select
            name="type"
            defaultValue={type || ""}
            className="cursor-pointer rounded-xl border border-transparent bg-[var(--admin-inset)] py-2 pl-3 pr-8 text-xs font-medium outline-none hover:border-[var(--admin-border-2)]"
          >
            <option value="">OTC &amp; Rx</option>
            <option value="otc">OTC only</option>
            <option value="rx">Prescription only</option>
            <option value="controlled">Controlled drugs</option>
          </select>

          <select
            name="status"
            defaultValue={status || ""}
            className="cursor-pointer rounded-xl border border-transparent bg-[var(--admin-inset)] py-2 pl-3 pr-8 text-xs font-medium outline-none hover:border-[var(--admin-border-2)]"
          >
            <option value="">Active &amp; inactive</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <select
            name="listing"
            defaultValue={listing || ""}
            className="cursor-pointer rounded-xl border border-transparent bg-[var(--admin-inset)] py-2 pl-3 pr-8 text-xs font-medium outline-none hover:border-[var(--admin-border-2)]"
          >
            <option value="">Any listing</option>
            <option value="public">Public catalog</option>
            <option value="private">Not public</option>
          </select>

          {hasFilters && (
            <Link
              href="/admin/medications"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
            >
              <X className="h-3 w-3" /> Clear filters
            </Link>
          )}
        </div>
      </form>

      {/* Compact POS hint */}
      <details className="mb-6 rounded-xl border border-indigo-500/15 bg-indigo-500/5 open:pb-3">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <span className="inline-flex items-center gap-2">
            <Package className="h-3.5 w-3.5" />
            Automate stock with POS integration — tap for setup
          </span>
        </summary>
        <p className="px-4 text-xs text-gray-600 dark:text-gray-300">
          Keep inventory synced from your pharmacy POS. Contact{" "}
          <strong className="text-indigo-600 dark:text-indigo-400">0790670542</strong> for setup.
          Once configured, POST to{" "}
          <code className="rounded bg-indigo-500/10 px-1 py-0.5 font-mono text-[10px]">
            /api/integrations/pos
          </code>{" "}
          with your{" "}
          <code className="rounded bg-indigo-500/10 px-1 py-0.5 font-mono text-[10px]">
            POS_API_KEY
          </code>
          .
        </p>
      </details>

      <div className="mb-4">
        <h2 className="text-sm font-semibold admin-text">
          {hasFilters ? "Filtered results" : "All medications"}
        </h2>
        <p className="mt-0.5 text-xs admin-muted">
          Showing {paged.length} of {total}
          {hasFilters ? " matching" : ""} · table is default; switch to cards anytime
        </p>
      </div>

      {paged.length === 0 ? (
        <AdminEmptyState
          icon={Pill}
          title={hasFilters ? "No medications match these filters" : "No medications yet"}
          description={
            hasFilters
              ? "Try clearing filters or searching a different term."
              : "Add your first medication to start building the catalog."
          }
          action={
            hasFilters ? (
              <Link href="/admin/medications" className="btn-admin-ghost text-xs">
                Clear filters
              </Link>
            ) : (
              <Link href="/admin/medications/add" className="btn-admin text-xs">
                <Plus className="h-3.5 w-3.5" /> Add medication
              </Link>
            )
          }
        />
      ) : (
        <MedicationCatalog rows={paged} deleteAction={adminDeleteMedicationAction} />
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/medications"
        queryParams={queryParams}
        variant="admin"
      />

      <p className="mt-4 text-[10px] admin-soft">
        Last POS sync: {lastSynced ? formatDateTime(lastSynced) : "never"}
      </p>
    </AdminShell>
  );
}
