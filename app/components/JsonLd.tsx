import { platform } from "@/app/lib/data";
import type { ResolvedPharmacy } from "@/app/lib/services/pharmacy-settings";

/** Network Organization on platform pages; Pharmacy LocalBusiness on a storefront. */
export default function JsonLd({ pharmacy = null }: { pharmacy?: ResolvedPharmacy | null }) {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: platform.legalName,
    alternateName: platform.name,
    description: platform.description,
    url: platform.siteUrl,
    telephone: platform.phone,
    email: platform.email,
    areaServed: { "@type": "Country", name: "Kenya" },
    sameAs: [platform.social.facebook, platform.social.instagram, platform.social.linkedin],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: platform.name,
    url: platform.siteUrl,
    description: platform.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${platform.siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const shop =
    pharmacy && !pharmacy.unresolved
      ? {
          "@context": "https://schema.org",
          "@type": "Pharmacy",
          name: pharmacy.name,
          description: pharmacy.description || pharmacy.tagline,
          url: `${platform.siteUrl}/p/${pharmacy.slug}`,
          telephone: pharmacy.phone,
          email: pharmacy.email,
          image: pharmacy.coverImageUrl || pharmacy.logoUrl || undefined,
          address: {
            "@type": "PostalAddress",
            streetAddress: pharmacy.address.street,
            addressLocality: pharmacy.address.city,
            addressRegion: pharmacy.address.state,
            postalCode: pharmacy.address.zip,
            addressCountry: pharmacy.address.country || "KE",
          },
          ...(pharmacy.latitude != null && pharmacy.longitude != null
            ? {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: pharmacy.latitude,
                  longitude: pharmacy.longitude,
                },
              }
            : {}),
        }
      : null;

  const payload = shop ? [org, website, shop] : [org, website];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
