import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, MessageCircle, Phone } from "lucide-react";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
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
  const related = all.filter((s) => s.slug !== service.slug).slice(0, 3);

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
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Service"
        title={service.title}
        description={service.short}
        crumbs={[
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
      />

      <section className="px-3 pb-14 sm:px-6 sm:pb-16">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div className="min-w-0">
            <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--card-elev)] shadow-lg ring-1 ring-inset ring-[var(--line)] sm:mb-8 sm:aspect-[16/10] sm:rounded-[2rem]">
              {service.imageUrl ? (
                <Image
                  src={service.imageUrl}
                  alt={service.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl opacity-30 sm:text-7xl" aria-hidden="true">
                  🏥
                </div>
              )}
            </div>

            <h2
              className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              About this service
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-[var(--muted)] sm:text-base">
              {service.description}
            </p>

            {service.benefits.length > 0 && (
              <section className="mt-7 sm:mt-8">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Benefits</h3>
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {service.benefits.map((b) => (
                    <li key={b} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 text-sm leading-5 text-[var(--foreground)]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                      <span className="min-w-0 break-words">{b}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
              {service.eligibility && (
                <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 sm:p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                    Eligibility
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{service.eligibility}</p>
                </div>
              )}
              {service.duration && (
                <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 sm:p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                    Duration
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{service.duration}</p>
                </div>
              )}
              {service.price != null && (
                <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 sm:col-span-2 sm:p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                    Price
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    KES {formatPrice(service.price)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Online bookings are confirmed only after payment.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="min-w-0 h-fit space-y-4 lg:sticky lg:top-28">
            {service.bookable ? (
              <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <h2
                  className="text-lg font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Book this service
                </h2>
                <p className="mt-2 text-[13px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                  {service.price != null
                    ? "Fill in your details — phone is required. Payment confirms your booking."
                    : "Fill in your details — phone is required. No online payment needed."}
                </p>
                <div className="mt-5 min-w-0">
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
              <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:rounded-3xl sm:p-6">
                <h2
                  className="text-lg font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Get this service
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Online booking is not open for this service. Call, message, or visit us during open hours.
                </p>
                <div className="mt-5 grid gap-2.5">
                  <a
                    href={pharmacy.phoneHref}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-elev)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                    <span className="min-w-0 break-words">{pharmacy.phone}</span>
                  </a>
                  <a
                    href={pharmacy.whatsappHref}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-elev)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                    WhatsApp
                  </a>
                  <div className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-elev)] px-3.5 py-3 text-sm leading-5 text-[var(--muted)]">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                    <span className="min-w-0 break-words">{pharmacy.address.full}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--brand-tint)] p-4 text-xs leading-5 text-[var(--muted)]">
              Prefer to talk first?{" "}
              <a href={pharmacy.phoneHref} className="font-semibold text-[var(--brand)] hover:underline">
                Call {pharmacy.phone}
              </a>{" "}
              or{" "}
              <Link href="/contact" className="font-semibold text-[var(--brand)] hover:underline">
                send a message
              </Link>
              .
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mx-auto mt-12 max-w-6xl sm:mt-16">
            <h2
              className="text-xl font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Related services
            </h2>
            <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
              {related.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--brand)] hover:bg-[var(--card-elev)] sm:block sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--foreground)]">{s.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--muted)]">{s.short}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand)] transition-transform group-hover:translate-x-0.5 sm:mt-3" aria-hidden="true" />
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
