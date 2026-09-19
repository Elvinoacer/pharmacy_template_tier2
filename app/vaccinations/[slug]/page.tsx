import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "../../components/PageHero";
import CtaBanner from "../../components/CtaBanner";
import { getPublicVaccineBySlug } from "../../lib/services/vaccination-service";
import ChoosePharmacy from "../../components/ChoosePharmacy";
import { getResolvedPharmacyOrNull } from "../../lib/services/pharmacy-settings";
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
  // Deep links without a pharmacy in context get a chooser, not a 404.
  const pharmacy = await getResolvedPharmacyOrNull().catch(() => null);
  if (!pharmacy) {
    return <ChoosePharmacy next={`/vaccinations/${slug}`} />;
  }
  const base = `/p/${pharmacy.slug}`;
  const v = await getPublicVaccineBySlug(slug);
  if (!v) notFound();

  const price = v.priceKes != null ? Number(v.priceKes) : null;

  return (
    <div className="bg-transparent">
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
          <article className="liquid-glass care-glass space-y-6 rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              {VACCINE_CATEGORY_LABELS[v.category as VaccineCategory] || v.category}
              {v.travelRelated ? " · Travel" : ""}
              {v.seasonLabel ? ` · ${v.seasonLabel}` : ""}
            </p>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{v.description}</p>
            <Block title="Who should get it" items={v.whoShouldGet} />
            <Block title="Who should wait" items={v.whoShouldWait} />
            <Block title="Contraindications" items={v.contraindications} />
            <Block title="Precautions" items={v.precautions} />
            <Block title="Common side effects" items={v.commonSideEffects} />
            <Block title="Rare risks" items={v.rareRisks} />
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Indications</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{v.indications}</p>
            </div>
            {v.regulatoryNotes && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-[var(--foreground)]">
                <p className="font-semibold text-amber-600 dark:text-amber-400">Regulatory note</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{v.regulatoryNotes}</p>
              </div>
            )}
          </article>
          <aside className="liquid-glass care-glass h-fit space-y-4 rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl lg:sticky lg:top-28">
            <dl className="space-y-3 text-sm">
              <Row k="Antigen" val={v.antigen} />
              <Row k="Route" val={v.route} />
              <Row k="Series" val={`${v.seriesDoses} dose${v.seriesDoses === 1 ? "" : "s"}`} />
              <Row k="Storage" val={v.storageRequirements} />
              {price != null && price > 0 && <Row k="Indicative price" val={`KES ${price.toLocaleString()}`} />}
              <Row k="VIS version" val={v.visVersion || "—"} />
            </dl>
            {v.bookable && v.pharmacyAdministered ? (
              <Link href={`/vaccinations/book?vaccine=${v.slug}`} className="btn-primary mt-2 inline-flex min-h-11 w-full justify-center text-sm">
                Book this vaccine
              </Link>
            ) : (
              <Link href={`${base}/preventive`} className="btn-primary mt-2 inline-flex min-h-11 w-full justify-center text-sm">
                Request counselling / referral
              </Link>
            )}
            <Link href={`${base}/vaccinations`} className="flex min-h-11 items-center justify-center text-center text-sm font-semibold text-[var(--brand)]">
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
      <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
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
      <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">{k}</dt>
      <dd className="mt-0.5 text-[var(--foreground)]">{val}</dd>
    </div>
  );
}

// generateStaticParams intentionally removed: the page is force-dynamic and
// tenant-scoped (vaccine catalogues differ per pharmacy), so prerendering
// against a build-time tenant would bake the wrong catalogue.
