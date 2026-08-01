import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import { articles, pharmacy } from "../lib/data";

export const metadata: Metadata = {
  title: "Health Library",
  description: `Educational health articles from ${pharmacy.name} pharmacists — medication safety, wellness, and seasonal advice.`,
  alternates: { canonical: "/health" },
};

export default function HealthLibraryPage() {
  const categories = Array.from(new Set(articles.map((a) => a.category)));

  return (
    <div>
      <PageHero
        eyebrow="Health library"
        title="Clear health information you can use"
        description="Articles written and reviewed with community pharmacy practice in mind. For personal medical advice, speak with our pharmacists or your clinician."
        crumbs={[{ label: "Health Library" }]}
      />

      <section className="px-4 pb-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c}
              className="rounded-full border border-teal-900/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#084c3f]"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/health/${a.slug}`}
              className="card-lift group flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={a.image}
                  alt=""
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  {a.category} · {a.readTime} · {a.date}
                </p>
                <h2
                  className="mt-2 text-lg font-semibold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {a.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5a6b62]">{a.excerpt}</p>
                <span className="mt-4 text-sm font-semibold text-teal-800">Read article →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CtaBanner
        title="Have a health question?"
        description="Our pharmacists are available during open hours for counselling and product guidance."
      />
    </div>
  );
}
