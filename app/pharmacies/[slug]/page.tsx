import { platform } from "@/app/lib/data";
import { serializeJsonLd } from "@/app/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Pill,
  ShoppingBag,
  Store,
} from "lucide-react";
import ContactForm from "@/app/components/ContactForm";
import { Aisle, EmptyShelf, MedicineTile, ServicePoster, joinMeta, shelfPrice } from "@/app/components/listing/pieces";
import listStyles from "@/app/components/listing/listing.module.css";
import { publicPharmacyProfile } from "@/app/lib/services/public-pharmacy-profile";
import {
  listNetworkMedicineListings,
  listNetworkServiceListings,
} from "@/app/lib/services/network-catalog";
import type { Metadata } from "next";
import styles from "./PharmacyProfile.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await publicPharmacyProfile(slug);
  if (!data) return { title: "Pharmacy" };
  const p = data.profile;
  const locationStr = [p.address.city, p.address.state, "Kenya"].filter(Boolean).join(", ");
  const title = `${p.name} — Pharmacy, Medicines & Care Services in ${locationStr}`;
  const description = `${p.name}: Licensed local pharmacy in ${locationStr}. Browse in-stock medicines, clinical services, prescription refills, and home delivery.`;
  const coordinates = p.latitude != null && p.longitude != null ? `${p.latitude};${p.longitude}` : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/pharmacies/${slug}` },
    openGraph: {
      title,
      description,
      images: p.coverImageUrl ? [p.coverImageUrl] : ["/images/care/editorial-pharmacy.png"],
      type: "website",
    },
    other: coordinates
      ? {
          "geo.position": coordinates,
          "geo.region": "KE",
          "geo.placename": p.address.city || "Kenya",
          "ICBM": `${p.latitude}, ${p.longitude}`,
        }
      : undefined,
  };
}

export default async function PharmacyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicPharmacyProfile(slug);
  if (!data) notFound();
  const { profile: p, gallery, hasPhone, hasEmail, hasWhatsapp } = data;

  const [inventoryData, servicesData] = await Promise.all([
    listNetworkMedicineListings({ pharmacySlug: slug, take: 6 }).catch(() => ({
      total: 0,
      items: [],
      categories: [],
      selectedPharmacy: null,
    })),
    listNetworkServiceListings({ pharmacySlug: slug }).catch(() => ({
      services: [],
      selectedPharmacy: null,
    })),
  ]);

  let mapsEmbed = "";
  try {
    const url = new URL(p.mapsEmbed);
    if (
      url.protocol === "https:" &&
      ["www.google.com", "maps.google.com"].includes(url.hostname)
    )
      mapsEmbed = url.href;
  } catch {}
  const hasLocation = Boolean(
    p.address.street || p.address.city || p.latitude != null,
  );

  const pharmacyJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Pharmacy", "MedicalBusiness"],
    "@id": `${platform.siteUrl}/pharmacies/${slug}#pharmacy`,
    url: `${platform.siteUrl}/pharmacies/${slug}`,
    name: p.name,
    description: p.description || p.tagline,
    image: p.coverImageUrl || p.logoUrl || "/images/care/editorial-pharmacy.png",
    telephone: p.phone || undefined,
    email: p.email || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: p.address.street || undefined,
      addressLocality: p.address.city || undefined,
      addressRegion: p.address.state || undefined,
      addressCountry: "KE",
    },
    ...(p.latitude != null && p.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: p.latitude,
            longitude: p.longitude,
          },
        }
      : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${p.name} Catalogue`,
      itemListElement: [
        {
          "@type": "OfferCatalog",
          name: "Pharmacy Care Services",
          url: `${platform.siteUrl}/p/${slug}/services`,
        },
        {
          "@type": "OfferCatalog",
          name: "In-Stock Medicines & OTC Healthcare",
          url: `${platform.siteUrl}/p/${slug}/medicines`,
        },
      ],
    },
  };

  const heroImageSrc = p.coverImageUrl || "/images/care/editorial-pharmacy.png";

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(pharmacyJsonLd) }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <Link href="/pharmacies" className={styles.back}>
          <ArrowLeft size={15} aria-hidden /> Back to pharmacy directory
        </Link>
        <Link
          href={`/p/${slug}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand)] shadow-sm transition hover:border-[var(--brand)]"
        >
          <Store size={14} aria-hidden />
          Open Full Storefront
          <ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroImage}>
          <Image
            src={heroImageSrc}
            alt={`${p.name} — Pharmacy`}
            fill
            priority
            sizes="(max-width: 700px) 100vw, 55vw"
            className="object-cover"
          />
        </div>
        <div className={`${styles.identity} liquid-glass care-glass`}>
          <p className={styles.kicker}>COMMUNITY HEALTHCARE PARTNER</p>
          <div className={styles.logo}>
            {p.logoUrl ? (
              <Image
                src={p.logoUrl}
                alt=""
                width={48}
                height={48}
                className="object-contain"
              />
            ) : (
              <Store size={25} aria-hidden />
            )}
          </div>
          <h1>{p.name}</h1>
          <p>{p.tagline || "Your trusted community pharmacy for medicines, refills and clinical advice."}</p>
          <span className={styles.location}>
            <MapPin size={15} aria-hidden />
            {[p.address.city, p.address.state].filter(Boolean).join(", ") ||
              "Location details not yet published"}
          </span>

          {/* Prominent Hero Action Buttons */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              href={`/p/${slug}/medicines`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-95"
            >
              <Pill size={15} aria-hidden />
              Browse Medicines
            </Link>
            <Link
              href={`/p/${slug}/services`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] active:scale-95"
            >
              <Activity size={15} aria-hidden />
              Care Services
            </Link>
            <Link
              href={`/p/${slug}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] active:scale-95"
            >
              <Store size={15} aria-hidden />
              Full Storefront
            </Link>
            <Link
              href={`/p/${slug}/order`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] active:scale-95"
            >
              <ShoppingBag size={15} aria-hidden />
              Order & Refill
            </Link>
          </div>

          <div className={styles.actions}>
            {hasPhone && (
              <a href={p.phoneHref}>
                <Phone size={15} aria-hidden />
                Call pharmacy
              </a>
            )}
            {hasLocation && (
              <a
                href={p.mapsDirections}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={15} aria-hidden />
                Get directions
              </a>
            )}
            <a href="#enquiry">
              <MessageCircle size={15} aria-hidden />
              Make an enquiry
            </a>
          </div>
        </div>
      </section>

      {/* Navigation tabs */}
      <nav className={styles.tabs} aria-label="Pharmacy information">
        {[
          ["about", "About"],
          ["medicines", "Medicines"],
          ["services", "Services"],
          ["visit", "Visit & directions"],
          ["gallery", "Gallery"],
          ["enquiry", "Enquiries"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      {/* About & Visit grid */}
      <div className={styles.detailsGrid}>
        <section id="about" className={`${styles.panel} liquid-glass care-glass`}>
          <p className={styles.kicker}>YOUR PHARMACY, UP CLOSE</p>
          <h2>Care with a local connection.</h2>
          <p className={styles.body}>
            {p.about ||
              p.description ||
              `${p.name} is part of the Afyvia network. Contact the pharmacy to learn about its team, services, and care.`}
          </p>
          <div className={styles.contactList}>
            {hasPhone && (
              <a href={p.phoneHref}>
                <Phone size={17} aria-hidden />
                <span>
                  <small>PHONE</small>
                  {p.phone}
                </span>
                <ArrowUpRight size={17} aria-hidden />
              </a>
            )}
            {hasEmail && (
              <a href={`mailto:${p.email}`}>
                <Mail size={17} aria-hidden />
                <span>
                  <small>EMAIL</small>
                  {p.email}
                </span>
                <ArrowUpRight size={17} aria-hidden />
              </a>
            )}
            {hasWhatsapp && (
              <a
                href={p.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} aria-hidden />
                <span>
                  <small>WHATSAPP</small>Talk to the pharmacy
                </span>
                <ArrowUpRight size={17} aria-hidden />
              </a>
            )}
          </div>
        </section>

        <section className={`${styles.panel} liquid-glass care-glass`}>
          <p className={styles.kicker}>PLAN YOUR VISIT</p>
          <h2>
            <Clock size={22} aria-hidden />
            Opening hours
          </h2>
          {p.hours.length ? (
            <dl className={styles.hours}>
              {p.hours.map((h, i) => (
                <div key={`${h.day}-${i}`}>
                  <dt>{h.day}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.body}>
              Opening hours haven’t been published yet. Contact the pharmacy
              before you visit.
            </p>
          )}
          {p.deliveryNotes && (
            <div className={styles.delivery}>
              <h3>Delivery information</h3>
              <p>{p.deliveryNotes}</p>
            </div>
          )}
          <Link href={`/p/${slug}/medicines`} className={styles.textLink}>
            Find available medicines <ArrowUpRight size={15} aria-hidden />
          </Link>
        </section>
      </div>

      <section id="medicines" className={listStyles.block}>
        <Aisle
          title="On the shelf"
          aside={
            <Link className={listStyles.textLink} href={`/p/${slug}/medicines`}>
              {inventoryData.total > inventoryData.items.length ? `All ${inventoryData.total}` : "All medicines"}
            </Link>
          }
        >
          {inventoryData.items.length > 0 ? (
            <div className={listStyles.rail}>
              {inventoryData.items.map((item) => (
                <MedicineTile
                  key={item.id}
                  href={item.href}
                  name={item.medicationMaster.name}
                  imageUrl={item.medicationMaster.imageUrl}
                  priceLabel={item.availableStock > 0 ? shelfPrice(item.price) : "Out"}
                  meta={joinMeta([
                    item.prescriptionRequired ? "Prescription" : "No prescription",
                    item.medicationMaster.category && item.medicationMaster.category !== "general"
                      ? item.medicationMaster.category.replace(/[-_]+/g, " ")
                      : null,
                  ])}
                />
              ))}
            </div>
          ) : (
            <EmptyShelf title="The shelf is still being stocked">
              <p>Browse the live storefront to order or request a refill from {p.name}.</p>
              <div className={listStyles.emptyActions}>
                <Link className={listStyles.primary} href={`/p/${slug}/medicines`}>
                  Open the shelf
                </Link>
              </div>
            </EmptyShelf>
          )}
        </Aisle>
      </section>

      <section id="services" className={listStyles.block}>
        <Aisle
          title="Care here"
          aside={
            <Link className={listStyles.textLink} href={`/p/${slug}/services`}>
              All services
            </Link>
          }
        >
          {servicesData.services.length > 0 ? (
            <div className={listStyles.posterRail}>
              {servicesData.services.slice(0, 6).map((service, index) => (
                <ServicePoster
                  key={service.id}
                  href={service.href}
                  title={service.title}
                  imageUrl={service.imageUrl}
                  meta={joinMeta([service.short, service.duration])}
                  action={`${service.bookable ? "Book" : "View"} · ${service.price != null ? shelfPrice(Number(service.price), false) : "Ask the pharmacy"}`}
                  priority={index === 0}
                />
              ))}
            </div>
          ) : (
            <EmptyShelf title="Care visits are listed on the storefront">
              <p>See screenings, vaccines, and consultations published by {p.name}.</p>
              <div className={listStyles.emptyActions}>
                <Link className={listStyles.primary} href={`/p/${slug}/services`}>
                  See services
                </Link>
              </div>
            </EmptyShelf>
          )}
        </Aisle>
      </section>

      {/* ── Visit & Directions ── */}
      <section id="visit" className={styles.visit}>
        <div className={`${styles.panel} liquid-glass care-glass`}>
          <p className={styles.kicker}>FIND YOUR WAY HERE</p>
          <h2>
            A familiar place,
            <br />
            <em>a simple route.</em>
          </h2>
          <p className={styles.body}>
            {hasLocation
              ? p.address.full
              : "Address details haven’t been published yet."}
          </p>
          {p.latitude == null && hasLocation && (
            <p className={styles.small}>
              The pharmacy hasn’t provided an exact map pin. Directions use its
              published address.
            </p>
          )}
          {hasLocation && (
            <a
              href={p.mapsDirections}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.direction}
            >
              <Navigation size={16} aria-hidden />
              Open directions
              <ArrowUpRight size={16} aria-hidden />
            </a>
          )}
        </div>
        <div className={styles.map}>
          {mapsEmbed ? (
            <iframe
              src={mapsEmbed}
              title={`Map showing ${p.name}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          ) : (
            <div className={styles.noPhoto}>
              <MapPin size={35} aria-hidden />
              <span>Exact map location not yet published.</span>
              {hasLocation && (
                <a
                  href={p.mapsDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View published address in Maps ↗
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Photo Gallery ── */}
      <section id="gallery" className={styles.gallerySection}>
        <p className={styles.kicker}>A LOOK INSIDE</p>
        <h2>Get to know the space.</h2>
        {gallery.length ? (
          <div className={styles.gallery}>
            {gallery.map((g, i) => (
              <a
                key={`${g.src}-${i}`}
                href={g.src}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${g.caption || "pharmacy photo"}`}
              >
                <div>
                  <Image
                    src={g.src}
                    alt={g.alt}
                    fill
                    sizes="(max-width: 700px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                {g.caption && (
                  <span>
                    {g.caption}
                    <ArrowUpRight size={14} aria-hidden />
                  </span>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className={`${styles.emptyGallery} liquid-glass care-glass`}>
            <Camera size={27} aria-hidden />
            <p>
              The pharmacy’s own photos will appear here when they are published.
            </p>
          </div>
        )}
      </section>

      {/* ── Enquiry Section ── */}
      <section id="enquiry" className={styles.enquiry}>
        <div>
          <p className={styles.kicker}>A QUESTION IS A GOOD START</p>
          <h2>
            Let’s put you
            <br />
            <em>in touch.</em>
          </h2>
          <p className={styles.body}>
            Ask {p.name} about a service, collection, delivery, or a medicine
            listing. Your enquiry goes directly to its team.
          </p>
        </div>
        <div className={`${styles.panel} liquid-glass care-glass`}>
          <ContactForm pharmacySlug={slug} />
        </div>
      </section>
    </div>
  );
}
