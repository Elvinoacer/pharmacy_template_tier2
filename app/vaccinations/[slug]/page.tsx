import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "../../components/PageHero";
import CtaBanner from "../../components/CtaBanner";
import { getPublicVaccineBySlug } from "../../lib/services/vaccination-service";
import { getResolvedPharmacyOrNull } from "../../lib/services/pharmacy-settings";
import {
  VACCINE_CATALOG,
  VACCINE_CATEGORY_LABELS,
  type VaccineCategory,
} from "../../lib/vaccination-catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vaccine = VACCINE_CATALOG.find((item) => item.slug === slug);
  if (!vaccine) {
    return {
      title: "Vaccine information not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${vaccine.name} — Vaccine information in Kenya`;
  return {
    title,
    description: vaccine.visSummary,
    alternates: { canonical: `/vaccinations/${vaccine.slug}` },
    openGraph: {
      title,
      description: vaccine.visSummary,
      url: `/vaccinations/${vaccine.slug}`,
    },
  };
}

export default async function VaccineInfoPage({ params }: Props) {
  const { slug } = await params;
  const catalogVaccine = VACCINE_CATALOG.find((item) => item.slug === slug);
  if (!catalogVaccine) notFound();

  // Global vaccine information is backed by the shared catalogue so the URL
  // remains useful and indexable without a selected pharmacy. Storefront routes
  // can still overlay pharmacy-specific availability, price and bookability.
  const pharmacy = await getResolvedPharmacyOrNull().catch(() => null);
  const tenantVaccine = pharmacy
    ? await getPublicVaccineBySlug(slug).catch(() => null)
    : null;
  const v = tenantVaccine ?? catalogVaccine;
  const base = pharmacy ? `/p/${pharmacy.slug}` : "";
  const bookable = tenantVaccine
    ? tenantVaccine.bookable
    : catalogVaccine.pharmacyAdministered;
  const price = v.priceKes != null ? Number(v.priceKes) : null;

  return (
    <div className="bg-transparent">
      <PageHero
        eyebrow="Vaccine information sheet"
        title={v.name}
        description={v.visSummary}
        crumbs={[
          { label: "Vaccinations", href: pharmacy ? `${base}/vaccinations` : "/vaccinations" },
          { label: v.name },
        ]}
      />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="liquid-glass care-glass space-y-6 rounded-3xl border border-[var(--public-health-ui-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl sm:p-8">
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
              <div className="rounded-2xl border border-amber-700/60 bg-amber-500/10 p-4 text-sm text-[var(--foreground)] dark:border-amber-300/60">
                <p className="font-semibold text-amber-800 dark:text-amber-200">Regulatory note</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{v.regulatoryNotes}</p>
              </div>
            )}
          </article>
          <aside className="liquid-glass care-glass h-fit space-y-4 rounded-3xl border border-[var(--public-health-ui-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl lg:sticky lg:top-28">
            <dl className="space-y-3 text-sm">
              <Row k="Antigen" val={v.antigen} />
              <Row k="Route" val={v.route} />
              <Row k="Series" val={`${v.seriesDoses} dose${v.seriesDoses === 1 ? "" : "s"}`} />
              <Row k="Storage" val={v.storageRequirements} />
              {pharmacy && price != null && price > 0 && (
                <Row k="Pharmacy price" val={`KES ${price.toLocaleString()}`} />
              )}
              <Row k="VIS version" val={v.visVersion || "—"} />
            </dl>

            {pharmacy ? (
              bookable && v.pharmacyAdministered ? (
                <Link
                  href={`${base}/vaccinations/book?vaccine=${v.slug}`}
                  className="btn-primary mt-2 inline-flex min-h-11 w-full justify-center text-sm"
                >
                  Book this vaccine
                </Link>
              ) : (
                <Link
                  href={`${base}/preventive`}
                  className="btn-primary mt-2 inline-flex min-h-11 w-full justify-center text-sm"
                >
                  Request counselling / referral
                </Link>
              )
            ) : (
              <Link
                href="/pharmacies"
                className="btn-primary mt-2 inline-flex min-h-11 w-full justify-center text-sm"
              >
                Choose a pharmacy
              </Link>
            )}

            <Link
              href={pharmacy ? `${base}/vaccinations` : "/vaccinations"}
              className="flex min-h-11 items-center justify-center text-center text-sm font-semibold text-[var(--brand)]"
            >
              All vaccines
            </Link>
          </aside>
        </div>
      </section>
      <CtaBanner
        title="Questions about this vaccine?"
        description="Review eligibility and timing with a pharmacy before vaccination. Screening and consent are completed before any dose."
        primaryHref={pharmacy ? `${base}/vaccinations/book` : "/pharmacies"}
        primaryLabel={pharmacy ? "Book" : "Choose a pharmacy"}
        secondaryHref="/vaccinations"
        secondaryLabel="All vaccines"
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
