import { serializeJsonLd } from "@/app/lib/seo";
import { platform } from "@/app/lib/data";
import type { ResolvedPharmacy } from "@/app/lib/services/pharmacy-settings";

/** Network Organization on platform pages; Pharmacy LocalBusiness on a storefront. */
export default function JsonLd({ pharmacy = null }: { pharmacy?: ResolvedPharmacy | null }) {
  const socials = [
    platform.social.facebook,
    platform.social.instagram,
    platform.social.linkedin,
    (platform.social as { twitter?: string | null }).twitter,
  ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);

  const org = {
    "@context": "https://schema.org",
    "@type": ["Organization", "MedicalOrganization"],
    "@id": `${platform.siteUrl}/#organization`,
    name: platform.legalName,
    alternateName: [
      platform.name,
      "Afyvia Kenya",
      "Afyvia Health",
      "Afyvia Pharmacy Network",
      "Afyvia Platform",
    ],
    description: platform.description,
    url: platform.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${platform.siteUrl}/afyvia-logo-lockup.png`,
      caption: `${platform.name} Logo`,
    },
    image: `${platform.siteUrl}/opengraph-image.png`,
    telephone: platform.phone,
    email: platform.email,
    areaServed: { "@type": "Country", name: "Kenya" },
    address: {
      "@type": "PostalAddress",
      addressCountry: "KE",
      addressLocality: "Nairobi",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: platform.phone,
        contactType: "customer service",
        areaServed: "KE",
        availableLanguage: ["English", "Swahili"],
      },
    ],
    knowsAbout: [
      "Community Pharmacy",
      "Prescription Refills",
      "Vaccinations",
      "Health Screenings",
      "Essential Medicines",
      "Pharmacy and Poisons Board Licensed Pharmacies Kenya",
    ],
    ...(socials.length > 0 ? { sameAs: socials } : {}),
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${platform.siteUrl}/#website`,
    name: platform.name,
    alternateName: [
      platform.name,
      "Afyvia Kenya",
      "Afyvia Pharmacy Network",
    ],
    url: platform.siteUrl,
    description: platform.description,
    inLanguage: "en-KE",
    publisher: {
      "@id": `${platform.siteUrl}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${platform.siteUrl}/medicines?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const shop =
    pharmacy && !pharmacy.unresolved
      ? {
          "@context": "https://schema.org",
          "@type": ["Pharmacy", "MedicalBusiness"],
          "@id": `${platform.siteUrl}/pharmacies/${pharmacy.slug}#pharmacy`,
          name: pharmacy.name,
          description: pharmacy.description || pharmacy.tagline,
          url: `${platform.siteUrl}/pharmacies/${pharmacy.slug}`,
          telephone: pharmacy.phone,
          email: pharmacy.email,
          image: pharmacy.coverImageUrl || pharmacy.logoUrl || undefined,
          parentOrganization: {
            "@id": `${platform.siteUrl}/#organization`,
          },
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
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(payload) }}
    />
  );
}
