import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertOctagon,
  CheckCircle2,
  Clock3,
  HelpCircle,
  PackageSearch,
  ShieldAlert,
  Sparkles,
  Store,
} from "lucide-react";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { Markdown } from "../../components/Markdown";
import {
  MedicineCatalogGrid,
  type MedicineCatalogItem,
} from "../../components/MedicineCatalogCard";
import ChoosePharmacy from "../../components/ChoosePharmacy";
import DigitalCounsellingCard from "../../components/health/DigitalCounsellingCard";
import { prisma } from "../../lib/db";
import { formatPrice } from "../../lib/format";
import { generateDynamicCounsellingProfile } from "../../lib/medication-counselling";
import { getPublicCategoryBySlug } from "../../lib/medication-categories";
import { getOtcCategoryGuidance } from "../../lib/otc-guidance";
import { getMedicationCounsellingBySlug } from "../../lib/services/medication-counselling-db";
import { getResolvedPharmacyOrNull } from "../../lib/services/pharmacy-settings";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getPublicCategoryBySlug(slug).catch(() => null);

  if (cat) {
    return {
      title: `${cat.name} — Products, Safety & Pharmacist Guidance`,
      description:
        cat.description ||
        `${cat.name} products, self-care guidance, safety information and pharmacist advice`,
      alternates: { canonical: `/medicines/${cat.slug}` },
    };
  }

  const med = await prisma.pharmacyInventory
    .findFirst({
      where: { slug },
      include: {
        medicationMaster: {
          select: { name: true, description: true, dosage: true },
        },
      },
    })
    .catch(() => null);

  if (med) {
    return {
      title: med.medicationMaster.name,
      description:
        med.medicationMaster.description ||
        `${med.medicationMaster.name} — availability, price, safety and counselling information`,
      alternates: { canonical: `/medicines/${med.slug}` },
    };
  }

  return { title: "Medicine" };
}

