import Link from "next/link";
import {
  FileUp,
  HeartPulse,
  PackageSearch,
  Pill,
  Store,
} from "lucide-react";
import { getBrowseLocation } from "@/app/lib/browse-location";
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
    <div className="afyvia-route-surface min-h-screen overflow-hidden text-[var(--foreground)]">
      <section className="px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="mx-auto max-w-7xl">
          {/* Sleek compact header without bloated marketing text */}
          <header className="page-hero-glass mb-4 sm:mb-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                  <Pill className="h-4 w-4" aria-hidden /> Medicine catalogue
                </p>
                <h1
                  className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl lg:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Your medicine. Closer to you.
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                  Compare live stock, direct pharmacy prices, and reserve immediately for pickup or delivery.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/prescription"
                  className="glass inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-bold text-[var(--brand-deep)] transition hover:border-[var(--brand)] hover:bg-[var(--card-elev)]"
                >
                  <FileUp className="h-3.5 w-3.5" aria-hidden /> Upload prescription
                </Link>
                <Link
                  href="/services"
                  className="glass inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-bold text-[var(--brand-deep)] transition hover:border-[var(--brand)] hover:bg-[var(--card-elev)]"
                >
                  <HeartPulse className="h-3.5 w-3.5" aria-hidden /> Care services
                </Link>
                <Link
                  href="/pharmacies"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-3.5 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
                >
                  <Store className="h-3.5 w-3.5" aria-hidden /> Nearby pharmacies
                </Link>
              </div>
            </div>
          </header>

          {/* Interactive Medicines Directory */}
          <MedicinesDirectory
            initialItems={items}
            categories={categories}
            total={total}
            initialQuery={q}
            initialCategory={category}
            initialInStock={inStock}
            initialLocation={origin}
          />

          {/* Quick Prescription Help Banner */}
          <div className="care-glass mt-10 rounded-3xl p-4 sm:p-6 text-xs text-[var(--muted)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--foreground)] text-sm">Have a doctor’s prescription slip?</p>
                <p className="mt-0.5 text-xs">
                  Upload your prescription to have a licensed pharmacist inspect dosage, confirm stock, and coordinate dispensing.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href="/prescription"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--brand-soft)] px-3.5 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] transition"
                >
                  <FileUp className="h-3.5 w-3.5" />
                  Upload prescription
                </Link>
                <Link
                  href="/refill"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--line-2)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition"
                >
                  Request refill
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
