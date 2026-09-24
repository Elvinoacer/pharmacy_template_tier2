import Link from "next/link";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { PageHead } from "@/app/components/listing/pieces";
import listStyles from "@/app/components/listing/listing.module.css";
import { listNetworkMedicineListings } from "../lib/services/network-catalog";
import MedicinesDirectory from "./MedicinesDirectory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Browse Medicines & Stock Proximity — Afyvia",
  description:
    "Explore real-time medicine availability, direct pricing, and prescription dispensing across verified local pharmacies.",
  alternates: { canonical: "/medicines" },
};

const INITIAL_PAGE_SIZE = 48;

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
    stock?: string;
  }>;
}) {
  const sp = await searchParams;
  const origin = await getBrowseLocation();
  const q = sp.q?.trim() || "";
  const category = sp.category?.trim() || "";
  const inStock = sp.stock !== "all";

  const data = await listNetworkMedicineListings({
    q: q || undefined,
    origin,
    category: category || undefined,
    inStock,
    take: INITIAL_PAGE_SIZE,
  }).catch(() => null);

  const items = data?.items || [];
  const categories = data?.categories || [];
  const total = data?.total || 0;

  return (
    <div className="afyvia-route-surface min-h-screen overflow-x-clip text-[var(--foreground)]">
      <section className="px-4 pb-28 pt-[var(--public-header-offset)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <PageHead
            kicker="The shelf"
            title="Medicines"
            aside={
              <Link className={listStyles.textLink} href="/prescription">
                Prescription
              </Link>
            }
          />
          <MedicinesDirectory
            initialItems={items}
            categories={categories}
            total={total}
            initialQuery={q}
            initialCategory={category}
            initialInStock={inStock}
            initialLocation={origin}
          />
        </div>
      </section>
    </div>
  );
}
