import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import { pharmacy, services } from "../lib/data";

export const metadata: Metadata = {
  title: "Services",
  description: `Explore pharmacy services at ${pharmacy.name}: dispensing, refills, vaccinations, screenings, delivery, and more.`,
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <div>
      <PageHero
        eyebrow="Services"
        title="Care services tailored to real life"
        description="From first fills to lifelong chronic care support — browse what we offer and book or walk in when you are ready."
        crumbs={[{ label: "Services" }]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="card-lift group flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_16px_50px_rgba(8,40,32,0.08)]"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h2
                  className="text-xl font-semibold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {s.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5a6b62]">{s.short}</p>
                <span className="mt-4 text-sm font-semibold text-teal-800">View details →</span>
              </div>
            </Link>
          ))}
        </div>
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
