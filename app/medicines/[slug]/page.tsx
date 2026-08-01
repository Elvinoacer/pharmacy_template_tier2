import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { categories, getCategory } from "../../lib/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return { title: "Category" };
  return {
    title: cat.title,
    description: cat.description,
    alternates: { canonical: `/medicines/${cat.slug}` },
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) notFound();

  return (
    <div>
      <PageHero
        eyebrow="Health category"
        title={cat.title}
        description={cat.description}
        crumbs={[
          { label: "Medicines", href: "/medicines" },
          { label: cat.title },
        ]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl">
            <Image
              src={cat.image}
              alt={cat.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
          <div>
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Featured brands we often stock
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {cat.brands.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-teal-900/10 bg-white px-3.5 py-1.5 text-sm font-medium text-[#0c1a14]"
                >
                  {b}
                </span>
              ))}
            </div>

            <h2
              className="mt-10 text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Pharmacist tips
            </h2>
            <ul className="mt-4 space-y-3">
              {cat.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2.5 text-sm text-[#5a6b62]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                  {tip}
                </li>
              ))}
            </ul>

            <p className="mt-8 rounded-2xl border border-teal-900/5 bg-teal-50/50 p-4 text-sm text-[#5a6b62]">
              Availability varies. This page is educational only — not a product catalogue or checkout.
              Ask in store or call for current stock and personalised advice.
            </p>

            <Link href="/medicines" className="mt-6 inline-block text-sm font-semibold text-teal-800 hover:underline">
              ← All categories
            </Link>
          </div>
        </div>
      </section>

      <CtaBanner />
    </div>
  );
}
