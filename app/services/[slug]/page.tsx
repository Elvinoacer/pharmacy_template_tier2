import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarCheck2,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import CtaBanner from "../../components/CtaBanner";
import { ServiceBookingForm } from "../../components/ServiceBookingForm";
import {
  getPublicServiceBySlug,
  listPublicServices,
} from "../../lib/services/pharmacy-services";
import { formatPrice } from "../../lib/format";
import { getSessionUser } from "../../lib/auth";
import { prisma } from "../../lib/db";
import { getTenant, withPharmacy } from "@/app/lib/tenant";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { prismaUnscoped } from "@/app/lib/db";
import { acceptingCareRequests } from "@/app/lib/services/care-request-availability";
import { redirect } from "next/navigation";
import { loadStorefront } from "@/app/components/StorefrontGate";
import NetworkServiceView from "../NetworkServiceView";
import styles from "./ServiceDetail.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant().catch(() => null);
  const service = await prismaUnscoped.pharmacyService
    .findFirst({
      where: {
        slug,
        active: true,
        ...(tenant?.pharmacyId && !tenant.bypass ? { pharmacyId: tenant.pharmacyId } : {}),
        pharmacy: acceptingCareRequests,
      },
      include: {
        pharmacy: {
          select: { name: true, city: true, county: true, latitude: true, longitude: true },
        },
      },
    })
    .catch(() => null);

  if (!service) return { title: "Pharmacy Service" };

  const locationStr = [service.pharmacy?.city, service.pharmacy?.county, "Kenya"]
    .filter(Boolean)
    .join(", ");
  const coordinates =
    service.pharmacy?.latitude != null && service.pharmacy?.longitude != null
      ? `${service.pharmacy.latitude};${service.pharmacy.longitude}`
      : undefined;

  return {
    title: `${service.title} — ${service.pharmacy?.name || "Local Pharmacy"} in ${locationStr}`,
    description: `${service.short} Book online or visit ${service.pharmacy?.name || "the pharmacy"} in ${locationStr}.`,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title: `${service.title} — ${service.pharmacy?.name || "Care Service"}`,
      description: service.short,
      images: service.imageUrl ? [service.imageUrl] : undefined,
    },
    other: coordinates
      ? {
          "geo.position": coordinates,
          "geo.region": "KE",
          "geo.placename": service.pharmacy?.city || "Kenya",
          "ICBM": `${service.pharmacy?.latitude}, ${service.pharmacy?.longitude}`,
        }
      : undefined,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenant();
  if (!tenant.pharmacyId || tenant.bypass) {
    const listings = await withPlatformBypass(() => prismaUnscoped.pharmacyService.findMany({
      where: { slug, active: true, pharmacy: acceptingCareRequests },
      select: { pharmacy: { select: { slug: true } } }, take: 2,
    }));
    if (listings.length === 1) redirect(`/p/${listings[0].pharmacy.slug}/services/${slug}`);
    if (listings.length > 1) {
      return <NetworkServiceView slug={slug} />;
    }
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
          Service not currently available
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Explore other verified clinical services or check back soon.
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--brand)] px-5 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
          href="/services"
        >
          Explore all services
        </Link>
      </div>
    );
  }
  return withPharmacy(tenant.pharmacyId, async () => {
  const pharmacy = await loadStorefront();
  if (!pharmacy) notFound();
  const service = await getPublicServiceBySlug(slug, pharmacy.id || undefined).catch(() => null);
  if (!service) notFound();

  const all = await listPublicServices().catch(() => []);
  const related = all.filter((item) => item.slug !== service.slug).slice(0, 3);

  const session = await getSessionUser().catch(() => null);
  let defaultName = "";
  let defaultPhone = "";
  const defaultEmail = session?.email || "";

  if (session?.customerId) {
    const profile = await prisma.customerProfile
      .findUnique({
        where: { id: session.customerId },
        select: { fullName: true, phone: true },
      })
      .catch(() => null);

    if (profile) {
      defaultName = profile.fullName || "";
      defaultPhone = profile.phone || "";
    }
  }

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": ["MedicalService", "Service"],
    name: service.title,
    description: service.description || service.short,
    image: service.imageUrl || undefined,
    provider: {
      "@type": "Pharmacy",
      name: pharmacy.name,
      telephone: pharmacy.phone || undefined,
      address: {
        "@type": "PostalAddress",
        addressLocality: pharmacy.address.city || undefined,
        addressCountry: "KE",
      },
    },
    offers: {
      "@type": "Offer",
      price: service.price != null ? Number(service.price) : 0,
      priceCurrency: "KES",
    },
  };

  const origin = await getBrowseLocation();
  const userDistance =
    origin && pharmacy.latitude != null && pharmacy.longitude != null
      ? distanceKm(origin, { latitude: pharmacy.latitude, longitude: pharmacy.longitude })
      : null;

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/services">Services</Link>
            <span aria-hidden="true">/</span>
            <span>{service.title}</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Pharmacy service
              </div>

              <h1 className={styles.title}>{service.title}</h1>
              <p className={styles.summary}>{service.short}</p>

              <div className={styles.metaRow} aria-label="Service summary">
                {userDistance != null && (
                  <span className={styles.metaPill}>
                    <MapPin className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                    {distanceLabel(userDistance)}
                  </span>
                )}
                {service.duration && (
                  <span className={styles.metaPill}>
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {service.duration}
                  </span>
                )}
                {service.price != null && (
                  <span className={styles.metaPill}>
                    <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                    KES {formatPrice(service.price)}
                  </span>
                )}
                <span className={styles.metaPill}>
                  {service.bookable ? (
                    <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {service.bookable ? "Book online" : "Contact pharmacy"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link href={`/pharmacies/${pharmacy.slug}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline">
                  About {pharmacy.name} <ArrowRight size={13} aria-hidden />
                </Link>
                {pharmacy.latitude != null && pharmacy.longitude != null && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--brand)]"
                  >
                    <Navigation className="h-3 w-3 text-teal-600" /> Get directions ↗
                  </a>
                )}
              </div>
              <div className={styles.heroActions}>
                {service.bookable ? (
                  <a href="#booking" className={styles.primaryAction}>
                    Book this service
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : (
                  <a href={pharmacy.phoneHref} className={styles.primaryAction}>
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Call pharmacy
                  </a>
                )}
                <Link href="/services" className={styles.secondaryAction}>
                  Browse all services
                </Link>
              </div>
            </div>

            <div className={styles.mediaFrame}>
              {service.imageUrl ? (
                <Image
                  src={service.imageUrl}
                  alt={service.title}
                  fill
                  className={styles.heroImage}
                  sizes="(max-width: 899px) 100vw, 56vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[var(--card-elev)] text-6xl opacity-35 sm:text-7xl" aria-hidden="true">
                  🏥
                </div>
              )}
              <div className={styles.mediaShade} aria-hidden="true" />
              <span className={styles.mediaBadge}>
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Pharmacy-led care
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.bodySection}>
        <div className={`${styles.container} ${styles.contentGrid}`}>
          <div className={styles.mainColumn}>
            <article className={styles.sectionCard}>
              <p className={styles.sectionLabel}>About this service</p>
              <h2 className={styles.sectionTitle}>What to expect</h2>
              <p className={styles.description}>{service.description}</p>

              {service.benefits.length > 0 && (
                <section className={styles.benefitsSection} aria-labelledby="service-benefits">
                  <p id="service-benefits" className={styles.sectionLabel}>Benefits</p>
                  <ul className={styles.benefitsGrid}>
                    {service.benefits.map((benefit) => (
                      <li key={benefit} className={styles.benefitItem}>
                        <span className={styles.checkIcon} aria-hidden="true">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 break-words">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>

            {(service.eligibility || service.duration || service.price != null) && (
              <div className={styles.detailsGrid} aria-label="Service details">
                {service.eligibility && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailCardHeader}>
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Eligibility
                    </div>
                    <p>{service.eligibility}</p>
                  </div>
                )}

                {service.duration && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailCardHeader}>
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                      Duration
                    </div>
                    <p>{service.duration}</p>
                  </div>
                )}

                {service.price != null && (
                  <div className={`${styles.detailCard} ${styles.priceWide}`}>
                    <div className={styles.detailCardHeader}>
                      <Banknote className="h-4 w-4" aria-hidden="true" />
                      Price
                    </div>
                    <p className={styles.priceValue}>KES {formatPrice(service.price)}</p>
                    <p>Online bookings are confirmed only after payment succeeds.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside id="booking" className={styles.aside}>
            {service.bookable ? (
              <div className={styles.bookingCard}>
                <div className={styles.bookingHeader}>
                  <div className="min-w-0">
                    <h2>Book this service</h2>
                    <p>
                      {service.price != null
                        ? "Enter your details below. Payment confirms your booking."
                        : "Enter your details below. No online payment is required."}
                    </p>
                  </div>
                  <span className={styles.bookingPill}>
                    <CalendarCheck2 className="h-3 w-3" aria-hidden="true" />
                    Online
                  </span>
                </div>

                <div className={styles.formWrap}>
                  <ServiceBookingForm
                    serviceId={service.id}
                    serviceTitle={service.title}
                    price={service.price}
                    defaultName={defaultName}
                    defaultPhone={defaultPhone}
                    defaultEmail={defaultEmail}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.contactCard}>
                <div className={styles.contactHeader}>
                  <div>
                    <h2>Get this service</h2>
                    <p>Online booking is not open for this service. Contact or visit the pharmacy directly.</p>
                  </div>
                </div>

                <div className={styles.contactActions}>
                  <a href={pharmacy.phoneHref} className={styles.contactAction}>
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    <span className="min-w-0 break-words">{pharmacy.phone}</span>
                  </a>
                  <a href={pharmacy.whatsappHref} className={styles.contactAction}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp
                  </a>
                  <div className={`${styles.contactAction} ${styles.address}`}>
                    <MapPin className="mt-0.5 h-4 w-4" aria-hidden="true" />
                    <span className="min-w-0 break-words">{pharmacy.address.full}</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.talkCard}>
              Prefer to talk first?{" "}
              <a href={pharmacy.phoneHref}>Call {pharmacy.phone}</a> or{" "}
              <Link href="/contact">send a message</Link>.
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className={`${styles.container} ${styles.related}`}>
            <div className={styles.relatedHeader}>
              <h2>Related services</h2>
              <Link href="/services">View all</Link>
            </div>

            <div className={styles.relatedGrid}>
              {related.map((item) => (
                <Link key={item.slug} href={`/p/${pharmacy.slug}/services/${item.slug}`} className={styles.relatedCard}>
                  <div className="min-w-0">
                    <strong>{item.title}</strong>
                    <p>{item.short}</p>
                  </div>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <CtaBanner />
    </div>
  );
  });
}
