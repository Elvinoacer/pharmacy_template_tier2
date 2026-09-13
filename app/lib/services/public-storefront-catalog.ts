import "server-only";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant";
import { publicPharmacyProfile } from "./public-pharmacy-profile";

// Dedicated read-only storefront queries. A URL/search parameter can never
// widen these to the network or supply a different tenant ID.
export async function publicStorefrontMedicines(slug: string, q = "", page = 1, detail?: string) {
  const data = await publicPharmacyProfile(slug);
  if (!data?.profile.id) return null;
  const pharmacyId = data.profile.id;
  return withPharmacy(pharmacyId, () => prismaUnscoped.pharmacyInventory.findMany({
    where: {
      pharmacyId, active: true, publicListing: true,
      ...(detail ? { slug: detail } : {}),
      ...(q.trim() ? { medicationMaster: { OR: [
        { name: { contains: q.trim().slice(0, 120), mode: "insensitive" as const } },
        { genericName: { contains: q.trim().slice(0, 120), mode: "insensitive" as const } },
      ] } } : {}),
    },
    select: {
      id: true, slug: true, price: true, prescriptionRequired: true,
      medicationMaster: { select: { name: true, genericName: true, strengthDisplay: true, packSize: true, description: true } },
    },
    orderBy: [{ medicationMaster: { name: "asc" } }, { id: "asc" }],
    skip: detail ? 0 : (page - 1) * 24,
    take: detail ? 1 : 25,
  }), data.profile.slug);
}

export async function publicStorefrontServices(slug: string, detail?: string) {
  const data = await publicPharmacyProfile(slug);
  if (!data?.profile.id) return null;
  const pharmacyId = data.profile.id;
  return withPharmacy(pharmacyId, () => prismaUnscoped.pharmacyService.findMany({
    where: { pharmacyId, active: true, ...(detail ? { slug: detail } : {}) },
    select: { id: true, slug: true, title: true, short: true, description: true, duration: true, price: true, eligibility: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  }), data.profile.slug);
}
