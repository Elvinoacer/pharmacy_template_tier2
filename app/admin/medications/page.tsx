import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { adminDeleteMedicationAction } from "@/app/actions/admin";
import { AdminCard, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { listActiveCategoryOptions } from "@/app/lib/medication-categories";
import { formatDateTime } from "@/app/lib/time";
import { MedicationCatalog, type CatalogMed } from "@/app/components/admin/MedicationCatalog";
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
  Zap,
  X,
} from "lucide-react";

export const metadata = { title: "Medications" };

const PAGE_SIZE = 25;
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

function buildBaseWhere(sp: SearchFilters): Prisma.PharmacyInventoryWhereInput {
  const q = sp.q?.trim() || undefined;
  const and: Prisma.PharmacyInventoryWhereInput[] = [];

  if (sp.category) and.push({ medicationMaster: { category: sp.category } });

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

  const pharmacyId = user.activePharmacyId;
  const activeMembership = pharmacyId
    ? user.memberships.some(
        (membership) => membership.pharmacyId === pharmacyId && membership.status === "active",
      )
    : false;
  if (!pharmacyId || (!activeMembership && !user.platformAdmin)) {
    redirect("/admin/select");
  }

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
    const catalog = await withPharmacy(pharmacyId, async () => {
      const lowRows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM pharmacy_inventory
        WHERE pharmacy_id = ${pharmacyId}
          AND current_stock > 0 AND current_stock <= low_stock_threshold
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
      prisma.pharmacyInventory.count({ where: { prescriptionRequired: true, overTheCounter: false } }),
      prisma.pharmacyInventory.count({ where: { publicListing: true } }),
      prisma.pharmacyInventory.findFirst({
        where: { syncedAt: { not: null } },
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true },
      }),
    ]);

    const loadedStats = {
      total: totalAll,
      active: activeCount,
      lowStock: lowStockIds.length,
      outOfStock: outCount,
      otc: otcCount,
      rx: rxCount,
      publicListed: publicCount,
    };
    const pageNum = parsePageParam(sp.page, count, PAGE_SIZE);
    const pageRows = await prisma.pharmacyInventory.findMany({
      where,
      include,
      orderBy: [{ active: "desc" }, { medicationMaster: { name: "asc" } }],
      take: PAGE_SIZE,
      skip: (pageNum - 1) * PAGE_SIZE,
    });
      return { total: count, categoryList: categories, stats: loadedStats, lastSynced: latestSync?.syncedAt ?? null, paged: pageRows.map(toCatalogMed) };
    });
    total = catalog.total;
    categoryList = catalog.categoryList;
    stats = catalog.stats;
    lastSynced = catalog.lastSynced;
    paged = catalog.paged;
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
    for (const [key, value] of Object.entries(merged)) {
      if (value && key !== "page") params.set(key, value);
    }
    const query = params.toString();
    return query ? `/admin/medications?${query}` : "/admin/medications";
  }

  return (
    <AdminShell
      user={user}
      title="Medicine catalogue"
      subtitle={`${stats.total} in inventory · ${stats.active} active · stock, access and public listing at a glance`}
      actions={
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <Link
            href="/admin/medications/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 sm:order-last sm:rounded-full sm:px-4"
          >
            <Zap className="h-4 w-4" /> Quick add
          </Link>
          <Link
            href="/admin/medications/add"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:rounded-full sm:px-4"
          >
            <Plus className="h-4 w-4" /> More ways
          </Link>
          <Link href="/admin/inventory" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:rounded-full">
            <Package className="h-3.5 w-3.5" /> Inventory
          </Link>
          <Link href="/admin/medications/incomplete" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:rounded-full">
            <AlertTriangle className="h-3.5 w-3.5" /> Incomplete
          </Link>
          <Link href="/admin/medications/metrics" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:rounded-full">
            <TrendingUp className="h-3.5 w-3.5" /> Metrics
          </Link>
          <Link href="/admin/medications/categories" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)] sm:rounded-full">
            <Tag className="h-3.5 w-3.5" /> Categories
          </Link>
        </div>
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 sm:space-y-6">
        {loadError && <div className="admin-alert-error"><span>{loadError}</span></div>}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
          <AdminCard label="Total" value={stats.total} icon={Pill} accent="neutral" />
          <AdminCard label="Active" value={stats.active} icon={Package} accent="accent" />
          <Link href={filterHref({ stock: "low" })} className="block min-w-0">
            <AdminCard label="Low stock" value={stats.lowStock} icon={AlertTriangle} accent={stats.lowStock > 0 ? "danger" : "neutral"} hint="Tap to filter" />
          </Link>
          <Link href={filterHref({ stock: "out" })} className="block min-w-0">
            <AdminCard label="Out of stock" value={stats.outOfStock} icon={Package} accent={stats.outOfStock > 0 ? "danger" : "neutral"} hint="Tap to filter" />
          </Link>
          <Link href={filterHref({ type: "otc" })} className="block min-w-0">
            <AdminCard label="OTC" value={stats.otc} icon={Boxes} accent="info" hint="Tap to filter" />
          </Link>
          <Link href={filterHref({ type: "rx" })} className="block min-w-0">
            <AdminCard label="Rx only" value={stats.rx} icon={FileText} accent="info" hint="Tap to filter" />
          </Link>
          <Link href={filterHref({ listing: "public" })} className="block min-w-0">
            <AdminCard label="Public" value={stats.publicListed} icon={Tag} accent="accent" hint="On catalogue" />
          </Link>
        </div>

        <form className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 shadow-sm sm:p-4" method="get">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 admin-soft" />
              <input
                name="q"
                defaultValue={q || ""}
                placeholder="Search medicine, generic, brand, SKU, barcode or shelf…"
                className="input-admin min-h-11 pl-10 pr-14 text-base sm:text-sm"
              />
              {q && (
                <Link
                  href={filterHref({ q: undefined })}
                  className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl admin-soft transition hover:bg-[var(--admin-inset)] hover:text-[var(--admin-text)]"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Link>
              )}
            </div>
            <button type="submit" className="btn-admin !text-sm min-h-11 !rounded-xl px-4">
              <Search className="h-4 w-4" /> Search
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select name="category" defaultValue={category || ""} className="input-admin min-h-11 min-w-0 text-sm">
              <option value="">All categories</option>
              {categoryList.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select name="stock" defaultValue={stock || ""} className="input-admin min-h-11 min-w-0 text-sm">
              <option value="">Any stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="healthy">Healthy stock</option>
            </select>
            <select name="type" defaultValue={type || ""} className="input-admin min-h-11 min-w-0 text-sm">
              <option value="">OTC & Rx</option>
              <option value="otc">OTC only</option>
              <option value="rx">Prescription only</option>
              <option value="controlled">Controlled drugs</option>
            </select>
            <select name="status" defaultValue={status || ""} className="input-admin min-h-11 min-w-0 text-sm">
              <option value="">Any status</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select name="listing" defaultValue={listing || ""} className="input-admin min-h-11 min-w-0 text-sm">
              <option value="">Any listing</option>
              <option value="public">Public catalogue</option>
              <option value="private">Not public</option>
            </select>
          </div>

          {hasFilters && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--admin-border)] pt-3">
              <p className="text-sm admin-soft">Filters are active</p>
              <Link href="/admin/medications" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:text-[var(--admin-text)]">
                <X className="h-3.5 w-3.5" /> Clear all
              </Link>
            </div>
          )}
        </form>

        <details className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 open:pb-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 py-3 text-sm font-bold text-indigo-800 dark:text-indigo-200">
            <span className="inline-flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Automate stock with POS integration</span>
          </summary>
          <p className="break-words px-4 text-sm leading-5 text-indigo-800/80 dark:text-indigo-200/80">
            Keep inventory synced from your pharmacy POS. Contact <strong>0790670542</strong> for setup. Once configured, POST to <code className="md-code break-all">/api/integrations/pos</code> with your <code className="md-code">POS_API_KEY</code>.
          </p>
        </details>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-bold admin-text">{hasFilters ? "Filtered medicines" : "All medicines"}</h2>
            <p className="mt-0.5 text-sm admin-muted">Showing {paged.length} of {total}{hasFilters ? " matching" : ""}</p>
          </div>
          <p className="text-sm admin-soft">Mobile uses a touch-first card layout; larger screens can switch views.</p>
        </div>

        {paged.length === 0 ? (
          <AdminEmptyState
            icon={Pill}
            title={hasFilters ? "No medications match these filters" : "No medications yet"}
            description={hasFilters ? "Try clearing filters or using a broader search." : "Add your first medication to start building the catalogue."}
            action={
              hasFilters ? (
                <Link href="/admin/medications" className="btn-admin-ghost !text-sm text-sm">Clear filters</Link>
              ) : (
                <Link href="/admin/medications/add" className="btn-admin !text-sm text-sm"><Plus className="h-3.5 w-3.5" /> Add medication</Link>
              )
            }
          />
        ) : (
          <MedicationCatalog rows={paged} deleteAction={adminDeleteMedicationAction} />
        )}

        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/medications" queryParams={queryParams} variant="admin" />

        <p className="text-sm admin-soft">Last POS sync: {lastSynced ? formatDateTime(lastSynced) : "never"}</p>
      </div>
    </AdminShell>
  );
}
