import "server-only";
import { assertPublicMedicineSlot } from "@/app/lib/platform/plan-enforcement";
import { peekTenant } from "@/app/lib/tenant-context";

import { prisma } from "@/app/lib/db";
import { computeEnrichmentScore, normalizeForMatch } from "@/app/lib/services/medication-validation";

export type SharedMedicationMatchReason = "barcode" | "generic_strength_form" | "name_identity";

export type SharedMedicationMasterInput = {
  name: string;
  slug?: string | null;
  genericName: string;
  brandName?: string | null;
  strengthValue?: number | null;
  strengthUnit?: string | null;
  strengthDisplay?: string | null;
  packSize?: string | null;
  dosageFormId?: string | null;
  routeId?: string | null;
  pregnancyCategoryId?: string | null;
  manufacturerId?: string | null;
  countryOfOrigin?: string | null;
  barcode?: string | null;
  category?: string | null;
  description?: string | null;
  indications?: string | null;
  dosage?: string | null;
  sideEffects?: string | null;
  contraindications?: string | null;
  storage?: string | null;
  clinicalNotes?: string | null;
  imageUrl?: string | null;
  imageUrls?: string | null;
  alternativeIds?: string | null;
  controlledDrug?: boolean;
  controlledDrugSchedule?: string | null;
  pediatricUse?: boolean;
  requiresRefrigeration?: boolean;
  acquisitionMethod?: string | null;
  activeIngredientIds?: string[];
  clinicalTagIds?: string[];
};

export type PharmacyInventorySeed = {
  slug?: string | null;
  sku?: string | null;
  price?: number | null;
  purchasePrice?: number | null;
  currentStock?: number | null;
  lowStockThreshold?: number | null;
  supplier?: string | null;
  shelfLocation?: string | null;
  promotions?: string | null;
  overTheCounter?: boolean;
  prescriptionRequired?: boolean;
  publicListing?: boolean;
  active?: boolean;
};

export type SharedMedicationResult = {
  masterId: string;
  inventoryId: string;
  masterCreated: boolean;
  alreadyStocked: boolean;
  matchReason: SharedMedicationMatchReason | "new";
  enrichmentScore: number;
  enrichmentStatus: "complete" | "partial" | "minimal";
};

type Match = {
  id: string;
  name: string;
  matchReason: SharedMedicationMatchReason;
};

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function medicationSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}

function strengthKey(input: {
  strengthDisplay?: string | null;
  strengthValue?: unknown;
  strengthUnit?: string | null;
}) {
  if (clean(input.strengthDisplay)) return normalizeForMatch(input.strengthDisplay);
  if (input.strengthValue == null) return "";
  return normalizeForMatch(`${String(input.strengthValue)} ${input.strengthUnit || ""}`);
}

function lockKey(input: SharedMedicationMasterInput) {
  const barcode = clean(input.barcode);
  if (barcode) return `shared-medication:barcode:${barcode}`;

  const generic = normalizeForMatch(input.genericName);
  const strength = strengthKey(input);
  if (generic && strength && input.dosageFormId) {
    return `shared-medication:gsf:${generic}:${strength}:${input.dosageFormId}`;
  }

  return `shared-medication:name:${normalizeForMatch(input.name)}:${generic}:${strength}:${input.dosageFormId || ""}`;
}

function enrichmentFor(input: SharedMedicationMasterInput) {
  return computeEnrichmentScore({
    genericName: input.genericName,
    activeIngredients: input.activeIngredientIds || [],
    strengthDisplay: input.strengthDisplay,
    strengthValue: input.strengthValue,
    dosageFormId: input.dosageFormId,
    routeId: input.routeId,
    indications: input.indications,
    sideEffects: input.sideEffects,
    contraindications: input.contraindications,
    manufacturerId: input.manufacturerId,
    pregnancyCategoryId: input.pregnancyCategoryId,
    barcode: input.barcode,
    imageUrl: input.imageUrl,
  });
}

/**
 * Strong, reuse-safe canonical matching. We intentionally do not merge solely
 * because two rows share a generic name: strength/form variants are distinct
 * medicines. Ambiguous name matches return null so the normal validation/review
 * gate can decide whether a new shared master should be created.
 */
