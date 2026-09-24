import "server-only";
import { cache } from "react";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { QUALIFYING_PHARMACY_WHERE, buildPublicInventoryWhere } from "./public-medication-visibility";

export const listDiscoveryLocations = cache(async () => withPlatformBypass(async () => {
  const rows = await prismaUnscoped.pharmacy.findMany({
    where: { ...QUALIFYING_PHARMACY_WHERE, city: { not: null } },
    select: { city: true }, distinct: ["city"], orderBy: { city: "asc" },
  });
  return [...new Map(rows.flatMap(({ city }) => city?.trim() ? [[city.trim().toLowerCase(), city.trim()] as const] : [])).values()];
}));

export const getLocalDiscovery = cache(async (city: string) => withPlatformBypass(async () => {
  const pharmacies = await prismaUnscoped.pharmacy.findMany({
    where: { ...QUALIFYING_PHARMACY_WHERE, city: { equals: city, mode: "insensitive" } },
    select: { id: true, slug: true, name: true, city: true, county: true, latitude: true, longitude: true, coverImageUrl: true, logoUrl: true },
    orderBy: { name: "asc" },
  });
  if (!pharmacies.length) return null;
  const pharmacyIds = pharmacies.map(p => p.id);
  const [medicines, services] = await Promise.all([
    prismaUnscoped.pharmacyInventory.findMany({
      where: { ...buildPublicInventoryWhere(), pharmacyId: { in: pharmacyIds } },
      select: { medicationMaster: { select: { slug: true, name: true, imageUrl: true, category: true } } },
      distinct: ["medicationMasterId"], orderBy: { medicationMasterId: "asc" }, take: 48,
    }),
    prismaUnscoped.pharmacyService.findMany({
      where: { active: true, pharmacyId: { in: pharmacyIds } },
      select: { slug: true, title: true, short: true, imageUrl: true, pharmacyId: true, pharmacy: { select: { slug: true, name: true } } },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    }),
  ]);
  return { city: pharmacies[0].city!, pharmacies, medicines, services };
}));
