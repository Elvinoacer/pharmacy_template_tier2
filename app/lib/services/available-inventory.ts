import "server-only";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
/** Public stock only; the listing supplies tenant identity, never a remembered cookie. */
export async function findAvailableInventory(ids: string[]) {
  return withPlatformBypass(() =>
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
}
