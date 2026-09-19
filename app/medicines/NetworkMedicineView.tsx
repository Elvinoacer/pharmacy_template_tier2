import DiscoveryStructuredData from "@/app/components/DiscoveryStructuredData";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Store,
} from "lucide-react";
import CtaBanner from "@/app/components/CtaBanner";
import PageHero from "@/app/components/PageHero";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { listNetworkListingsForSlug } from "@/app/lib/services/network-catalog";
import NetworkMedicineComparison from "./NetworkMedicineComparison";

export default async function NetworkMedicineView({ slug }: { slug: string }) {
  const origin = await getBrowseLocation();
  const listings = await listNetworkListingsForSlug(slug, origin).catch(() => []);
  const first = listings[0];
  if (!first) notFound();

  const master = first.medicationMaster;
  const categoryLabel = master.category.replace(/-/g, " ");
  const inStockListings = listings.filter((item) => item.availableStock > 0);
  const pharmacies = new Set(listings.map((item) => item.pharmacy.slug)).size;

  return (
    <div className="min-w-0">
      <DiscoveryStructuredData name={master.name} path={`/medicines/${slug}`} section={{ name: "Medicines", path: "/medicines" }} items={listings.map(item => ({ name: item.pharmacy.name, href: item.href }))} />
      <PageHero
        eyebrow={`${categoryLabel} · Network availability`}
        title={master.name}
        description={
          master.description ||
          `Compare live availability of ${master.name} across verified Afyvia pharmacies.`
        }
        crumbs={[
          { label: "Medicines", href: "/medicines" },
          { label: categoryLabel, href: `/medicines?category=${encodeURIComponent(master.category)}` },
          { label: master.name },
        ]}
      />

      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/80">
            {master.imageUrl ? (
              <Image src={master.imageUrl} alt={master.name} fill className="object-contain p-6" sizes="(max-width:1024px) 100vw,40vw" />
            ) : (
              <Image src="/images/care/medicine-still-life.png" alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw,40vw" />
            )}
          </div>
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              This is the network view. Open a pharmacy listing to reserve, request a refill, or read that shop’s price and stock.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Pharmacies</span>
                <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{pharmacies}</p>
              </div>
              <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Available now</span>
                <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{inStockListings.length}</p>
              </div>
            </div>
            <Link
              href="/pharmacies"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--foreground)]"
            >
              <Store className="h-4 w-4 text-[var(--brand)]" />
              Find a nearby pharmacy
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
            Compare stock & pricing across pharmacies
          </h2>
          <NetworkMedicineComparison
            listings={listings}
            masterName={master.name}
            userLocation={origin}
          />
        </div>
      </section>

      <CtaBanner
        title={`Need help finding ${master.name}?`}
        description="Compare pharmacies above, or send a prescription so a pharmacist can check back-office stock."
      />
    </div>
  );
}
