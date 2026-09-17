import { getBrowseLocation } from "@/app/lib/browse-location";
import { distanceKm, proximityOrder } from "@/app/lib/proximity";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import PrescriptionFinder from "./PrescriptionFinder";

export const metadata = {
  title: "Find medicines from your prescription",
  description:
    "Upload a prescription photo, review medicine names and compare pharmacy availability.",
};

export default async function PrescriptionPage() {
  const origin = await getBrowseLocation();
  const pharmacies = await withPlatformBypass(() =>
    prismaUnscoped.pharmacy.findMany({
      where: { status: "active", listed: true, verifiedAt: { not: null } },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        county: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { name: "asc" },
    }),
  )
    .then((rows) =>
      rows
        .map((pharmacy) => ({
          ...pharmacy,
          distanceKm: origin ? distanceKm(origin, pharmacy) : null,
        }))
        .sort((a, b) => proximityOrder(a, b) || a.name.localeCompare(b.name)),
    )
    .catch(() => []);

  return (
    <PrescriptionFinder
      nearby={Boolean(origin)}
      pharmacies={pharmacies}
    />
  );
}
