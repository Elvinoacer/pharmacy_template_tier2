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
import { ArrowLeft, Pill } from "lucide-react";

export const metadata = { title: "Edit medication" };

export default async function EditMedicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  // `id` is a PharmacyInventory id (the admin list links to /admin/medications/[id]).
  const [inv, categories, dosageForms, routes, pregnancyCategories, manufacturers, activeIngredients, clinicalTags, lots, movements] =
    await Promise.all([
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

  // Resolve alternative master IDs → names for the multi-select picker (no raw UUIDs in UI).
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
    .map((id) => altById.get(id))
    .filter(Boolean)
    .map((r) => ({
      id: r!.id,
      name: r!.name,
      category: r!.category,
      genericName: r!.genericName,
      strengthDisplay: r!.strengthDisplay,
    }));

  // Pass only plain strings/booleans into the client form (no Prisma Decimal).
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
    // Inventory
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
    // Relational
    activeIngredientIds: med.activeIngredients.map((ai) => ai.activeIngredientId),
    clinicalTagIds: med.clinicalTags.map((ct) => ct.clinicalTagId),
    acquisitionMethod: med.acquisitionMethod,
  };

  return (
    <AdminShell user={user} title={`Edit: ${med.name}`} subtitle={med.category}>
      <div className="mb-6">
        <Link
          href="/admin/medications"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Catalog
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white/40 shadow-2xl shadow-emerald-500/10 ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20 dark:ring-white/10">
          <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-20 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/20" />
          </div>

          <div className="relative border-b border-gray-200/50 bg-white/50 p-8 dark:border-white/5 dark:bg-black/20">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Medication</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {med.name} · {med.category.replace(/-/g, " ")} · Enrichment: {med.enrichmentScore}% ({med.enrichmentStatus})
                </p>
              </div>
            </div>
          </div>

          <div className="relative p-6 sm:p-8">
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
        </div>

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