export default async function CategoryOrMedicinePage({ params }: Props) {
  const { slug } = await params;
  const pharmacy = await getResolvedPharmacyOrNull().catch(() => null);

  if (!pharmacy) {
    return <ChoosePharmacy next={`/medicines/${slug}`} />;
  }

  const base = `/p/${pharmacy.slug}`;
  const cat = await getPublicCategoryBySlug(slug).catch(() => null);
  const otcGuidance = cat ? getOtcCategoryGuidance(cat.slug) : null;

  if (cat) {
    const products = await prisma.pharmacyInventory
      .findMany({
        where: {
          pharmacyId: pharmacy.id,
          publicListing: true,
          active: true,
          medicationMaster: { category: cat.slug },
        },
        include: {
          medicationMaster: {
            select: {
              name: true,
              description: true,
              category: true,
              imageUrl: true,
            },
          },
        },
        orderBy: [{ currentStock: "desc" }],
        take: 24,
      })
      .catch(() => []);

    const catalogItems: MedicineCatalogItem[] = products
      .map((m) => {
        const master = m.medicationMaster;
        if (!master) return null;
        const priceNum = Number(m.price.toString());
        return {
          id: m.id,
          slug: m.slug,
          price: Number.isFinite(priceNum) ? priceNum : 0,
          currentStock: m.currentStock,
          overTheCounter: m.overTheCounter,
          prescriptionRequired: m.prescriptionRequired,
          medicationMaster: {
            name: master.name,
            description: master.description,
            category: master.category,
            imageUrl: master.imageUrl,
          },
        } satisfies MedicineCatalogItem;
      })
      .filter((x): x is MedicineCatalogItem => x !== null);

    const availableCount = catalogItems.filter((item) => item.currentStock > 0).length;

    return (
      <div className="min-w-0">
        <PageHero
          eyebrow="Medicines · Category guide"
          title={cat.name}
          description={
            cat.description ||
            "Browse products available from this pharmacy, then review concise self-care and safety guidance before choosing a treatment."
          }
          crumbs={[
            { label: "Medicines", href: `${base}/medicines` },
            { label: cat.name },
          ]}
        />

        <section className="px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="mx-auto max-w-6xl">
            <nav
              aria-label={`${cat.name} sections`}
              className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1 text-xs font-semibold"
            >
              <a
                href="#category-products"
                className="shrink-0 rounded-full bg-[var(--brand)] px-3.5 py-2 text-white shadow-sm"
              >
                Browse products
              </a>
              <a
                href="#category-overview"
                className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-2 text-[var(--brand-deep)]"
              >
                Category guide
              </a>
              {otcGuidance && (
                <a
                  href="#category-safety"
                  className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-2 text-[var(--brand-deep)]"
                >
                  Safety first
                </a>
              )}
            </nav>

            <div
              id="category-overview"
              className="scroll-mt-32 overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm"
            >
              <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                <div className="relative min-h-52 overflow-hidden bg-[var(--card-elev)] sm:min-h-64 lg:min-h-[360px]">
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 44vw"
                      priority
                    />
                  ) : (
                    <div className="flex h-full min-h-52 items-center justify-center text-6xl opacity-40 sm:min-h-64">
                      💊
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md sm:bottom-4 sm:left-4 sm:text-xs">
                    {cat.name}
                  </span>
                </div>

                <div className="min-w-0 p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--line-2)] bg-[var(--brand-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--brand-deep)] sm:text-xs">
                      OTC category
                    </span>
                    {otcGuidance && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-[var(--card-elev)] px-3 py-1 text-[10px] font-semibold text-[var(--muted)] sm:text-xs">
                        <Clock3 className="h-3.5 w-3.5 text-[var(--brand)]" />
                        {otcGuidance.maxSelfCareDuration}
                      </span>
                    )}
                  </div>

                  <h2
                    className="mt-4 text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Find what you need without losing the safety context
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
                    {cat.description ||
                      "Compare products from the selected pharmacy, then use the category guidance to decide whether self-care is appropriate."}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">
                        Listed
                      </span>
                      <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
                        {catalogItems.length}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">products</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">
                        Available
                      </span>
                      <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
                        {availableCount}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">in stock</p>
                    </div>
                    <div className="col-span-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">
                        Pharmacy
                      </span>
                      <p className="mt-1 line-clamp-1 text-sm font-bold text-[var(--foreground)]">
                        {pharmacy.name}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">live catalogue</p>
                    </div>
                  </div>

                  {otcGuidance?.commonActiveIngredients?.length ? (
                    <div className="mt-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)] sm:text-xs">
                        Common active ingredients
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {otcGuidance.commonActiveIngredients.map((ingredient) => (
                          <span
                            key={ingredient}
                            className="rounded-full border border-[var(--line-2)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)] sm:text-xs"
                          >
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {cat.brands.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)] sm:text-xs">
                        Common brands
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cat.brands.map((brand) => (
                          <span
                            key={brand}
                            className="rounded-full border border-[var(--line-2)] bg-[var(--card)] px-2.5 py-1 text-[10px] font-semibold text-[var(--foreground)] sm:text-xs"
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    <Link
                      href={`${base}/health/self-care-guide`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Self-care guide
                    </Link>
                    <Link
                      href={`${base}/how-do-you-feel?category=${encodeURIComponent(cat.slug)}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] px-4 py-2.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--brand-soft)]"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI symptom check
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="category-products"
          className="scroll-mt-32 px-4 pb-10 sm:px-6 sm:pb-14"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
                  Live stock · {pharmacy.name}
                </p>
                <h2
                  className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {cat.name} available now
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                  Check current stock, prescription requirements and prices before opening a product.
                </p>
              </div>
              <Link
                href={`${base}/medicines?category=${encodeURIComponent(cat.slug)}`}
                className="inline-flex min-h-10 w-fit items-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
              >
                Full catalogue
              </Link>
            </div>

            {catalogItems.length > 0 ? (
              <MedicineCatalogGrid items={catalogItems} />
            ) : (
              <div className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-6 text-center shadow-sm sm:p-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card-elev)] text-[var(--brand)]">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[var(--foreground)]">
                  No {cat.name.toLowerCase()} products are listed right now
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">
                  Browse the wider catalogue or ask the pharmacy to help locate a suitable option.
                </p>
                <Link
                  href={`${base}/medicines`}
                  className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[var(--brand)] px-4 text-xs font-semibold text-white"
                >
                  Browse all medicines
                </Link>
              </div>
            )}
          </div>
        </section>

        {otcGuidance && (
          <section
            id="category-safety"
            className="scroll-mt-32 px-4 pb-10 sm:px-6 sm:pb-14"
          >
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 sm:mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
                  Safety before self-treatment
                </p>
                <h2
                  className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Know when self-care is reasonable
                </h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                  Use this as a safety screen, not a diagnosis. Seek clinical advice for severe, rapidly worsening or otherwise concerning symptoms.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                <article className="rounded-3xl border border-emerald-500/30 bg-[var(--card)] p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 sm:text-xs">
                        Usually suitable for self-care
                      </p>
                      <h3 className="mt-0.5 text-base font-bold text-[var(--foreground)]">
                        Mild, familiar problems
                      </h3>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {otcGuidance.selfCareAppropriate.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted)] sm:text-sm"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3 text-xs leading-relaxed text-[var(--muted)]">
                    <strong className="text-[var(--foreground)]">Reassess:</strong> if symptoms are not improving within {otcGuidance.maxSelfCareDuration}.
                  </div>
                </article>

                <article className="rounded-3xl border border-rose-500/30 bg-[var(--card)] p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
                      <AlertOctagon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 sm:text-xs">
                        Seek medical advice
                      </p>
                      <h3 className="mt-0.5 text-base font-bold text-[var(--foreground)]">
                        Red flags and warning signs
                      </h3>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {otcGuidance.medicalAttentionCriteria.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs font-medium leading-relaxed text-[var(--foreground)] sm:text-sm"
                      >
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {otcGuidance.emergencyWarning && (
                    <div className="mt-4 rounded-2xl border border-rose-500/30 bg-[var(--card-elev)] p-3 text-xs font-semibold leading-relaxed text-[var(--foreground)]">
                      {otcGuidance.emergencyWarning}
                    </div>
                  )}
                </article>
              </div>

              {otcGuidance.pharmacistTips.length > 0 && (
                <div className="mt-4 rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5 lg:p-6">
                  <h3
                    className="text-lg font-semibold text-[var(--foreground)]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Pharmacist tips for {cat.name}
                  </h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {otcGuidance.pharmacistTips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] p-3 text-xs leading-relaxed text-[var(--muted)]"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <CtaBanner
          title={`Not sure which ${cat.name.toLowerCase()} product fits?`}
          description="Ask a pharmacist before choosing. They can confirm suitability, check interactions and tell you when symptoms need clinical assessment instead of self-treatment."
        />
      </div>
    );
  }

  const med = await prisma.pharmacyInventory
    .findFirst({
      where: { slug, pharmacyId: pharmacy.id, active: true },
      include: {
        medicationMaster: {
          select: {
            name: true,
            genericName: true,
            description: true,
            dosage: true,
            indications: true,
            sideEffects: true,
            contraindications: true,
            storage: true,
            category: true,
            imageUrl: true,
            imageUrls: true,
            alternativeIds: true,
            dosageForm: { select: { value: true } },
          },
        },
      },
    })
    .catch(() => null);

  if (!med) notFound();

  const altIds = (med.medicationMaster.alternativeIds || "")
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const alternatives =
    altIds.length > 0
      ? await prisma.pharmacyInventory
          .findMany({
            where: {
              pharmacyId: pharmacy.id,
              medicationMasterId: { in: altIds },
              active: true,
            },
            include: {
              medicationMaster: { select: { name: true, imageUrl: true } },
            },
            take: 6,
          })
          .catch(() => [])
      : [];

  const related =
    alternatives.length > 0
      ? alternatives
      : await prisma.pharmacyInventory
          .findMany({
            where: {
              pharmacyId: pharmacy.id,
              medicationMaster: { category: med.medicationMaster.category },
              id: { not: med.id },
              active: true,
              OR: [{ publicListing: true }, { overTheCounter: true }],
            },
            include: {
              medicationMaster: { select: { name: true, imageUrl: true } },
            },
            take: 4,
          })
          .catch(() => []);

  const categoryLabel = med.medicationMaster.category.replace(/-/g, " ");
  const categoryHref = `${base}/medicines/${med.medicationMaster.category}`;
  const inStock = med.currentStock > 0;
  const gallery = (med.medicationMaster.imageUrls || "")
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((url) => url !== med.medicationMaster.imageUrl)
    .slice(0, 8);

  const counsellingProfile =
    (await getMedicationCounsellingBySlug(med.slug)) ||
    generateDynamicCounsellingProfile(
      med.medicationMaster.name,
      med.medicationMaster.genericName,
      med.medicationMaster.category,
      med.medicationMaster.dosageForm?.value || null,
      med.medicationMaster.dosage,
      med.medicationMaster.storage,
      med.medicationMaster.sideEffects
    );

  return (
    <div className="min-w-0">
      <PageHero
        eyebrow={categoryLabel}
        title={med.medicationMaster.name}
        description={
          med.medicationMaster.description ||
          med.medicationMaster.dosage ||
          `Available from ${pharmacy.name}`
        }
        crumbs={[
          { label: "Medicines", href: `${base}/medicines` },
          { label: categoryLabel, href: categoryHref },
          { label: med.medicationMaster.name },
        ]}
      />

      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          <div className="min-w-0 space-y-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--card-elev)] shadow-sm sm:rounded-[2rem]">
              {med.medicationMaster.imageUrl ? (
                <Image
                  src={med.medicationMaster.imageUrl}
                  alt={med.medicationMaster.name}
                  fill
                  className="object-contain p-4 sm:p-6"
                  sizes="(max-width: 1024px) 100vw, 44vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl opacity-50 sm:text-7xl">
                  💊
                </div>
              )}
            </div>

            {gallery.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {gallery.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] sm:rounded-2xl"
                  >
                    <Image
                      src={src}
                      alt={`${med.medicationMaster.name} view ${index + 2}`}
                      fill
                      className="object-contain p-1.5 sm:p-2"
                      sizes="140px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={categoryHref}
                className="rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3 py-1.5 text-[10px] font-semibold capitalize text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)] sm:text-xs"
              >
                {categoryLabel}
              </Link>
              {med.overTheCounter && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-[var(--foreground)] sm:text-xs">
                  Over-the-counter
                </span>
              )}
              {med.prescriptionRequired && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-[var(--foreground)] sm:text-xs">
                  Prescription required
                </span>
              )}
            </div>

            <div className="mt-4 rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)] sm:text-xs">
                    Current price
                  </p>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
                    KES {formatPrice(Number(med.price))}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted)] sm:text-xs">
                    Inclusive of applicable taxes
                  </p>
                </div>
                <div
                  className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                    inStock
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-rose-500/30 bg-rose-500/10"
                  } text-[var(--foreground)]`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      inStock ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {inStock ? `${med.currentStock} in stock` : "Out of stock"}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">
                    Pharmacy
                  </span>
                  <p className="mt-1 line-clamp-1 text-sm font-bold text-[var(--foreground)]">
                    {pharmacy.name}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">
                    Supply
                  </span>
                  <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
                    {med.prescriptionRequired ? "Prescription" : "Direct purchase"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                Next step
              </p>
              <h2
                className="mt-1 text-lg font-semibold text-[var(--foreground)] sm:text-xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {med.prescriptionRequired ? "Request this medication safely" : "Reserve this medicine"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                {med.prescriptionRequired
                  ? "A valid prescription is required. Start a refill request, then the pharmacy can review the prescription before dispensing."
                  : "Reserve without creating an account, then pay by M-Pesa or at collection. Patient accounts can also use the portal checkout flow."}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {med.prescriptionRequired ? (
                  <Link
                    href={`/portal/refills/new?medicationId=${med.id}&pharmacy=${pharmacy.slug}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--brand)] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                  >
                    Request prescription refill
                  </Link>
                ) : (
                  <Link
                    href={`${base}/order?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--brand)] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                  >
                    Reserve or pay
                  </Link>
                )}
                <Link
                  href={`${base}/contact`}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] px-4 py-3 text-center text-sm font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--brand-soft)]"
                >
                  Ask pharmacist
                </Link>
              </div>

              {!med.prescriptionRequired && (
                <Link
                  href={`/portal/orders/new?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}&pharmacy=${pharmacy.slug}`}
                  className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand-deep)] hover:underline"
                >
                  Already have an account? Use patient portal checkout →
                </Link>
              )}
            </div>

            {med.overTheCounter && (
              <div className="mt-4 rounded-2xl border border-[var(--line-2)] bg-[var(--brand-soft)] p-4 text-xs leading-relaxed text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Self-care reminder:</strong>{" "}
                OTC medicines are intended for short-term symptom relief. If symptoms worsen or fail to improve within the expected timeframe, ask a pharmacist or clinician for advice.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 sm:mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
              Medicine information
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Key information before use
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
              Review the information below alongside the product label and pharmacist instructions.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {med.medicationMaster.dosage && (
              <article className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)] sm:text-xs">
                  Dosage & administration
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                  {med.medicationMaster.dosage}
                </p>
              </article>
            )}

            {med.medicationMaster.indications && (
              <article className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)] sm:text-xs">
                  Uses & indications
                </p>
                <div className="mt-2 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                  <Markdown>{med.medicationMaster.indications}</Markdown>
                </div>
              </article>
            )}

            {med.medicationMaster.sideEffects && (
              <article className="rounded-3xl border border-amber-500/30 bg-[var(--card)] p-4 shadow-sm sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600 sm:text-xs">
                  Side effects & precautions
                </p>
                <div className="mt-2 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                  <Markdown>{med.medicationMaster.sideEffects}</Markdown>
                </div>
              </article>
            )}

            {med.medicationMaster.contraindications && (
              <article className="rounded-3xl border border-rose-500/30 bg-[var(--card)] p-4 shadow-sm sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-600 sm:text-xs">
                  Contraindications
                </p>
                <div className="mt-2 text-xs leading-relaxed text-[var(--foreground)] sm:text-sm">
                  <Markdown>{med.medicationMaster.contraindications}</Markdown>
                </div>
              </article>
            )}

            {med.medicationMaster.storage && (
              <article className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5 md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)] sm:text-xs">
                  Storage instructions
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                  {med.medicationMaster.storage}
                </p>
              </article>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`${base}/medicines`}
              className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand-deep)] hover:underline"
            >
              ← Back to all medicines
            </Link>
            <Link
              href={`${base}/health/self-care-guide`}
              className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand-deep)] hover:underline"
            >
              Self-care vs doctor guide →
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--foreground)] sm:text-xs">
                Digital counselling
              </span>
              <h2
                className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Medication counselling & administration guide
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                Detailed guidance covering administration, common precautions and practical medicine-use information.
              </p>
            </div>
            <Link
              href={`${base}/health/counselling/${med.slug}`}
              className="inline-flex min-h-10 w-fit items-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
            >
              Full counselling guide
            </Link>
          </div>

          <DigitalCounsellingCard counselling={counsellingProfile} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-4 pb-10 sm:px-6 sm:pb-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
                Keep exploring
              </p>
              <h2
                className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {altIds.length > 0
                  ? "Equivalent or alternative medicines"
                  : `Related in ${categoryLabel}`}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`${base}/medicines/${item.slug}`}
                  className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--card-elev)]">
                    {item.medicationMaster.imageUrl ? (
                      <Image
                        src={item.medicationMaster.imageUrl}
                        alt={item.medicationMaster.name}
                        fill
                        className="object-contain p-2 transition duration-300 group-hover:scale-[1.02] sm:p-3"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl opacity-50">
                        💊
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 p-3 sm:p-4">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--foreground)] sm:text-sm">
                      {item.medicationMaster.name}
                    </p>
                    <p className="mt-1.5 text-xs font-bold text-[var(--brand)] sm:text-sm">
                      KES {formatPrice(Number(item.price))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBanner
        title={`Need help with ${med.medicationMaster.name}?`}
        description="Ask the pharmacy about suitability, interactions, prescription requirements, stock or how to use this medicine correctly."
      />
    </div>
  );
}
