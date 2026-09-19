import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { writeAuditLog } from "@/app/lib/auth";
import { computeEnrichmentScore, normalizeForMatch } from "./medication-validation";

export type PlatformMedicationStatus = "active" | "needs_review" | "deprecated" | "archived";

export type PlatformMedicationFilterOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: "name" | "genericName" | "createdAt" | "updatedAt" | "enrichmentScore";
  sortDir?: "asc" | "desc";
  category?: string;
  manufacturerId?: string;
  dosageFormId?: string;
  controlledDrug?: boolean | "all";
  enrichmentStatus?: "all" | "minimal" | "partial" | "complete";
  acquisitionMethod?: string;
  status?: "all" | PlatformMedicationStatus;
  missingData?: "all" | "barcode" | "manufacturer" | "route" | "images" | "strength" | "incomplete";
  createdFrom?: Date | string;
  createdTo?: Date | string;
  updatedFrom?: Date | string;
  updatedTo?: Date | string;
};

export async function listPlatformMedications(opts: PlatformMedicationFilterOptions = {}) {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(100, Math.max(10, opts.pageSize || 25));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (opts.status && opts.status !== "all") {
    where.status = opts.status;
  }

  if (opts.category && opts.category !== "all") {
    where.category = opts.category;
  }

  if (opts.manufacturerId && opts.manufacturerId !== "all") {
    where.manufacturerId = opts.manufacturerId;
  }

  if (opts.dosageFormId && opts.dosageFormId !== "all") {
    where.dosageFormId = opts.dosageFormId;
  }

  if (opts.controlledDrug !== undefined && opts.controlledDrug !== "all") {
    where.controlledDrug = opts.controlledDrug === true;
  }

  if (opts.enrichmentStatus && opts.enrichmentStatus !== "all") {
    where.enrichmentStatus = opts.enrichmentStatus;
  }

  if (opts.acquisitionMethod && opts.acquisitionMethod !== "all") {
    where.acquisitionMethod = opts.acquisitionMethod;
  }

  if (opts.search?.trim()) {
    const q = opts.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { genericName: { contains: q, mode: "insensitive" } },
      { brandName: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
    ];
  }

  if (opts.missingData && opts.missingData !== "all") {
    switch (opts.missingData) {
      case "barcode":
        where.barcode = null;
        break;
      case "manufacturer":
        where.manufacturerId = null;
        break;
      case "route":
        where.routeId = null;
        break;
      case "images":
        where.OR = [{ imageUrl: null }, { imageUrl: "" }];
        break;
      case "strength":
        where.strengthDisplay = null;
        where.strengthValue = null;
        break;
      case "incomplete":
        where.enrichmentStatus = "minimal";
        break;
    }
  }

  if (opts.createdFrom || opts.createdTo) {
    where.createdAt = {
      ...(opts.createdFrom ? { gte: new Date(opts.createdFrom) } : {}),
      ...(opts.createdTo ? { lte: new Date(opts.createdTo) } : {}),
    };
  }

  if (opts.updatedFrom || opts.updatedTo) {
    where.updatedAt = {
      ...(opts.updatedFrom ? { gte: new Date(opts.updatedFrom) } : {}),
      ...(opts.updatedTo ? { lte: new Date(opts.updatedTo) } : {}),
    };
  }

  const sortField = opts.sort || "updatedAt";
  const sortDir = opts.sortDir || (sortField === "name" || sortField === "genericName" ? "asc" : "desc");
  const orderBy = { [sortField]: sortDir };

  const [total, items] = await Promise.all([
    prismaUnscoped.medicationMaster.count({ where }),
    prismaUnscoped.medicationMaster.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        genericName: true,
        brandName: true,
        strengthDisplay: true,
        packSize: true,
        category: true,
        barcode: true,
        status: true,
        controlledDrug: true,
        controlledDrugSchedule: true,
        enrichmentStatus: true,
        enrichmentScore: true,
        acquisitionMethod: true,
        createdAt: true,
        updatedAt: true,
        dosageForm: { select: { id: true, value: true } },
        manufacturer: { select: { id: true, name: true } },
        _count: {
          select: {
            pharmacyInventory: true,
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getPlatformMedicationById(id: string) {
  const [master, auditLogs] = await Promise.all([
    prismaUnscoped.medicationMaster.findUnique({
      where: { id },
      include: {
        dosageForm: { select: { id: true, value: true, slug: true } },
        route: { select: { id: true, value: true, slug: true } },
        pregnancyCategory: { select: { id: true, value: true, slug: true } },
        manufacturer: { select: { id: true, name: true, country: true } },
        activeIngredients: {
          include: {
            activeIngredient: { select: { id: true, name: true } },
          },
        },
        clinicalTags: {
          include: {
            clinicalTag: { select: { id: true, name: true, slug: true } },
          },
        },
        mergedInto: {
          select: { id: true, name: true, genericName: true, status: true },
        },
        mergedDuplicates: {
          select: { id: true, name: true, genericName: true, status: true, updatedAt: true },
        },
        pharmacyInventory: {
          select: {
            id: true,
            slug: true,
            sku: true,
            price: true,
            currentStock: true,
            publicListing: true,
            active: true,
            syncedAt: true,
            pharmacy: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                status: true,
                listed: true,
              },
            },
          },
        },
      },
    }),
    prismaUnscoped.auditLog.findMany({
      where: {
        entityType: "medication_master",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        actor: { select: { id: true, email: true, role: true } },
      },
    }),
  ]);

  return { master, auditLogs };
}

export async function getPlatformMedicationMetrics() {
  const [
    total,
    active,
    needsReview,
    deprecated,
    archived,
    minimal,
    complete,
    controlled,
    missingImages,
    missingBarcode,
    missingManufacturer,
    createdCsv,
    createdOther,
    orphans,
  ] = await Promise.all([
    prismaUnscoped.medicationMaster.count(),
    prismaUnscoped.medicationMaster.count({ where: { status: "active" } }),
    prismaUnscoped.medicationMaster.count({ where: { status: "needs_review" } }),
    prismaUnscoped.medicationMaster.count({ where: { status: "deprecated" } }),
    prismaUnscoped.medicationMaster.count({ where: { status: "archived" } }),
    prismaUnscoped.medicationMaster.count({ where: { enrichmentStatus: "minimal" } }),
    prismaUnscoped.medicationMaster.count({ where: { enrichmentStatus: "complete" } }),
    prismaUnscoped.medicationMaster.count({ where: { controlledDrug: true } }),
    prismaUnscoped.medicationMaster.count({ where: { OR: [{ imageUrl: null }, { imageUrl: "" }] } }),
    prismaUnscoped.medicationMaster.count({ where: { barcode: null } }),
    prismaUnscoped.medicationMaster.count({ where: { manufacturerId: null } }),
    prismaUnscoped.medicationMaster.count({ where: { acquisitionMethod: { in: ["platform_csv_import", "csv_import"] } } }),
    prismaUnscoped.medicationMaster.count({ where: { acquisitionMethod: { notIn: ["platform_csv_import", "csv_import"] } } }),
    prismaUnscoped.medicationMaster.count({ where: { pharmacyInventory: { none: {} } } }),
  ]);

  return {
    total,
    active,
    needsReview,
    deprecated,
    archived,
    deprecatedOrArchived: deprecated + archived,
    minimal,
    complete,
    partial: total - minimal - complete,
    controlled,
    missingImages,
    missingBarcode,
    missingManufacturer,
    createdCsv,
    createdOther,
    orphans,
    reused: total - orphans,
  };
}

export async function bulkUpdateMedicationStatus(options: {
  ids: string[];
  status: PlatformMedicationStatus;
  reason?: string;
  actorId: string;
}) {
  const { ids, status, reason, actorId } = options;
  if (!ids || ids.length === 0) return { count: 0 };

  const result = await prismaUnscoped.medicationMaster.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });

  await writeAuditLog(actorId, "medication_master_bulk_status_update", "medication_master", undefined, {
    count: result.count,
    ids,
    newStatus: status,
    reason: reason || null,
  });

  return result;
}

export async function updatePlatformMedication(options: {
  id: string;
  data: {
    name?: string;
    genericName?: string;
    brandName?: string | null;
    strengthDisplay?: string | null;
    strengthValue?: number | null;
    strengthUnit?: string | null;
    packSize?: string | null;
    dosageFormId?: string | null;
    routeId?: string | null;
    pregnancyCategoryId?: string | null;
    manufacturerId?: string | null;
    countryOfOrigin?: string | null;
    barcode?: string | null;
    category?: string;
    description?: string | null;
    indications?: string | null;
    dosage?: string | null;
    sideEffects?: string | null;
    contraindications?: string | null;
    storage?: string | null;
    clinicalNotes?: string | null;
    imageUrl?: string | null;
    imageUrls?: string | null;
    controlledDrug?: boolean;
    controlledDrugSchedule?: string | null;
    pediatricUse?: boolean;
    requiresRefrigeration?: boolean;
    status?: PlatformMedicationStatus;
  };
  actorId: string;
}) {
  const { id, data, actorId } = options;
  const current = await prismaUnscoped.medicationMaster.findUnique({ where: { id } });
  if (!current) throw new Error("MEDICATION_MASTER_NOT_FOUND");

  const scoreResult = computeEnrichmentScore({
    genericName: data.genericName ?? current.genericName,
    strengthDisplay: data.strengthDisplay ?? current.strengthDisplay,
    strengthValue: data.strengthValue ?? (current.strengthValue ? Number(current.strengthValue) : null),
    dosageFormId: data.dosageFormId ?? current.dosageFormId,
    routeId: data.routeId ?? current.routeId,
    indications: data.indications ?? current.indications,
    sideEffects: data.sideEffects ?? current.sideEffects,
    contraindications: data.contraindications ?? current.contraindications,
    manufacturerId: data.manufacturerId ?? current.manufacturerId,
    pregnancyCategoryId: data.pregnancyCategoryId ?? current.pregnancyCategoryId,
    barcode: data.barcode ?? current.barcode,
    imageUrl: data.imageUrl ?? current.imageUrl,
  });

  const updated = await prismaUnscoped.medicationMaster.update({
    where: { id },
    data: {
      ...data,
      enrichmentScore: scoreResult.score,
      enrichmentStatus: scoreResult.status,
      enrichedAt: scoreResult.status === "complete" ? new Date() : current.enrichedAt,
    },
  });

  await writeAuditLog(actorId, "medication_master_update", "medication_master", id, {
    before: { name: current.name, status: current.status, enrichmentScore: current.enrichmentScore },
    after: { name: updated.name, status: updated.status, enrichmentScore: updated.enrichmentScore },
  });

  return updated;
}

/**
 * Duplicate merging engine:
 * 1. Select survivor master and duplicate master.
 * 2. Relink PharmacyInventory references safely.
 * 3. Move/preserve active ingredients and clinical tags.
 * 4. Relink drug interactions.
 * 5. Handle barcode conflict without unique constraint crash.
 * 6. Audit merge.
 * 7. Archive the duplicate master.
 */
type MergeDuplicateMedicationOptions = {
  survivorId: string;
  duplicateId: string;
  actorId: string;
  reason?: string;
};

export async function mergeDuplicateMedications(options: MergeDuplicateMedicationOptions) {
  return withPlatformBypass(() => mergeDuplicateMedicationsInPlatform(options));
}

async function mergeDuplicateMedicationsInPlatform(options: MergeDuplicateMedicationOptions) {
  const { survivorId, duplicateId, actorId, reason } = options;
  if (survivorId === duplicateId) {
    throw new Error("Cannot merge a medication into itself.");
  }

  const [survivor, duplicate] = await Promise.all([
    prismaUnscoped.medicationMaster.findUnique({
      where: { id: survivorId },
      include: {
        activeIngredients: true,
        clinicalTags: true,
        pharmacyInventory: true,
      },
    }),
    prismaUnscoped.medicationMaster.findUnique({
      where: { id: duplicateId },
      include: {
        activeIngredients: true,
        clinicalTags: true,
        pharmacyInventory: true,
      },
    }),
  ]);

  if (!survivor || !duplicate) {
    throw new Error("Both survivor and duplicate medication master records must exist.");
  }

  let migratedInventoryCount = 0;

  await prismaUnscoped.$transaction(async (tx) => {
    // 1. Relink PharmacyInventory references
    for (const inv of duplicate.pharmacyInventory) {
      // Check if survivor already has an inventory record for this pharmacy
      const existing = await tx.pharmacyInventory.findFirst({
        where: {
          pharmacyId: inv.pharmacyId,
          medicationMasterId: survivorId,
        },
      });

      if (!existing) {
        // Safe to simply point the inventory to the survivor
        await tx.pharmacyInventory.update({
          where: { id: inv.id },
          data: { medicationMasterId: survivorId },
        });
        migratedInventoryCount++;
      } else {
        // Pharmacy already has an inventory record for survivor.
        // 1. Combine commercial stock safely
        if (inv.currentStock && inv.currentStock > 0) {
          await tx.pharmacyInventory.update({
            where: { id: existing.id },
            data: { currentStock: { increment: inv.currentStock } },
          });
        }

        // 2. Re-link movements, lots, order items, prescriptions, fills, reservations, price history, sync conflicts
        await tx.inventoryLot.updateMany({
          where: { pharmacyInventoryId: inv.id },
          data: { pharmacyInventoryId: existing.id },
        });
        await tx.stockMovement.updateMany({
          where: { pharmacyInventoryId: inv.id },
          data: { pharmacyInventoryId: existing.id },
        });
        await tx.orderItem.updateMany({
          where: { medicationId: inv.id },
          data: { medicationId: existing.id },
        });
        await tx.prescription.updateMany({
          where: { medicationId: inv.id },
          data: { medicationId: existing.id },
        });
        await tx.prescriptionFill.updateMany({
          where: { medicationId: inv.id },
          data: { medicationId: existing.id },
        });
        await tx.inventoryReservation.updateMany({
          where: { inventoryId: inv.id },
          data: { inventoryId: existing.id },
        });
        await tx.medicationPriceHistory.updateMany({
          where: { inventoryId: inv.id },
          data: { inventoryId: existing.id },
        });
        await tx.inventorySyncConflict.updateMany({
          where: { inventoryId: inv.id },
          data: { inventoryId: existing.id },
        });

        // Now remove the duplicate inventory row
        await tx.pharmacyInventory.delete({ where: { id: inv.id } });
        migratedInventoryCount++;
      }
    }

    // 2. Preserve Active Ingredients on Survivor
    const survivorIngredientsMap = new Map(survivor.activeIngredients.map((a) => [a.activeIngredientId, a]));
    for (const item of duplicate.activeIngredients) {
      const existingIng = survivorIngredientsMap.get(item.activeIngredientId);
      if (!existingIng) {
        await tx.medicationActiveIngredient.create({
          data: {
            medicationMasterId: survivorId,
            activeIngredientId: item.activeIngredientId,
            amount: item.amount,
            unit: item.unit,
          },
        });
        survivorIngredientsMap.set(item.activeIngredientId, item);
      } else if ((!existingIng.amount || !existingIng.unit) && (item.amount || item.unit)) {
        await tx.medicationActiveIngredient.update({
          where: { id: existingIng.id },
          data: {
            amount: existingIng.amount || item.amount,
            unit: existingIng.unit || item.unit,
          },
        });
      }
    }

    // 3. Preserve Clinical Tags on Survivor
    const survivorTagIds = new Set(survivor.clinicalTags.map((t) => t.clinicalTagId));
    for (const tag of duplicate.clinicalTags) {
      if (!survivorTagIds.has(tag.clinicalTagId)) {
        await tx.medicationClinicalTag.create({
          data: {
            medicationMasterId: survivorId,
            clinicalTagId: tag.clinicalTagId,
          },
        });
        survivorTagIds.add(tag.clinicalTagId);
      }
    }

    // 4. Migrate and preserve MedicationInteraction records
    const outgoingInteractions = await tx.medicationInteraction.findMany({
      where: { medicationMasterId: duplicateId },
    });
    for (const inter of outgoingInteractions) {
      if (inter.interactsWithId === survivorId) {
        await tx.medicationInteraction.delete({ where: { id: inter.id } });
      } else {
        const alreadyExists = await tx.medicationInteraction.findFirst({
          where: { medicationMasterId: survivorId, interactsWithId: inter.interactsWithId },
        });
        if (!alreadyExists) {
          await tx.medicationInteraction.update({
            where: { id: inter.id },
            data: { medicationMasterId: survivorId },
          });
        } else {
          await tx.medicationInteraction.delete({ where: { id: inter.id } });
        }
      }
    }

    const incomingInteractions = await tx.medicationInteraction.findMany({
      where: { interactsWithId: duplicateId },
    });
    for (const inter of incomingInteractions) {
      if (inter.medicationMasterId === survivorId) {
        await tx.medicationInteraction.delete({ where: { id: inter.id } });
      } else {
        const alreadyExists = await tx.medicationInteraction.findFirst({
          where: { medicationMasterId: inter.medicationMasterId, interactsWithId: survivorId },
        });
        if (!alreadyExists) {
          await tx.medicationInteraction.update({
            where: { id: inter.id },
            data: { interactsWithId: survivorId },
          });
        } else {
          await tx.medicationInteraction.delete({ where: { id: inter.id } });
        }
      }
    }

    // 5. Fill missing clinical data on Survivor from Duplicate
    const fillData: Record<string, unknown> = {};
    if (!survivor.brandName && duplicate.brandName) fillData.brandName = duplicate.brandName;
    if (!survivor.description && duplicate.description) fillData.description = duplicate.description;
    if (!survivor.indications && duplicate.indications) fillData.indications = duplicate.indications;
    if (!survivor.dosage && duplicate.dosage) fillData.dosage = duplicate.dosage;
    if (!survivor.sideEffects && duplicate.sideEffects) fillData.sideEffects = duplicate.sideEffects;
    if (!survivor.contraindications && duplicate.contraindications) fillData.contraindications = duplicate.contraindications;
    if (!survivor.storage && duplicate.storage) fillData.storage = duplicate.storage;
    if (!survivor.clinicalNotes && duplicate.clinicalNotes) fillData.clinicalNotes = duplicate.clinicalNotes;
    if (!survivor.imageUrl && duplicate.imageUrl) fillData.imageUrl = duplicate.imageUrl;
    if (!survivor.imageUrls && duplicate.imageUrls) fillData.imageUrls = duplicate.imageUrls;
    if (!survivor.manufacturerId && duplicate.manufacturerId) fillData.manufacturerId = duplicate.manufacturerId;
    if (!survivor.routeId && duplicate.routeId) fillData.routeId = duplicate.routeId;
    if (!survivor.dosageFormId && duplicate.dosageFormId) fillData.dosageFormId = duplicate.dosageFormId;
    if (!survivor.countryOfOrigin && duplicate.countryOfOrigin) fillData.countryOfOrigin = duplicate.countryOfOrigin;

    // 6. Handle Barcode
    if (!survivor.barcode && duplicate.barcode) {
      // Move barcode to survivor and null out on duplicate first to avoid unique constraint conflict
      await tx.medicationMaster.update({
        where: { id: duplicateId },
        data: { barcode: null },
      });
      fillData.barcode = duplicate.barcode;
    } else if (duplicate.barcode) {
      await tx.medicationMaster.update({
        where: { id: duplicateId },
        data: { barcode: null },
      });
    }

    if (Object.keys(fillData).length > 0) {
      await tx.medicationMaster.update({
        where: { id: survivorId },
        data: fillData,
      });
    }

    // 7. Archive duplicate master and link to survivor
    await tx.medicationMaster.update({
      where: { id: duplicateId },
      data: {
        status: "archived",
        mergedIntoId: survivorId,
      },
    });
  }, { maxWait: 20000, timeout: 60000 });

  await writeAuditLog(actorId, "medication_master_merged", "medication_master", survivorId, {
    survivorId,
    duplicateId,
    survivorName: survivor.name,
    duplicateName: duplicate.name,
    migratedInventoryCount,
    reason: reason || "Platform admin duplicate merge",
  });

  return { ok: true, survivorId, duplicateId, migratedInventoryCount };
}
