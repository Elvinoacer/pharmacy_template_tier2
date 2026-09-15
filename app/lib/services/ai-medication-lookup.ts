import "server-only";

import { prisma } from "@/app/lib/db";
import { formatPrice } from "@/app/lib/format";

/** Coarse stock label — never expose exact counts to the public AI. */
export type AvailabilityStatus = "in_stock" | "low_stock" | "out_of_stock";

/** Public-safe medication snapshot for the assistant (no internal ops fields). */
export type PublicMedicationSnapshot = {
  slug: string;
  path: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strength: string | null;
  category: string;
  overTheCounter: boolean;
  prescriptionNote: "otc" | "may_require_prescription";
  availability: AvailabilityStatus;
  priceKes: string;
  shortDescription: string | null;
};

const MAX_QUERY_LEN = 80;
const DEFAULT_LIMIT = 5;
const HARD_LIMIT = 8;
const DESC_MAX = 160;

import {
  QUALIFYING_PHARMACY_WHERE,
  QUALIFYING_MEDICATION_MASTER_WHERE,
} from "@/app/lib/services/public-medication-visibility";

const PUBLIC_INVENTORY_WHERE = {
  publicListing: true,
  active: true,
  pharmacy: QUALIFYING_PHARMACY_WHERE,
} as const;

function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .slice(0, MAX_QUERY_LEN)
    .replace(/\s+/g, " ");
}

function availabilityOf(stock: number, lowThreshold: number): AvailabilityStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock <= lowThreshold) return "low_stock";
  return "in_stock";
}

function truncate(text: string | null | undefined, max = DESC_MAX): string | null {
  if (!text?.trim()) return null;
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

type InventoryRow = {
  slug: string;
  price: { toString(): string } | number;
  currentStock: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  medicationMaster: {
    name: string;
    genericName: string;
    brandName: string | null;
    strengthDisplay: string | null;
    category: string;
    description: string | null;
  };
};

function toSnapshot(row: InventoryRow): PublicMedicationSnapshot {
  const otc = row.overTheCounter && !row.prescriptionRequired;
  const priceNum =
    typeof row.price === "number" ? row.price : Number(row.price.toString());

  return {
    slug: row.slug,
    path: `/medicines/${row.slug}`,
    name: row.medicationMaster.name,
    genericName: row.medicationMaster.genericName,
    brandName: row.medicationMaster.brandName,
    strength: row.medicationMaster.strengthDisplay,
    category: row.medicationMaster.category,
    overTheCounter: otc,
    prescriptionNote: otc ? "otc" : "may_require_prescription",
    availability: availabilityOf(row.currentStock, row.lowStockThreshold),
    priceKes: formatPrice(Number.isFinite(priceNum) ? priceNum : 0),
    shortDescription: truncate(row.medicationMaster.description),
  };
}

const masterSelect = {
  name: true,
  genericName: true,
  brandName: true,
  strengthDisplay: true,
  category: true,
  description: true,
} as const;

/**
 * Search only public, active pharmacy listings.
 * Never returns purchase price, supplier, shelf, SKU, barcode, lots, or exact stock counts.
 */
export async function searchPublicMedications(
  rawQuery: string,
  limit = DEFAULT_LIMIT,
): Promise<{ query: string; count: number; results: PublicMedicationSnapshot[] }> {
  const query = normalizeQuery(rawQuery);
  const take = Math.min(Math.max(1, limit), HARD_LIMIT);

  if (query.length < 2) {
    return {
      query,
      count: 0,
      results: [],
    };
  }

  const rows = await prisma.pharmacyInventory.findMany({
    where: {
      ...PUBLIC_INVENTORY_WHERE,
      medicationMaster: {
        ...QUALIFYING_MEDICATION_MASTER_WHERE,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { genericName: { contains: query, mode: "insensitive" } },
          { brandName: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
    },
    select: {
      slug: true,
      price: true,
      currentStock: true,
      lowStockThreshold: true,
      overTheCounter: true,
      prescriptionRequired: true,
      medicationMaster: { select: masterSelect },
    },
    orderBy: [{ currentStock: "desc" }],
    take,
  });

  const results = rows.map(toSnapshot);
  return { query, count: results.length, results };
}

/**
 * Fetch one public listing by pharmacy slug. Returns null if not public/active.
 */
export async function getPublicMedicationBySlug(
  rawSlug: string,
): Promise<PublicMedicationSnapshot | null> {
  const slug = rawSlug
    .trim()
    .toLowerCase()
    .slice(0, 120)
    .replace(/[^a-z0-9-]/g, "");

  if (!slug) return null;

  const row = await prisma.pharmacyInventory.findFirst({
    where: {
      ...PUBLIC_INVENTORY_WHERE,
      slug,
      medicationMaster: QUALIFYING_MEDICATION_MASTER_WHERE,
    },
    select: {
      slug: true,
      price: true,
      currentStock: true,
      lowStockThreshold: true,
      overTheCounter: true,
      prescriptionRequired: true,
      medicationMaster: { select: masterSelect },
    },
  });

  return row ? toSnapshot(row) : null;
}
