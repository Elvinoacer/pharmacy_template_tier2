import { medicineDisplayName } from "@/app/lib/prescription-discovery";
import { z } from "zod";
import PrescriptionFinder from "../prescription/PrescriptionFinder";
import { findAvailableInventory } from "../lib/services/available-inventory";
import type { CareResult } from "../lib/care-availability";
export const metadata = {
  title: "Find your refill",
  description:
    "Start with your medicine and check availability for your next refill.",
};
export default async function RefillPage({
  searchParams,
}: {
  searchParams: Promise<{ inventoryId?: string }>;
}) {
  const { inventoryId } = await searchParams;
  let initialResults: CareResult[] | null = null;
  let initialError = "";
  if (inventoryId) {
    if (!z.string().uuid().safeParse(inventoryId).success)
      initialError =
        "This medicine link is invalid. Search your medicine below.";
    else {
      const rows = await findAvailableInventory([inventoryId]).catch(
        () => null,
      );
      const row = rows?.[0];
      if (row)
        initialResults = [
          {
            name: medicineDisplayName(row.medicationMaster.name, row.medicationMaster.strengthDisplay),
            truncated: false,
            matches: [
              {
                id: row.id,
                name: medicineDisplayName(row.medicationMaster.name, row.medicationMaster.strengthDisplay),
                price: Number(row.price),
                updatedAt: row.updatedAt.toISOString(),
                href: `/p/${row.pharmacy.slug}/medicines/${row.slug}`,
                pharmacy: row.pharmacy,
              },
            ],
          },
        ];
      else
        initialError = rows
          ? "This listing is no longer available. Search below to check other stock."
          : "We couldn’t check this listing. Please try again below.";
    }
  }
  return (
    <PrescriptionFinder
      mode="refill"
      initialResults={initialResults}
      initialError={initialError}
    />
  );
}
