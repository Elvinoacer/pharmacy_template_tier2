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
  ChevronRight,
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

      {/* ── In-Stock Medicines Preview ── */}
      <section id="medicines" className="mt-14 scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={styles.kicker}>MEDICATION DISPENSARY</p>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>
              In-stock medicines at {p.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
              Authentic prescription and OTC essentials available for pickup or rapid local delivery.
            </p>
          </div>
          <Link
            href={`/p/${slug}/medicines`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline sm:text-sm"
          >
            View all {inventoryData.total > 0 ? `${inventoryData.total} ` : ""}medicines
            <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>

        {inventoryData.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inventoryData.items.map((item) => (
              <div
                key={item.id}
                className="liquid-glass care-glass flex flex-col justify-between rounded-2xl border !border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] p-4 shadow-sm backdrop-blur-xl transition hover:!border-[var(--brand)] hover:shadow-md sm:p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-deep)]">
                      {item.medicationMaster.category || "Healthcare"}
                    </span>
                    {item.prescriptionRequired && (
                      <span className="rounded-full border border-amber-700/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-300/50 dark:text-amber-200">
                        Rx Required
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">
                    {item.medicationMaster.name}
                  </h3>
                  {item.medicationMaster.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{item.medicationMaster.description}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] pt-3">
                  <span className="text-sm font-bold text-[var(--foreground)]">
                    KES {Math.round(item.price).toLocaleString("en-KE")}
                  </span>
                  <Link
                    href={`/p/${slug}/medicines`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    View details
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="liquid-glass care-glass rounded-2xl border border-dashed !border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] p-8 text-center backdrop-blur-xl">
            <Pill className="mx-auto h-8 w-8 text-[var(--brand)]" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
              Digital medicine catalog available online
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-[var(--muted)]">
              Browse the live storefront to order or request a prescription refill directly from {p.name}.
            </p>
            <Link
              href={`/p/${slug}/medicines`}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white"
            >
              Open Dispensary Storefront
            </Link>
          </div>
        )}
      </section>

      {/* ── Care Services Preview ── */}
      <section id="services" className="mt-14 scroll-mt-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={styles.kicker}>CLINICAL & WELLNESS CARE</p>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>
              Clinical services at {p.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
              Professional pharmacist consultations, health screenings, and wellness checks.
            </p>
          </div>
          <Link
            href={`/p/${slug}/services`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline sm:text-sm"
          >
            Explore all care services
            <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>

        {servicesData.services.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servicesData.services.slice(0, 6).map((service) => (
              <div
                key={service.id}
                className="liquid-glass care-glass flex flex-col justify-between rounded-2xl border !border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] p-4 shadow-sm backdrop-blur-xl transition hover:!border-[var(--brand)] hover:shadow-md sm:p-5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full border border-teal-800/40 bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:border-teal-200/45 dark:text-teal-100">
                      Clinical Care
                    </span>
                    {service.duration && (
                      <span className="text-[11px] text-[var(--muted)]">
                        {service.duration}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">
                    {service.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                    {service.short || service.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] pt-3">
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    {service.price ? `KES ${Number(service.price).toLocaleString("en-KE")}` : "Free Consultation"}
                  </span>
                  <Link
                    href={`/p/${slug}/services`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    Book / Learn more
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="liquid-glass care-glass rounded-2xl border border-dashed !border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] p-8 text-center backdrop-blur-xl">
            <Activity className="mx-auto h-8 w-8 text-[var(--brand)]" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
              Consultations & Clinical Screenings
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-[var(--muted)]">
              Visit {p.name} or view available clinical screening and vaccination options online.
            </p>
            <Link
              href={`/p/${slug}/services`}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white"
            >
              Browse Pharmacy Services
            </Link>
          </div>
        )}
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
