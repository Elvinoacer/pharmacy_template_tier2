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
  Phone,
  ShieldCheck,
} from "lucide-react";
import CtaBanner from "../../components/CtaBanner";
import { ServiceBookingForm } from "../../components/ServiceBookingForm";
import {
  getPublicServiceBySlug,
  listPublicServices,
} from "../../lib/services/pharmacy-services";
import { formatPrice } from "../../lib/format";
import { getSessionUser } from "../../lib/auth";
import { prisma } from "../../lib/db";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";
import styles from "./ServiceDetail.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug).catch(() => null);
  if (!service) return { title: "Service" };
  return {
    title: service.title,
    description: service.short,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/services" />;

  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug).catch(() => null);
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

  return (
    <div className={styles.page}>
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
                <Link key={item.slug} href={`/services/${item.slug}`} className={styles.relatedCard}>
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
}
