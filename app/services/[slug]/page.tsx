import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { ServiceBookingForm } from "../../components/ServiceBookingForm";
import { platform } from "../../lib/data";
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
  let defaultEmail = session?.email || "";
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
    <div>
      <PageHero
        eyebrow="Service"
        title={service.title}
        description={service.short}
        crumbs={[
          { label: "Services", href: "/services" },
          { label: service.title },
        ]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-[2rem] bg-[#eef5f1] shadow-xl">
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
                <div className="flex h-full items-center justify-center text-7xl opacity-30">
                  🏥
                </div>
              )}
            </div>
            <h2
              className="text-2xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              About this service
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#5a6b62]">
              {service.description}
            </p>

            {service.benefits.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-semibold text-[#0c1a14]">Benefits</h3>
                <ul className="mt-3 space-y-2">
                  {service.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-[#0c1a14]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {service.eligibility && (
                <div className="rounded-2xl border border-teal-900/5 bg-white/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Eligibility
                  </p>
                  <p className="mt-2 text-sm text-[#5a6b62]">{service.eligibility}</p>
                </div>
              )}
              {service.duration && (
                <div className="rounded-2xl border border-teal-900/5 bg-white/80 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Duration
                  </p>
                  <p className="mt-2 text-sm text-[#5a6b62]">{service.duration}</p>
                </div>
              )}
              {service.price != null && (
                <div className="rounded-2xl border border-teal-900/5 bg-white/80 p-5 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Price
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#0c1a14]">
                    KES {formatPrice(service.price)}
                  </p>
                  <p className="mt-1 text-xs text-[#5a6b62]">
                    Online bookings are confirmed only after payment.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-28">
            {service.bookable ? (
              <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
                <h2
                  className="text-lg font-semibold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Book this service
                </h2>
                <p className="mt-2 text-sm text-[#5a6b62]">
                  {service.price != null
                    ? "Fill in your details — phone is required. Payment confirms your booking."
                    : "Fill in your details — phone is required. No online payment needed."}
                </p>
                <div className="mt-5">
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
              <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
                <h2
                  className="text-lg font-semibold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Get this service
                </h2>
                <p className="mt-2 text-sm text-[#5a6b62]">
                  Online booking is not open for this service. Call, message, or visit us
                  during open hours.
                </p>
                <ul className="mt-5 space-y-3 text-sm">
                  <li>
                    <a
                      href={pharmacy.phoneHref}
                      className="font-semibold text-teal-800 hover:underline"
                    >
                      {pharmacy.phone}
                    </a>
                  </li>
                  <li>
                    <a
                      href={pharmacy.whatsappHref}
                      className="font-semibold text-teal-800 hover:underline"
                    >
                      WhatsApp
                    </a>
                  </li>
                  <li className="text-[#5a6b62]">{pharmacy.address.full}</li>
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-teal-900/5 bg-teal-50/40 p-4 text-xs text-[#5a6b62]">
              Prefer to talk first?{" "}
              <a href={pharmacy.phoneHref} className="font-semibold text-teal-800 hover:underline">
                Call {pharmacy.phone}
              </a>{" "}
              or{" "}
              <Link href="/contact" className="font-semibold text-teal-800 hover:underline">
                send a message
              </Link>
              .
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="mx-auto mt-16 max-w-6xl">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Related services
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm transition hover:border-teal-700/20"
                >
                  <p className="font-semibold text-[#0c1a14]">{s.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#5a6b62]">{s.short}</p>
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
