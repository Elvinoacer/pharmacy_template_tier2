import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import ChoosePharmacy from "../../components/ChoosePharmacy";
import {
  MedicineCatalogGrid,
  type MedicineCatalogItem,
} from "../../components/MedicineCatalogCard";
import { prisma, prismaUnscoped } from "../../lib/db";
import { getPublicCategoryBySlug, type PublicCategory } from "../../lib/medication-categories";
import { getOtcCategoryGuidance } from "../../lib/otc-guidance";
import { getResolvedPharmacyOrNull } from "../../lib/services/pharmacy-settings";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Clock3,
  HelpCircle,
  PackageSearch,
  Pill,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

const CATEGORY_SLUG = "topical-treatments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Topical Treatments — Products, Safety & Pharmacist Guidance",
  description:
    "Browse topical treatments, compare live pharmacy stock, understand common ingredients, and review pharmacist-backed self-care guidance.",
  alternates: { canonical: `/medicines/${CATEGORY_SLUG}` },
};

export default async function TopicalTreatmentsPage() {
  const pharmacy = await getResolvedPharmacyOrNull().catch(() => null);
  const base = pharmacy ? `/p/${pharmacy.slug}` : "/medicines";
  const cat: PublicCategory = (await getPublicCategoryBySlug(CATEGORY_SLUG).catch(() => null)) || {
    id: "topical-treatments",
    slug: CATEGORY_SLUG,
    name: "Topical Treatments",
    description: "Skin creams, ointments, lotions and targeted therapies.",
    imageUrl: null,
    brands: [],
    tips: [],
    sortOrder: 0,
    publicMedCount: 0,
  };
  const otcGuidance = getOtcCategoryGuidance(CATEGORY_SLUG);

  const db = pharmacy ? prisma : prismaUnscoped;
  const products = await db.pharmacyInventory
    .findMany({
      where: {
        publicListing: true,
        active: true,
        medicationMaster: { category: CATEGORY_SLUG },
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
    .map((item) => {
      const master = item.medicationMaster;
      if (!master) return null;
      const price = Number(item.price.toString());
      return {
        id: item.id,
        slug: item.slug,
        price: Number.isFinite(price) ? price : 0,
        currentStock: item.currentStock,
        overTheCounter: item.overTheCounter,
        prescriptionRequired: item.prescriptionRequired,
        medicationMaster: {
          name: master.name,
          description: master.description,
          category: master.category,
          imageUrl: master.imageUrl,
        },
      } satisfies MedicineCatalogItem;
    })
    .filter((item): item is MedicineCatalogItem => item !== null);

  const inStockCount = catalogItems.filter((item) => item.currentStock > 0).length;

  return (
    <div className="min-w-0">
      <PageHero
        eyebrow="Medicines · Topical care"
        title="Topical treatments"
        description="Find creams, gels, ointments and other skin-applied treatments, compare live stock, then check the safety guidance before choosing what to use."
        crumbs={[
          { label: "Medicines", href: `${base}/medicines` },
          { label: "Topical treatments" },
        ]}
      />

      <section className="px-4 pb-8 sm:px-6 sm:pb-10">
        <div className="mx-auto max-w-6xl">
          <nav
            aria-label="Topical treatments sections"
            className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1 text-xs font-semibold"
          >
            <a
              href="#topical-products"
              className="shrink-0 rounded-full bg-[var(--brand)] px-3.5 py-2 text-white shadow-sm"
            >
              Browse products
            </a>
            <a
              href="#topical-overview"
              className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-2 text-[var(--brand-deep)]"
            >
              Category guide
            </a>
            {otcGuidance && (
              <a
                href="#topical-safety"
                className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-2 text-[var(--brand-deep)]"
              >
                Safety first
              </a>
            )}
          </nav>

          <div
            id="topical-overview"
            className="scroll-mt-32 overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm"
          >
            <div className="grid min-w-0 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="relative min-h-52 overflow-hidden bg-[var(--card-elev)] sm:min-h-64 lg:min-h-[360px]">
                {cat.imageUrl ? (
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 44vw"
                  />
                ) : (
                  <div className="flex h-full min-h-52 items-center justify-center text-6xl opacity-30 sm:min-h-64">
                    🧴
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md sm:bottom-4 sm:left-4 sm:text-xs">
                  Skin-applied medicines
                </span>
              </div>

              <div className="min-w-0 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--line-2)] bg-[var(--brand-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--brand-deep)] sm:text-xs">
                    Topical care
                  </span>
                  {otcGuidance && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-[var(--card-elev)] px-3 py-1 text-[10px] font-semibold text-[var(--muted)] sm:text-xs">
                      <Clock3 className="h-3.5 w-3.5 text-[var(--brand)]" />
                      Reassess after {otcGuidance.maxSelfCareDuration}
                    </span>
                  )}
                </div>

                <h2
                  className="mt-4 text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Start with the problem, not the product
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
                  {cat.description ||
                    "Topical medicines work directly on the skin or affected surface. Match the treatment to the condition, location and severity before applying it."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Listed</span>
                    <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{catalogItems.length}</p>
                    <p className="text-[10px] text-[var(--muted)]">products</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Available</span>
                    <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{inStockCount}</p>
                    <p className="text-[10px] text-[var(--muted)]">in stock</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Pharmacy</span>
                    <p className="mt-1 line-clamp-1 text-sm font-bold text-[var(--foreground)]">{pharmacy?.name || "Across network"}</p>
                    <p className="text-[10px] text-[var(--muted)]">live catalogue</p>
                  </div>
                </div>

                {otcGuidance && otcGuidance.commonActiveIngredients.length > 0 && (
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
                )}

                {cat.brands.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)] sm:text-xs">
                      Common brands
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cat.brands.map((brand: string) => (
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
                    href={`${base}/how-do-you-feel?category=${CATEGORY_SLUG}`}
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

      <section id="topical-products" className="scroll-mt-32 px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
                Live stock · {pharmacy?.name || "Across network"}
              </p>
              <h2
                className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Topical treatments available now
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                Compare the products this pharmacy currently lists. Prescription requirements and stock status remain visible on every card.
              </p>
            </div>
            <Link
              href={`${base}/medicines?category=${CATEGORY_SLUG}`}
              className="inline-flex min-h-10 w-fit items-center gap-1 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
            >
              Full catalogue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {catalogItems.length > 0 ? (
            <MedicineCatalogGrid items={catalogItems} />
          ) : (
            <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 text-center shadow-sm backdrop-blur-xl sm:p-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--brand)]">
                <PackageSearch className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-[var(--foreground)]">No topical products are listed right now</h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">
                Browse the wider medicines catalogue or ask the pharmacy for help finding a suitable topical option.
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
        <section id="topical-safety" className="scroll-mt-32 px-4 pb-10 sm:px-6 sm:pb-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 sm:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
                Safety before self-treatment
              </p>
              <h2
                className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Know when topical self-care is reasonable
              </h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                Use this as a safety screen, not a diagnosis. If the affected area is severe, rapidly worsening, infected-looking or otherwise concerning, seek clinical advice.
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
                    <h3 className="mt-0.5 text-base font-bold text-[var(--foreground)]">Mild, familiar problems</h3>
                  </div>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {otcGuidance.selfCareAppropriate.map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
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
                    <h3 className="mt-0.5 text-base font-bold text-[var(--foreground)]">Red flags and warning signs</h3>
                  </div>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {otcGuidance.medicalAttentionCriteria.map((item, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs font-medium leading-relaxed text-[var(--foreground)] sm:text-sm">
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
                  Pharmacist tips for topical treatments
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {otcGuidance.pharmacistTips.map((tip, index) => (
                    <div
                      key={index}
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
        title="Not sure which topical treatment fits the problem?"
        description="Ask a pharmacist before choosing. They can help confirm suitability, check interactions and advise when the skin problem needs clinical assessment instead of self-treatment."
      />
    </div>
  );
}
