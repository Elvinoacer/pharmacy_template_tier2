import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CtaBanner from "../components/CtaBanner";
import { platform } from "../lib/data";
import { listPublicServices } from "../lib/services/pharmacy-services";
import { formatPrice } from "../lib/format";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";
import ServiceCardLink from "./ServiceCardLink";
import styles from "./ServicesPage.module.css";

export const metadata: Metadata = {
  title: "Services",
  description: `Explore pharmacy services at ${platform.name}: dispensing, refills, vaccinations, screenings, delivery, and more.`,
  alternates: { canonical: "/services" },
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/services" />;

  const services = await listPublicServices().catch(() => []);
  const bookableCount = services.filter((service) => service.bookable).length;
  const priced = services
    .map((service) => service.price)
    .filter((price): price is number => price != null && Number.isFinite(price));
  const startingPrice = priced.length > 0 ? Math.min(...priced) : null;
  const heroServices = services.slice(0, 3);

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className={`${styles.ambientOrb} ${styles.ambientOrbOne}`} aria-hidden="true" />
        <div className={`${styles.ambientOrb} ${styles.ambientOrbTwo}`} aria-hidden="true" />

        <div className={styles.container}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Services</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Pharmacy care, made easier
              </div>

              <h1 className={styles.title}>
                Care that feels
                <span className={styles.titleAccent}> clear, calm and within reach.</span>
              </h1>

              <p className={styles.lede}>
                Explore practical pharmacy services without the guesswork. Understand what each service offers,
                see whether it can be booked online, and move straight to the next step.
              </p>

              <div className={styles.heroActions}>
                <Link href="#service-catalogue" className={styles.primaryCta}>
                  Explore services
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/contact" className={styles.secondaryCta}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Talk to the pharmacy
                </Link>
              </div>

              <div className={styles.trustRow} aria-label="Service highlights">
                <span>
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  Pharmacy-led
                </span>
                <span>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Clear next steps
                </span>
                <span>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Online booking where available
                </span>
              </div>
            </div>

            <aside className={styles.careNavigator} aria-label="Service navigator">
              <div className={styles.navigatorHeader}>
                <div>
                  <p className={styles.navigatorKicker}>Your care navigator</p>
                  <h2>Start with what you need</h2>
                </div>
                <span className={styles.livePill}>
                  <span aria-hidden="true" />
                  Available now
                </span>
              </div>

              <div className={styles.navigatorSteps}>
                <div className={styles.navigatorStep}>
                  <span>01</span>
                  <div>
                    <strong>Choose</strong>
                    <p>Open a service that matches your need.</p>
                  </div>
                </div>
                <div className={styles.navigatorStep}>
                  <span>02</span>
                  <div>
                    <strong>Understand</strong>
                    <p>Review benefits, timing, eligibility and price.</p>
                  </div>
                </div>
                <div className={styles.navigatorStep}>
                  <span>03</span>
                  <div>
                    <strong>Act</strong>
                    <p>Book online, call, message or visit the pharmacy.</p>
                  </div>
                </div>
              </div>

              {heroServices.length > 0 && (
                <div className={styles.quickLinks}>
                  <p>Quick start</p>
                  <div>
                    {heroServices.map((service) => (
                      <Link key={service.slug} href={`/services/${service.slug}`}>
                        <span>{service.title}</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.heroStats}>
                <div>
                  <strong>{services.length}</strong>
                  <span>services</span>
                </div>
                <div>
                  <strong>{bookableCount}</strong>
                  <span>bookable</span>
                </div>
                <div>
                  <strong>{startingPrice != null ? `KES ${formatPrice(startingPrice)}` : "Ask us"}</strong>
                  <span>{startingPrice != null ? "from" : "for pricing"}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="service-catalogue" className={styles.catalogueSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Explore care</p>
              <h2>Find the service that fits your day</h2>
              <p>
                Every card opens a dedicated service page with the details and action you need — no dead ends.
              </p>
            </div>
            {services.length > 0 && (
              <div className={styles.sectionSignal}>
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
                <span>
                  <strong>{services.length}</strong> active service{services.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>

          {services.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <HeartPulse className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className={styles.emptyTitle}>Services coming soon</p>
              <p>
                Call or message us and we&apos;ll point you in the right direction.
              </p>
              <Link href="/contact" className={styles.primaryCta}>
                Contact us
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className={styles.serviceGrid}>
              {services.map((service, index) => (
                <ServiceCardLink
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  title={service.title}
                  short={service.short}
                  imageUrl={service.imageUrl}
                  bookable={service.bookable}
                  duration={service.duration}
                  priceLabel={service.price != null ? `KES ${formatPrice(service.price)}` : null}
                  benefitCount={service.benefits.length}
                  featured={index === 0 && services.length > 2}
                />
              ))}
            </div>
          )}

          {services.length > 0 && (
            <div className={styles.guidanceStrip}>
              <div className={styles.guidanceIcon}>
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <strong>Not sure where to begin?</strong>
                <p>Tell us what you need and we can guide you to the most suitable service.</p>
              </div>
              <Link href="/contact">
                Ask for guidance
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <CtaBanner
        title="Need a human answer before you decide?"
        description="Call or message the pharmacy. We can help you choose the right service and explain what happens next."
        primaryHref="/contact"
        primaryLabel="Ask us"
        secondaryHref="/faq"
        secondaryLabel="Read FAQ"
      />
    </div>
  );
}
