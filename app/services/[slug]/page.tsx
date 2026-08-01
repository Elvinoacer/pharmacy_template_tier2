import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { getService, pharmacy, services } from "../../lib/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service" };
  return {
    title: service.title,
    description: service.short,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const related = services.filter((s) => s.slug !== service.slug).slice(0, 3);

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
            <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-[2rem] shadow-xl">
              <Image
                src={service.image}
                alt={service.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
            </div>
            <h2
              className="text-2xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              About this service
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#5a6b62]">{service.description}</p>

            <h3 className="mt-8 text-lg font-semibold text-[#0c1a14]">Benefits</h3>
            <ul className="mt-3 space-y-2">
              {service.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[#0c1a14]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-teal-900/5 bg-white/80 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Eligibility</p>
                <p className="mt-2 text-sm text-[#5a6b62]">{service.eligibility}</p>
              </div>
              <div className="rounded-2xl border border-teal-900/5 bg-white/80 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Duration</p>
                <p className="mt-2 text-sm text-[#5a6b62]">{service.duration}</p>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm lg:sticky lg:top-28">
            <h2
              className="text-lg font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Get this service
            </h2>
            <p className="mt-2 text-sm text-[#5a6b62]">
              Call, message, or visit us during open hours. For refills, use the online form.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href={pharmacy.phoneHref} className="font-semibold text-teal-800 hover:underline">
                  {pharmacy.phone}
                </a>
              </li>
              <li>
                <a href={pharmacy.whatsappHref} className="font-semibold text-teal-800 hover:underline">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={`mailto:${pharmacy.email}`} className="font-semibold text-teal-800 hover:underline">
                  {pharmacy.email}
                </a>
              </li>
              <li className="text-[#5a6b62]">{pharmacy.address.full}</li>
            </ul>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/refill" className="btn-primary text-center text-sm !py-2.5">
                Request a refill
              </Link>
              <Link href="/contact" className="btn-ghost text-center text-sm !py-2.5">
                Contact form
              </Link>
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
                  <p className="mt-1 text-sm text-[#5a6b62] line-clamp-2">{s.short}</p>
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
