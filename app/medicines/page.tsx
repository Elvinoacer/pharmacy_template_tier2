import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import { categories, pharmacy } from "../lib/data";

export const metadata: Metadata = {
  title: "Medicines & Health Categories",
  description: `Browse OTC health categories at ${pharmacy.name}. Educational guidance only — not an online pharmacy checkout.`,
  alternates: { canonical: "/medicines" },
};

export default function MedicinesPage() {
  return (
    <div>
      <PageHero
        eyebrow="Medicines & health"
        title="Categories to help you find the right care"
        description="This is not an online pharmacy. Explore educational categories, featured brands we commonly stock, and tips from our pharmacists. Always ask us before combining products with prescriptions."
        crumbs={[{ label: "Medicines" }]}
      />

      <section className="px-4 pb-6 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 text-sm text-amber-950">
          <strong className="font-semibold">Please note:</strong> No online checkout or direct medicine sales through
          this website. Visit the pharmacy or call us for availability and personalised advice.
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/medicines/${c.slug}`}
              className="card-lift group overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm"
            >
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={c.image}
                  alt={c.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <h2
                  className="absolute bottom-3 left-3 right-3 text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {c.title}
                </h2>
              </div>
              <p className="p-4 text-sm leading-relaxed text-[#5a6b62] line-clamp-3">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <CtaBanner
        title="Need help choosing an OTC product?"
        description="Our pharmacists are happy to recommend safe options that fit your health history."
      />
    </div>
  );
}
