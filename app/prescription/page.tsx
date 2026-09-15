import { getBrowseLocation } from "@/app/lib/browse-location";
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
      select: { id: true, name: true, slug: true, city: true, county: true },
      orderBy: { name: "asc" },
      take: 20,
    }),
  ).catch(() => []);

  return (
    <PrescriptionFinder
      nearby={Boolean(origin)}
      pharmacies={pharmacies}
    />
  );
}
