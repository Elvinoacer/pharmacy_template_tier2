import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "../../components/PageHero";
import CtaBanner from "../../components/CtaBanner";
import { getPublicVaccineBySlug, listPublicVaccines } from "../../lib/services/vaccination-service";
import { VACCINE_CATEGORY_LABELS, type VaccineCategory } from "../../lib/vaccination-catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const v = await getPublicVaccineBySlug(slug).catch(() => null);
  if (!v) return { title: "Vaccine information" };
  return {
    title: v.name,
    description: v.visSummary,
    alternates: { canonical: `/vaccinations/${v.slug}` },
  };
}

export default async function VaccineInfoPage({ params }: Props) {
  const { slug } = await params;
  const v = await getPublicVaccineBySlug(slug);
  if (!v) notFound();

  const price = v.priceKes != null ? Number(v.priceKes) : null;

  return (
    <div>
      <PageHero
        eyebrow="Vaccine information sheet"
        title={v.name}
        description={v.visSummary}
        crumbs={[
          { label: "Vaccinations", href: "/vaccinations" },
          { label: v.name },
        ]}
      />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="space-y-6 rounded-3xl border border-white/60 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
              {VACCINE_CATEGORY_LABELS[v.category as VaccineCategory] || v.category}
              {v.travelRelated ? " · Travel" : ""}
              {v.seasonLabel ? ` · ${v.seasonLabel}` : ""}
            </p>
            <p className="text-sm leading-relaxed text-[#5a6b62]">{v.description}</p>
            <Block title="Who should get it" items={v.whoShouldGet} />
            <Block title="Who should wait" items={v.whoShouldWait} />
            <Block title="Contraindications" items={v.contraindications} />
            <Block title="Precautions" items={v.precautions} />
            <Block title="Common side effects" items={v.commonSideEffects} />
            <Block title="Rare risks" items={v.rareRisks} />
            <div>
              <h2 className="text-sm font-semibold text-[#0c1a14]">Indications</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{v.indications}</p>
            </div>
            {v.regulatoryNotes && (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-semibold">Regulatory note</p>
                <p className="mt-1 text-xs leading-relaxed">{v.regulatoryNotes}</p>
              </div>
            )}
          </article>
          <aside className="h-fit space-y-4 rounded-3xl border border-white/60 bg-white p-6 shadow-sm lg:sticky lg:top-28">
            <dl className="space-y-3 text-sm">
              <Row k="Antigen" val={v.antigen} />
              <Row k="Route" val={v.route} />
              <Row k="Series" val={`${v.seriesDoses} dose${v.seriesDoses === 1 ? "" : "s"}`} />
              <Row k="Storage" val={v.storageRequirements} />
              {price != null && price > 0 && <Row k="Indicative price" val={`KES ${price.toLocaleString()}`} />}
              <Row k="VIS version" val={v.visVersion || "—"} />
            </dl>
            {v.bookable && v.pharmacyAdministered ? (
              <Link href={`/vaccinations/book?vaccine=${v.slug}`} className="btn-primary mt-2 inline-flex w-full justify-center text-sm">
                Book this vaccine
              </Link>
            ) : (
              <Link href="/preventive" className="btn-primary mt-2 inline-flex w-full justify-center text-sm">
                Request counselling / referral
              </Link>
            )}
            <Link href="/vaccinations" className="block text-center text-sm font-semibold text-teal-800">
              All vaccines
            </Link>
          </aside>
        </div>
      </section>
      <CtaBanner
        title="Questions about this vaccine?"
        description="Our pharmacists can walk through eligibility, timing, and how it fits with your other medicines."
        primaryHref="/contact"
        primaryLabel="Ask a pharmacist"
        secondaryHref="/vaccinations/book"
        secondaryLabel="Book"
      />
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h2 className="text-sm font-semibold text-[#0c1a14]">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5a6b62]">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ k, val }: { k: string; val: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{k}</dt>
      <dd className="mt-0.5 text-[#0c1a14]">{val}</dd>
    </div>
  );
}

export async function generateStaticParams() {
  const rows = await listPublicVaccines().catch(() => []);
  return rows.map((v) => ({ slug: v.slug }));
}