export async function findSharedMedicationMatch(input: SharedMedicationMasterInput): Promise<Match | null> {
  const barcode = clean(input.barcode);
  if (barcode) {
    const hit = await prisma.medicationMaster.findUnique({
      where: { barcode },
      select: { id: true, name: true },
    });
    if (hit) return { ...hit, matchReason: "barcode" };
  }

  const generic = normalizeForMatch(input.genericName);
  const wantedStrength = strengthKey(input);
  if (generic && wantedStrength && input.dosageFormId) {
    const candidates = await prisma.medicationMaster.findMany({
      where: {
        genericName: { equals: input.genericName, mode: "insensitive" },
        dosageFormId: input.dosageFormId,
      },
      select: {
        id: true,
        name: true,
        strengthDisplay: true,
        strengthValue: true,
        strengthUnit: true,
      },
      take: 25,
    });
    const exact = candidates.filter((candidate) => strengthKey(candidate) === wantedStrength);
    if (exact.length === 1) {
      return { id: exact[0].id, name: exact[0].name, matchReason: "generic_strength_form" };
    }
  }

  const name = clean(input.name);
  if (!name) return null;
  const candidates = await prisma.medicationMaster.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      genericName: true,
      strengthDisplay: true,
      strengthValue: true,
      strengthUnit: true,
      dosageFormId: true,
      barcode: true,
    },
    take: 25,
  });

  const compatible = candidates.filter((candidate) => {
    if (generic && normalizeForMatch(candidate.genericName) !== generic) return false;
    if (barcode && candidate.barcode && candidate.barcode !== barcode) return false;
    if (input.dosageFormId && candidate.dosageFormId && candidate.dosageFormId !== input.dosageFormId) return false;
    const candidateStrength = strengthKey(candidate);
    if (wantedStrength && candidateStrength && candidateStrength !== wantedStrength) return false;
    return true;
  });

  if (compatible.length === 1) {
    return { id: compatible[0].id, name: compatible[0].name, matchReason: "name_identity" };
  }
  return null;
}

async function addRelations(tx: any, masterId: string, input: SharedMedicationMasterInput) {
  const ingredients = [...new Set(input.activeIngredientIds || [])].filter(Boolean);
  if (ingredients.length) {
    await tx.medicationActiveIngredient.createMany({
      data: ingredients.map((activeIngredientId) => ({ medicationMasterId: masterId, activeIngredientId })),
      skipDuplicates: true,
    });
  }

  const tags = [...new Set(input.clinicalTagIds || [])].filter(Boolean);
  if (tags.length) {
    await tx.medicationClinicalTag.createMany({
      data: tags.map((clinicalTagId) => ({ medicationMasterId: masterId, clinicalTagId })),
      skipDuplicates: true,
    });
  }
}

async function enrichMissingSharedFields(
  tx: any,
  masterId: string,
  input: SharedMedicationMasterInput,
  incomingScore: number,
) {
  const current = await tx.medicationMaster.findUnique({ where: { id: masterId } });
  if (!current) throw new Error("SHARED_MEDICATION_NOT_FOUND");

  // Existing canonical facts win. Pharmacy contributions may fill blanks, but
  // must never silently rewrite clinical information already used network-wide.
  const data: Record<string, unknown> = {};
  const fill = (key: string, incoming: unknown, existing: unknown) => {
    if ((existing == null || existing === "") && incoming != null && incoming !== "") data[key] = incoming;
  };

  fill("brandName", clean(input.brandName), current.brandName);
  fill("strengthValue", input.strengthValue ?? null, current.strengthValue);
  fill("strengthUnit", clean(input.strengthUnit), current.strengthUnit);
  fill("strengthDisplay", clean(input.strengthDisplay), current.strengthDisplay);
  fill("packSize", clean(input.packSize), current.packSize);
  fill("dosageFormId", input.dosageFormId ?? null, current.dosageFormId);
  fill("routeId", input.routeId ?? null, current.routeId);
  fill("pregnancyCategoryId", input.pregnancyCategoryId ?? null, current.pregnancyCategoryId);
  fill("manufacturerId", input.manufacturerId ?? null, current.manufacturerId);
  fill("countryOfOrigin", clean(input.countryOfOrigin), current.countryOfOrigin);
  fill("barcode", clean(input.barcode), current.barcode);
  fill("description", clean(input.description), current.description);
  fill("indications", clean(input.indications), current.indications);
  fill("dosage", clean(input.dosage), current.dosage);
  fill("sideEffects", clean(input.sideEffects), current.sideEffects);
  fill("contraindications", clean(input.contraindications), current.contraindications);
  fill("storage", clean(input.storage), current.storage);
  fill("clinicalNotes", clean(input.clinicalNotes), current.clinicalNotes);
  fill("imageUrl", clean(input.imageUrl), current.imageUrl);
  fill("imageUrls", clean(input.imageUrls), current.imageUrls);
  fill("alternativeIds", clean(input.alternativeIds), current.alternativeIds);

  if ((!current.category || current.category === "general") && input.category && input.category !== "general") {
    data.category = input.category;
  }

  if (incomingScore > current.enrichmentScore) {
    data.enrichmentScore = incomingScore;
    data.enrichmentStatus = incomingScore >= 80 ? "complete" : incomingScore >= 40 ? "partial" : "minimal";
    if (incomingScore >= 80 && !current.enrichedAt) data.enrichedAt = new Date();
  }

  if (Object.keys(data).length) {
    await tx.medicationMaster.update({ where: { id: masterId }, data });
  }
  await addRelations(tx, masterId, input);
}

