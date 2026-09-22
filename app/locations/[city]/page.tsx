import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocalDiscovery } from "@/app/lib/services/local-discovery";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { distanceKm, distanceLabel, proximityOrder } from "@/app/lib/proximity";
import { locationPath, serializeJsonLd } from "@/app/lib/seo";
import { platform } from "@/app/lib/data";
import NearbyLocation from "@/app/components/location/NearbyLocation";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ city: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const data = await getLocalDiscovery(city);
  if (!data) return { title: "Location not found", robots: { index: false } };
  const title = `Pharmacies, medicines & health services in ${data.city}`;
  const description = `Find ${data.pharmacies.length} verified Afyvia pharmacy listings in ${data.city}. Compare medicine listings and available services, and see nearby providers with your location.`;
  return { title, description, alternates: { canonical: locationPath(data.city) }, openGraph: { title, description, url: locationPath(data.city) } };
}
export default async function LocalPage({ params }: Props) {
  const { city } = await params;
  const [data, origin] = await Promise.all([getLocalDiscovery(city), getBrowseLocation()]);
  if (!data) notFound();
  if (city !== data.city.trim().toLowerCase()) permanentRedirect(locationPath(data.city));
  const pharmacies = data.pharmacies.map(p => ({ ...p, distanceKm: origin ? distanceKm(origin, p) : null })).sort((a, b) => proximityOrder(a, b) || a.name.localeCompare(b.name));
  const distances = new Map(pharmacies.map(p => [p.id, p.distanceKm]));
  const services = [...data.services].sort((a, b) => proximityOrder({ distanceKm: distances.get(a.pharmacyId) }, { distanceKm: distances.get(b.pharmacyId) }) || a.title.localeCompare(b.title));
  const url = `${platform.siteUrl}${locationPath(data.city)}`;
  const structured = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: `Pharmacies and care in ${data.city}`, url, mainEntity: { "@type": "ItemList", itemListElement: pharmacies.map((p, index) => ({ "@type": "ListItem", position: index + 1, name: p.name, url: `${platform.siteUrl}/pharmacies/${p.slug}` })) } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Locations", item: `${platform.siteUrl}/locations` }, { "@type": "ListItem", position: 2, name: data.city, item: url }] },
  ];
  return <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-[var(--public-header-offset)]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structured) }} />
    <Link href="/locations">All locations</Link>
    <header className="page-hero-glass"><h1 className="mt-4 text-3xl font-semibold">Pharmacies, medicines and services in {data.city}</h1>
    <p className="my-4 text-[var(--muted)]">Explore {pharmacies.length} verified pharmacy {pharmacies.length === 1 ? "listing" : "listings"} in {data.city}. Check each provider’s published catalogue and contact details before visiting.</p>
    </header>
    <NearbyLocation active={Boolean(origin)} />
    {origin && <p className="mb-4 text-sm text-[var(--muted)]">Distances are approximate straight-line distances, not travel distances. Providers without coordinates appear last.</p>}
    <section aria-labelledby="local-pharmacies"><h2 id="local-pharmacies" className="my-5 text-2xl font-semibold">Pharmacies in {data.city}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{pharmacies.map(p => <article key={p.id} className="care-glass rounded-2xl p-5">
        <h3 className="text-lg font-semibold"><Link href={`/pharmacies/${p.slug}`}>{p.name}</Link></h3><p>{[p.city, p.county].filter(Boolean).join(", ")}</p>
        {origin && <p className="my-2 text-sm">{distanceLabel(p.distanceKm) || "Distance unavailable"}</p>}
        <p className="mt-3"><Link href={`/p/${p.slug}/medicines`}>Medicines</Link> · <Link href={`/p/${p.slug}/services`}>Services</Link></p>
      </article>)}</div>
    </section>
    <section aria-labelledby="local-services"><h2 id="local-services" className="my-5 text-2xl font-semibold">Health services in {data.city}</h2>
      {services.length ? <div className="grid gap-4 sm:grid-cols-2">{services.map((s, i) => <article key={`${s.pharmacyId}-${s.slug}-${i}`} className="care-glass overflow-hidden rounded-2xl">
        <Link href={`/p/${s.pharmacy.slug}/services/${s.slug}`} className="relative block aspect-[16/9] bg-[var(--card-elev)]">
          <Image unoptimized src={s.imageUrl || "/images/care/editorial-pharmacy.png"} alt={s.imageUrl ? s.title : ""} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
        </Link>
        <div className="p-5"><h3 className="font-semibold"><Link href={`/p/${s.pharmacy.slug}/services/${s.slug}`}>{s.title} at {s.pharmacy.name}</Link></h3><p className="my-2 text-sm">{s.short}</p>{origin && <p className="text-sm">{distanceLabel(distances.get(s.pharmacyId)) || "Distance unavailable"}</p>}<Link href={`/services/${s.slug}`}>Compare providers</Link></div>
      </article>)}</div> : <p>No services are currently published for this location.</p>}
    </section>
    <section aria-labelledby="local-medicines"><h2 id="local-medicines" className="my-5 text-2xl font-semibold">Medicine listings from pharmacies in {data.city}</h2><p className="mb-4 text-sm text-[var(--muted)]">Compare network providers on each medicine page. Availability and prices may change; prescription requirements apply.</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.medicines.map(({ medicationMaster: m }) => <li key={m.slug} className="care-glass overflow-hidden rounded-2xl">
        <Link href={`/medicines/${m.slug}`} className="relative block aspect-[4/3] bg-[var(--card-elev)]">
          <Image unoptimized src={m.imageUrl || "/images/care/medicine-still-life.png"} alt={m.imageUrl ? m.name : ""} fill sizes="(max-width: 640px) 100vw, 33vw" className={m.imageUrl ? "object-contain p-3" : "object-cover"} />
        </Link>
        <div className="p-4"><Link className="font-semibold" href={`/medicines/${m.slug}`}>{m.name}</Link></div>
      </li>)}</ul>
      {!data.medicines.length && <p>No public medicine listings are currently available for this location.</p>}
    </section>
    <section className="care-glass mt-8 rounded-2xl p-5"><h2 className="text-xl font-semibold">Run a pharmacy in {data.city}?</h2><p className="my-3">Join Afyvia to publish your pharmacy profile, medicine catalogue and services, and receive customer requests.</p><Link href="/for-pharmacies">Explore Afyvia for pharmacies</Link></section>
  </div>;
}
