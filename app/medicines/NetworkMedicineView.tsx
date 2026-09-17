import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  PackageSearch,
  Sparkles,
  Store,
} from "lucide-react";
import CtaBanner from "@/app/components/CtaBanner";
import PageHero from "@/app/components/PageHero";
import { formatPrice } from "@/app/lib/format";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { listNetworkListingsForSlug } from "@/app/lib/services/network-catalog";

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
      <PageHero
        eyebrow={`${categoryLabel} · Network availability`}
        title={master.name}
        description={
          master.description ||
          `Compare live availability of ${master.name} across verified Aether pharmacies.`
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
            Where it’s listed
          </h2>
          {listings.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-6 text-center">
              <PackageSearch className="mx-auto h-6 w-6 text-[var(--brand)]" />
              <p className="mt-2 text-sm text-[var(--muted)]">No public listings for this medicine yet.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {listings.map((item) => {
                const location = [item.pharmacy.city, item.pharmacy.county].filter(Boolean).join(", ");
                const available = item.availableStock > 0;
                return (
                  <li key={item.id} className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/90 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--foreground)]">{item.pharmacy.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
                          <MapPin className="h-3.5 w-3.5" />
                          {location || "Kenya"}
                          {item.distanceKm != null ? ` · ${item.distanceKm.toFixed(1)} km` : ""}
                        </p>
                        <p className="mt-2 text-sm font-bold text-[var(--foreground)]">KES {formatPrice(item.price)}</p>
                        <p className={`mt-1 text-xs font-semibold ${available ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                          {available ? `${item.availableStock} available to reserve` : "Currently unavailable"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={item.href}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-[var(--brand)] px-4 text-sm font-bold text-white"
                        >
                          {item.prescriptionRequired ? "View at pharmacy" : "Reserve at this pharmacy"}
                          {item.overTheCounter ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        </Link>
                        <Link
                          href={`/pharmacies/${item.pharmacy.slug}`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-[var(--line-2)] px-4 text-sm font-semibold text-[var(--foreground)]"
                        >
                          About pharmacy
                        </Link>
                      </div>
                    </div>
                    {item.overTheCounter && (
                      <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> OTC
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <CtaBanner
        title={`Need help finding ${master.name}?`}
        description="Compare pharmacies above, or send a prescription so a pharmacist can check back-office stock."
      />
    </div>
  );
}