async function uniqueInventorySlug(tx: any, desired: string | null | undefined, masterName: string, masterId: string) {
  const base = medicationSlug(desired || masterName) || `medicine-${masterId.slice(0, 8)}`;
  const candidates = [base, `${base}-${masterId.slice(0, 8)}`, `${base}-${masterId.slice(0, 12)}`];
  for (const slug of candidates) {
    const used = await tx.pharmacyInventory.findFirst({ where: { slug }, select: { id: true } });
    if (!used) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function reservePublicListing(seed: PharmacyInventorySeed) {
  if (seed.publicListing !== true || seed.active === false) return;
  const pharmacyId = peekTenant()?.pharmacyId;
  if (pharmacyId) await assertPublicMedicineSlot(pharmacyId);
}

function inventoryData(seed: PharmacyInventorySeed, slug: string) {
  const otc = seed.overTheCounter === true;
  return {
    slug,
    sku: clean(seed.sku),
    price: Number(seed.price ?? 0),
    purchasePrice: seed.purchasePrice == null ? null : Number(seed.purchasePrice),
    currentStock: Math.max(0, Math.trunc(Number(seed.currentStock ?? 0))),
    lowStockThreshold: Math.max(0, Math.trunc(Number(seed.lowStockThreshold ?? 10))),
    supplier: clean(seed.supplier),
    shelfLocation: clean(seed.shelfLocation),
    promotions: clean(seed.promotions),
    overTheCounter: otc,
    prescriptionRequired: otc ? false : seed.prescriptionRequired !== false,
    publicListing: seed.publicListing === true,
    active: seed.active !== false,
  };
}

export async function addSharedMasterToPharmacy(
  medicationMasterId: string,
  seed: PharmacyInventorySeed,
): Promise<SharedMedicationResult> {
  const pharmacyId = peekTenant()?.pharmacyId;
  if (!pharmacyId) throw new Error("PHARMACY_CONTEXT_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const master = await tx.medicationMaster.findUnique({
      where: { id: medicationMasterId, status: "active" },
      select: { id: true, name: true, enrichmentScore: true, enrichmentStatus: true },
    });
    if (!master) throw new Error("SHARED_MEDICATION_NOT_FOUND");

    const existing = await tx.pharmacyInventory.findFirst({
      where: { pharmacyId, medicationMasterId },
      select: { id: true },
    });
    if (existing) {
      return {
        masterId: master.id,
        inventoryId: existing.id,
        masterCreated: false,
        alreadyStocked: true,
        matchReason: "name_identity" as const,
        enrichmentScore: master.enrichmentScore,
        enrichmentStatus: master.enrichmentStatus as "complete" | "partial" | "minimal",
      };
    }

    const slug = await uniqueInventorySlug(tx, seed.slug, master.name, master.id);
    await reservePublicListing(seed);
    const inventory = await tx.pharmacyInventory.create({
      data: { pharmacyId, ...inventoryData(seed, slug), medicationMasterId: master.id },
      select: { id: true },
    });

    return {
      masterId: master.id,
      inventoryId: inventory.id,
      masterCreated: false,
      alreadyStocked: false,
      matchReason: "name_identity" as const,
      enrichmentScore: master.enrichmentScore,
      enrichmentStatus: master.enrichmentStatus as "complete" | "partial" | "minimal",
    };
  });
}

/**
 * Canonical write path used by manual entry, AI import and bulk import.
 * The advisory lock makes the match-then-create decision race-safe for clients
 * using this service. Existing masters are reused; only pharmacy inventory is new.
 */
