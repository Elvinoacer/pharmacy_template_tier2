import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocalDiscovery } from "@/app/lib/services/local-discovery";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { distanceKm, distanceLabel, proximityOrder } from "@/app/lib/proximity";
import { locationPath, serializeJsonLd } from "@/app/lib/seo";
import { platform } from "@/app/lib/data";
import NearbyLocation from "@/app/components/location/NearbyLocation";
import { Aisle, EmptyShelf, MedicineTile, PageHead, PharmacyPlace, PharmacyStreet, ServiceRow, joinMeta } from "@/app/components/listing/pieces";
import listStyles from "@/app/components/listing/listing.module.css";

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
  const lead = pharmacies[0];
  return <div className="mx-auto w-full max-w-6xl overflow-x-clip px-4 pb-28 pt-[var(--public-header-offset)]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structured) }} />
    <PageHead
      kicker="Pharmacies, medicines and services"
      title={data.city}
      lede={origin ? `${pharmacies.length} verified ${pharmacies.length === 1 ? "pharmacy" : "pharmacies"}. Distances are straight-line, not travel time.` : `${pharmacies.length} verified ${pharmacies.length === 1 ? "pharmacy" : "pharmacies"}.`}
      aside={<Link className={listStyles.textLink} href="/locations">All towns</Link>}
    />
    <NearbyLocation active={Boolean(origin)} />
    <section id="local-pharmacies" aria-label={`Pharmacies in ${data.city}`}>
      {lead ? (
        <PharmacyPlace
          href={`/pharmacies/${lead.slug}`}
          name={lead.name}
          imageUrl={null}
          imageAlt=""
          meta={joinMeta([[lead.city, lead.county].filter(Boolean).join(", "), origin ? distanceLabel(lead.distanceKm) : null])}
          actions={[
            { href: `/p/${lead.slug}/medicines`, label: "Medicines" },
            { href: `/p/${lead.slug}/services`, label: "Services" },
          ]}
        />
      ) : null}
      {pharmacies.length > 1 ? (
        <Aisle title="Also in town" aside={<span className={listStyles.aisleCount}>{pharmacies.length - 1}</span>}>
          <div className={listStyles.streetList}>
            {pharmacies.slice(1).map((pharmacy) => (
              <PharmacyStreet
                key={pharmacy.id}
                href={`/pharmacies/${pharmacy.slug}`}
                name={pharmacy.name}
                imageUrl={null}
                imageAlt=""
                meta={joinMeta([[pharmacy.city, pharmacy.county].filter(Boolean).join(", "), origin ? distanceLabel(pharmacy.distanceKm) : null])}
              />
            ))}
          </div>
        </Aisle>
      ) : null}
    </section>
    <section id="local-services">
      <Aisle title="Care" aside={<span className={listStyles.aisleCount}>{services.length}</span>}>
        {services.length ? (
          <div className={listStyles.rows}>
            {services.map((service, index) => (
              <ServiceRow
                key={`${service.pharmacyId}-${service.slug}-${index}`}
                href={`/p/${service.pharmacy.slug}/services/${service.slug}`}
                title={service.title}
                imageUrl={service.imageUrl}
                meta={joinMeta([service.pharmacy.name, service.short, origin ? distanceLabel(distances.get(service.pharmacyId)) : null])}
                priceLabel="View"
              />
            ))}
          </div>
        ) : (
          <EmptyShelf title="No services published here yet" />
        )}
      </Aisle>
    </section>
    <section id="local-medicines">
      <Aisle title="Medicines" aside={<span className={listStyles.aisleCount}>{data.medicines.length}</span>}>
        {data.medicines.length ? (
          <div className={listStyles.rail}>
            {data.medicines.map(({ medicationMaster: medicine }) => (
              <MedicineTile
                key={medicine.slug}
                href={`/medicines/${medicine.slug}`}
                name={medicine.name}
                imageUrl={medicine.imageUrl}
                priceLabel="Compare"
              />
            ))}
          </div>
        ) : (
          <EmptyShelf title="No public medicine listings yet" />
        )}
      </Aisle>
    </section>
    <p className={listStyles.footnote}>
      Run a pharmacy in {data.city}? <Link className={listStyles.textLink} href="/for-pharmacies">List it on Afyvia</Link>
    </p>
  </div>;
}
