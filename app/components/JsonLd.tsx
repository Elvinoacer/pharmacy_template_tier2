import { pharmacy } from "../lib/data";

/** LocalBusiness / Pharmacy structured data for SEO */
export default function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Pharmacy",
    name: pharmacy.name,
    description: pharmacy.description,
    url: pharmacy.siteUrl,
    telephone: pharmacy.phone,
    email: pharmacy.email,
    image: "/images/og-preview.jpg",
    address: {
      "@type": "PostalAddress",
      streetAddress: pharmacy.address.street,
      addressLocality: pharmacy.address.city,
      addressRegion: pharmacy.address.state,
      postalCode: pharmacy.address.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 30.2672,
      longitude: -97.7431,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "10:00",
        closes: "16:00",
      },
    ],
    sameAs: [
      pharmacy.social.facebook,
      pharmacy.social.instagram,
      pharmacy.social.linkedin,
    ],
    priceRange: "$$",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
