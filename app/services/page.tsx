import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import { listPublicServices } from "../lib/services/pharmacy-services";
import { formatPrice } from "../lib/format";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Services"
        title="Care services tailored to real life"
        description="From first fills to lifelong chronic care support — browse what we offer and book or walk in when you are ready."
        crumbs={[{ label: "Services" }]}
      />

      <section className="px-3 pb-14 sm:px-6 sm:pb-16">
        {services.length === 0 ? (
          <div className="mx-auto max-w-6xl rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-4 py-10 text-center shadow-sm sm:rounded-3xl sm:px-6 sm:py-14">
            <p className="text-base font-semibold text-[var(--foreground)]">Services coming soon</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Call or message us and we&apos;ll point you in the right direction.
            </p>
            <Link href="/contact" className="btn-primary mt-5 inline-flex min-h-11 w-full items-center justify-center text-sm sm:w-auto">
              Contact us
            </Link>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-6xl gap-3.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="group flex min-w-0 h-full flex-col overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:rounded-3xl"
              >
                <div className="relative h-40 overflow-hidden bg-[var(--card-elev)] sm:h-44 lg:h-48">
                  {s.imageUrl ? (
                    <Image
                      src={s.imageUrl}
                      alt={s.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl opacity-40" aria-hidden="true">
                      🏥
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  {s.price != null && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm sm:text-xs">
                      KES {formatPrice(s.price)}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5 lg:p-6">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h2
                      className="min-w-0 text-lg font-semibold leading-tight text-[var(--foreground)] sm:text-xl"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {s.title}
                    </h2>
                    {s.bookable && (
                      <span className="shrink-0 rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--brand)] sm:text-[10px]">
                        Bookable
                      </span>
                    )}
                  </div>
                  <p className="mt-2 flex-1 text-[13px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-relaxed">{s.short}</p>
                  <span className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[var(--brand)]">
                    {s.bookable ? "View details & book" : "View details"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <CtaBanner
        title="Not sure which service you need?"
        description="Call or message us — a team member will point you in the right direction."
        primaryHref="/contact"
        primaryLabel="Ask us"
        secondaryHref="/faq"
        secondaryLabel="Read FAQ"
      />
    </div>
  );
}