export async function createOrReuseMedicationForPharmacy(
  input: SharedMedicationMasterInput,
  seed: PharmacyInventorySeed,
): Promise<SharedMedicationResult> {
  if (!clean(input.name)) throw new Error("Medication name is required.");

  const incomingEnrichment = enrichmentFor(input);
  const identityLock = lockKey(input);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identityLock}))`;

    // Re-check after obtaining the lock. This is what prevents two pharmacies
    // submitting the same new medicine at the same moment from creating two masters.
    const match = await findSharedMedicationMatch(input);
    let masterId: string;
    let masterName: string;
    let masterCreated = false;
    let matchReason: SharedMedicationMatchReason | "new" = "new";

    if (match) {
      masterId = match.id;
      masterName = match.name;
      matchReason = match.matchReason;
      await enrichMissingSharedFields(tx, masterId, input, incomingEnrichment.score);
    } else {
      if (!clean(input.genericName)) {
        throw new Error("Generic name is required before a new medicine can enter the shared library.");
      }
      const slug = medicationSlug(input.slug || input.name) || `medicine-${Date.now().toString(36)}`;
      const master = await tx.medicationMaster.create({
        data: {
          name: input.name.trim(),
          slug,
          genericName: input.genericName.trim(),
          brandName: clean(input.brandName),
          strengthValue: input.strengthValue ?? null,
          strengthUnit: clean(input.strengthUnit),
          strengthDisplay: clean(input.strengthDisplay),
          packSize: clean(input.packSize),
          dosageFormId: input.dosageFormId ?? null,
          routeId: input.routeId ?? null,
          pregnancyCategoryId: input.pregnancyCategoryId ?? null,
          manufacturerId: input.manufacturerId ?? null,
          countryOfOrigin: clean(input.countryOfOrigin),
          barcode: clean(input.barcode),
          category: clean(input.category) || "general",
          description: clean(input.description),
          indications: clean(input.indications),
          dosage: clean(input.dosage),
          sideEffects: clean(input.sideEffects),
          contraindications: clean(input.contraindications),
          storage: clean(input.storage),
          clinicalNotes: clean(input.clinicalNotes),
          imageUrl: clean(input.imageUrl),
          imageUrls: clean(input.imageUrls),
          alternativeIds: clean(input.alternativeIds),
          controlledDrug: input.controlledDrug === true,
          controlledDrugSchedule: clean(input.controlledDrugSchedule),
          pediatricUse: input.pediatricUse === true,
          requiresRefrigeration: input.requiresRefrigeration === true,
          enrichmentStatus: incomingEnrichment.status,
          enrichmentScore: incomingEnrichment.score,
          enrichedAt: incomingEnrichment.status === "complete" ? new Date() : null,
          acquisitionMethod: clean(input.acquisitionMethod) || "manual",
        },
        select: { id: true, name: true },
      });
      masterId = master.id;
      masterName = master.name;
      masterCreated = true;
      await addRelations(tx, masterId, input);
    }

    const existing = await tx.pharmacyInventory.findFirst({
      where: { medicationMasterId: masterId },
      select: { id: true },
    });
    if (existing) {
      const master = await tx.medicationMaster.findUniqueOrThrow({
        where: { id: masterId },
        select: { enrichmentScore: true, enrichmentStatus: true },
      });
      return {
        masterId,
        inventoryId: existing.id,
        masterCreated,
        alreadyStocked: true,
        matchReason,
        enrichmentScore: master.enrichmentScore,
        enrichmentStatus: master.enrichmentStatus as "complete" | "partial" | "minimal",
      };
    }

    const slug = await uniqueInventorySlug(tx, seed.slug || input.slug, masterName, masterId);
    await reservePublicListing(seed);
    const inventory = await tx.pharmacyInventory.create({
      data: { ...inventoryData(seed, slug), medicationMasterId: masterId },
      select: { id: true },
    });
    const master = await tx.medicationMaster.findUniqueOrThrow({
      where: { id: masterId },
      select: { enrichmentScore: true, enrichmentStatus: true },
    });

    return {
      masterId,
      inventoryId: inventory.id,
      masterCreated,
      alreadyStocked: false,
      matchReason,
      enrichmentScore: master.enrichmentScore,
      enrichmentStatus: master.enrichmentStatus as "complete" | "partial" | "minimal",
    };
  });
}
