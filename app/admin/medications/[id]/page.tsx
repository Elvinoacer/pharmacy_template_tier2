import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateMedicationAction } from "@/app/actions/admin";
import { listActiveCategoryOptions } from "@/app/lib/medication-categories";
import {
  listDosageForms,
  listRoutes,
  listPregnancyCategories,
  listManufacturers,
  listActiveIngredients,
  listClinicalTags,
} from "@/app/lib/medication-lookups";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { InventoryOpsPanel } from "@/app/components/admin/InventoryOpsPanel";
import MedicationFormWithDefaults from "./MedicationFormWithDefaults";
import { ArrowLeft, Boxes, Eye, Package, Pill } from "lucide-react";

export const metadata = { title: "Edit medication" };

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const [
    inv,
    categories,
    dosageForms,
    routes,
    pregnancyCategories,
    manufacturers,
    activeIngredients,
    clinicalTags,
    lots,
    movements,
  ] = await Promise.all([
    prisma.pharmacyInventory
      .findUnique({
        where: { id },
        include: {
          medicationMaster: {
            include: {
              activeIngredients: { select: { activeIngredientId: true } },
              clinicalTags: { select: { clinicalTagId: true } },
            },
          },
        },
      })
      .catch((err) => {
        console.error("[admin/medications/[id]] lookup failed:", err);
        return null;
      }),
    listActiveCategoryOptions(),
    listDosageForms(),
    listRoutes(),
    listPregnancyCategories(),
    listManufacturers(),
    listActiveIngredients(),
    listClinicalTags(),
    prisma.inventoryLot
      .findMany({
        where: { pharmacyInventoryId: id },
        orderBy: [{ active: "desc" }, { expiryDate: "asc" }],
      })
      .catch(() => []),
    prisma.stockMovement
      .findMany({
        where: { pharmacyInventoryId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(() => []),
  ]);

  if (!inv) notFound();
  const med = inv.medicationMaster;

  const altIdList = (med.alternativeIds || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const alternativeRows =
    altIdList.length > 0
      ? await prisma.medicationMaster
          .findMany({
            where: { id: { in: altIdList } },
            select: {
              id: true,
              name: true,
              category: true,
              genericName: true,
              strengthDisplay: true,
            },
          })
          .catch(() => [])
      : [];
  const altById = new Map(alternativeRows.map((r) => [r.id, r]));
  const alternativeOptions = altIdList
    .map((alternativeId) => altById.get(alternativeId))
    .filter(Boolean)
    .map((r) => ({
      id: r!.id,
      name: r!.name,
      category: r!.category,
      genericName: r!.genericName,
      strengthDisplay: r!.strengthDisplay,
    }));

  const defaults = {
    inventoryId: inv.id,
    masterId: med.id,
    name: med.name,
    slug: inv.slug,
    genericName: med.genericName,
    brandName: med.brandName || "",
    strengthValue: med.strengthValue != null ? String(med.strengthValue) : "",
    strengthUnit: med.strengthUnit || "",
    strengthDisplay: med.strengthDisplay || "",
    packSize: med.packSize || "",
    dosageFormId: med.dosageFormId || "",
    routeId: med.routeId || "",
    pregnancyCategoryId: med.pregnancyCategoryId || "",
    manufacturerId: med.manufacturerId || "",
    countryOfOrigin: med.countryOfOrigin || "",
    barcode: med.barcode || "",
    category: med.category,
    description: med.description || "",
    indications: med.indications || "",
    dosage: med.dosage || "",
    sideEffects: med.sideEffects || "",
    contraindications: med.contraindications || "",
    storage: med.storage || "",
    clinicalNotes: med.clinicalNotes || "",
    imageUrl: med.imageUrl || "",
    imageUrls: med.imageUrls || "",
    alternativeIds: med.alternativeIds || "",
    alternativeOptions,
    controlledDrug: med.controlledDrug,
    controlledDrugSchedule: med.controlledDrugSchedule || "",
    pediatricUse: med.pediatricUse,
    requiresRefrigeration: med.requiresRefrigeration,
    sku: inv.sku || "",
    price: String(Number(inv.price ?? 0)),
    purchasePrice: inv.purchasePrice != null ? String(inv.purchasePrice) : "",
    currentStock: String(inv.currentStock ?? 0),
    lowStockThreshold: String(inv.lowStockThreshold ?? 10),
    supplier: inv.supplier || "",
    shelfLocation: inv.shelfLocation || "",
    promotions: inv.promotions || "",
    overTheCounter: inv.overTheCounter,
    publicListing: inv.publicListing,
    prescriptionRequired: inv.prescriptionRequired,
    active: inv.active,
    activeIngredientIds: med.activeIngredients.map((ai) => ai.activeIngredientId),
    clinicalTagIds: med.clinicalTags.map((ct) => ct.clinicalTagId),
    acquisitionMethod: med.acquisitionMethod,
  };

  const stockState =
    inv.currentStock <= 0
      ? { label: "Out of stock", tone: "text-rose-700 dark:text-rose-300", bg: "bg-rose-500/10" }
      : inv.currentStock <= inv.lowStockThreshold
        ? { label: "Low stock", tone: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10" }
        : { label: "Healthy stock", tone: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10" };

  return (
    <AdminShell
      user={user}
      title={`Edit: ${med.name}`}
      subtitle="Clinical record, catalogue settings and stock operations in one workspace."
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/medications"
            className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:border-[var(--admin-border-2)] hover:text-[var(--admin-text)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to catalogue
          </Link>
          <Link
            href="/admin/inventory"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 text-sm font-semibold admin-text transition hover:border-emerald-500/35"
          >
            <Package className="h-4 w-4 admin-accent-text" />
            Inventory health
          </Link>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
          <div className="border-b border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 sm:p-5">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300 sm:h-12 sm:w-12">
                <Pill className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-lg font-bold admin-text sm:text-xl">{med.name}</h2>
                <p className="mt-1 text-sm admin-muted">
                  {med.category.replace(/-/g, " ")} · Enrichment {med.enrichmentScore}% ({med.enrichmentStatus})
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">Stock</p>
                <p className={`mt-1 text-lg font-black tabular-nums ${stockState.tone}`}>{inv.currentStock}</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-sm font-semibold ${stockState.bg} ${stockState.tone}`}>
                  {stockState.label}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">Price</p>
                <p className="mt-1 text-lg font-black tabular-nums admin-text">KES {Number(inv.price ?? 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">Access</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold admin-text">
                  <Boxes className="h-3.5 w-3.5 admin-accent-text" />
                  {inv.overTheCounter ? "OTC" : inv.prescriptionRequired ? "Prescription" : "Standard"}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3">
                <p className="text-sm font-bold uppercase tracking-wide admin-soft">Visibility</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold admin-text">
                  <Eye className="h-3.5 w-3.5 admin-accent-text" />
                  {inv.publicListing ? "Public" : "Private"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-5 lg:p-6">
            <MedicationFormWithDefaults
              action={adminCreateMedicationAction}
              defaults={defaults}
              categories={categories}
              dosageForms={dosageForms}
              routes={routes}
              pregnancyCategories={pregnancyCategories}
              manufacturers={manufacturers}
              activeIngredients={activeIngredients}
              clinicalTags={clinicalTags}
            />
          </div>
        </section>

        <InventoryOpsPanel
          inventoryId={inv.id}
          currentStock={inv.currentStock}
          lowStockThreshold={inv.lowStockThreshold}
          lots={lots.map((l) => ({
            id: l.id,
            batchNumber: l.batchNumber,
            expiryDate: l.expiryDate.toISOString(),
            quantity: l.quantity,
            active: l.active,
            receivedAt: l.receivedAt.toISOString(),
          }))}
          movements={movements.map((m) => ({
            id: m.id,
            reason: m.reason,
            quantityDelta: m.quantityDelta,
            balanceAfter: m.balanceAfter,
            notes: m.notes,
            relatedType: m.relatedType,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    </AdminShell>
  );
}
