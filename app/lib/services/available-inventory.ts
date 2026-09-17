import "server-only";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { sellableFromInventory } from "@/app/lib/inventory-availability";
/** Public stock only; the listing supplies tenant identity, never a remembered cookie. */
export async function findAvailableInventory(ids: string[]) {
  const rows = await withPlatformBypass(() =>
    prismaUnscoped.pharmacyInventory.findMany({
      where: {
        id: { in: ids },
        active: true,
        publicListing: true,
        currentStock: { gt: 0 },
        pharmacy: { status: "active", listed: true, verifiedAt: { not: null } },
        medicationMaster: { status: "active" },
      },
      select: {
        id: true,
        slug: true,
        price: true,
        updatedAt: true,
        currentStock: true,
        reservations: { where: { status: "active" }, select: { quantity: true } },
        medicationMaster: { select: { name: true, strengthDisplay: true } },
        pharmacy: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            county: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: 12,
    }),
  );
  return rows.filter((row) => sellableFromInventory(row) > 0);
}
