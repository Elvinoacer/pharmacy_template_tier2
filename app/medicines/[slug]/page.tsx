import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { Markdown } from "../../components/Markdown";
import {
  MedicineCatalogGrid,
  type MedicineCatalogItem,
} from "../../components/MedicineCatalogCard";
import { prisma } from "../../lib/db";
import ChoosePharmacy from "../../components/ChoosePharmacy";
import { getResolvedPharmacyOrNull } from "../../lib/services/pharmacy-settings";
import { formatPrice } from "../../lib/format";
import { getPublicCategoryBySlug } from "../../lib/medication-categories";
import { getOtcCategoryGuidance } from "../../lib/otc-guidance";
import { generateDynamicCounsellingProfile } from "../../lib/medication-counselling";
import { getMedicationCounsellingBySlug } from "../../lib/services/medication-counselling-db";
import DigitalCounsellingCard from "../../components/health/DigitalCounsellingCard";
import { CheckCircle2, AlertOctagon, ShieldAlert, Sparkles, Clock, ArrowRight, HelpCircle, BookOpen } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getPublicCategoryBySlug(slug).catch(() => null);
  if (cat) {
    return {
      title: `${cat.name} — OTC Healthcare & Guidance`,
      description:
        cat.description || `${cat.name} non-prescription products, self-care guidelines, and pharmacist advice`,
      alternates: { canonical: `/medicines/${cat.slug}` },
    };
  }
  const med = await prisma.pharmacyInventory
    .findFirst({
      where: { slug },
      include: {
        medicationMaster: { select: { name: true, description: true, dosage: true } },
      },
    })
    .catch(() => null);
  if (med) {
    return {
      title: med.medicationMaster.name,
      description:
        med.medicationMaster.description ||
        `${med.medicationMaster.name} — available from your selected pharmacy`,
      alternates: { canonical: `/medicines/${med.slug}` },
    };
  }
  return { title: "Category" };
}

export default async function CategoryOrMedicinePage({ params }: Props) {
  const { slug } = await params;
  // Deep links without a pharmacy in context get a chooser, not a 404.
  const pharmacy = await getResolvedPharmacyOrNull().catch(() => null);
  if (!pharmacy) {
    return <ChoosePharmacy next={`/medicines/${slug}`} />;
  }
  const base = `/p/${pharmacy.slug}`;
  const cat = await getPublicCategoryBySlug(slug).catch(() => null);
  const otcGuidance = cat ? getOtcCategoryGuidance(cat.slug) : null;

  // ── Category page ──────────────────────────────────────────
  if (cat) {
    const products = await prisma.pharmacyInventory
      .findMany({
        where: {
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

    return (
      <div>
        <PageHero
          eyebrow="OTC Health Category & Guidance"
          title={cat.name}
          description={
            cat.description ||
            "Browse stocked non-prescription products and expert pharmacist guidance for self-care."
          }
          crumbs={[
            { label: "Medicines", href: "/medicines" },
            { label: cat.name },
          ]}
        />

        {/* Category Hero & Overview */}
        <section className="px-4 pb-12 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#eef5f1] shadow-xl">
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-7xl opacity-30">
                  💊
                </div>
              )}
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    Over The Counter (OTC)
                  </span>
                  {otcGuidance && (
                    <span className="flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 border border-teal-200">
                      <Clock className="h-3 w-3" />
                      {otcGuidance.maxSelfCareDuration}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-base leading-relaxed text-[#2c3e35]">
                  {cat.description ||
                    "Our pharmacy stocks quality non-prescription remedies and provides professional clinical advice on safe home management."}
                </p>

                {cat.brands.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
                      Featured Brands We Stock
                    </h3>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {cat.brands.map((b) => (
                        <span
                          key={b}
                          className="rounded-full border border-teal-900/10 bg-white px-3 py-1 text-xs font-semibold text-[#0c1a14] shadow-xs"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {otcGuidance && otcGuidance.commonActiveIngredients.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
                      Common Active Ingredients
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {otcGuidance.commonActiveIngredients.map((ing) => (
                        <span
                          key={ing}
                          className="rounded-lg bg-[#f0faf6] px-2.5 py-1 text-xs font-medium text-[#084c3f] border border-[#0d6e5a]/15"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3 border-t border-[#e3ebe6] pt-6">
                <Link
                  href={`${base}/health/self-care-guide`}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-900 transition"
                >
                  <HelpCircle className="h-3.5 w-3.5" /> Open Self-Care vs Doctor Guide
                </Link>
                <Link
                  href={`${base}/how-do-you-feel?category=${encodeURIComponent(cat.slug)}`}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-purple-300 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-700" /> AI Symptom Check
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Clinical Triage Protocol: Self-Care vs Medical Attention */}
        {otcGuidance && (
          <section className="px-4 pb-12 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6">
                <h2
                  className="text-2xl font-bold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  When is Self-Care Appropriate for {cat.name}?
                </h2>
                <p className="mt-1 text-sm text-[#5a6b62]">
                  Clinical safety criteria to help you determine if home OTC treatment is suitable or if you need to seek in-person medical attention.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* 🟢 Appropriate for Self-Care */}
                <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-sm">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                        Appropriate For Self-Care
                      </span>
                      <h3 className="font-bold text-emerald-950">
                        Safe for Home OTC Management
                      </h3>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5">
                    {otcGuidance.selfCareAppropriate.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#2c3e35]">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/90 p-3 text-xs text-emerald-900">
                    <strong>Expected Timeframe:</strong> Maximum of {otcGuidance.maxSelfCareDuration} before clinical re-assessment.
                  </div>
                </div>

                {/* 🔴 When to Seek Medical Attention / Red Flags */}
                <div className="rounded-3xl border-2 border-rose-300 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-rose-600 p-2 text-white shadow-sm">
                      <AlertOctagon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                        When to Seek Medical Attention
                      </span>
                      <h3 className="font-bold text-rose-950">
                        Red Flags & Warning Criteria
                      </h3>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5">
                    {otcGuidance.medicalAttentionCriteria.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-rose-950 font-medium">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {otcGuidance.emergencyWarning && (
                    <div className="mt-5 rounded-2xl border border-rose-300 bg-rose-100/60 p-3 text-xs font-semibold text-rose-950">
                      🚨 {otcGuidance.emergencyWarning}
                    </div>
                  )}
                </div>
              </div>

              {/* Pharmacist Tips */}
              {otcGuidance.pharmacistTips.length > 0 && (
                <div className="mt-6 rounded-3xl border border-[#d2dfd8] bg-white p-6 shadow-sm">
                  <h3
                    className="text-lg font-bold text-[#0c1a14]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Pharmacist Clinical Advice for {cat.name}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {otcGuidance.pharmacistTips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 rounded-2xl bg-[#f8faf9] p-3 text-xs text-[#2c3e35]">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-700" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Live Stock Catalog */}
        {catalogItems.length > 0 && (
          <section className="px-4 pb-16 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2
                    className="text-2xl font-bold text-[#0c1a14]"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Stocked {cat.name} Products ({catalogItems.length})
                  </h2>
                  <p className="text-xs text-[#5a6b62]">
                    Available for immediate counter pickup, reserve online with no account, or delivery.
                  </p>
                </div>
                <Link
                  href={`/medicines?category=${encodeURIComponent(cat.slug)}`}
                  className="text-xs font-bold text-teal-800 hover:underline"
                >
                  View full catalogue →
                </Link>
              </div>

              <MedicineCatalogGrid items={catalogItems} />
            </div>
          </section>
        )}

        <CtaBanner
          title={`Have questions about ${cat.name}?`}
          description="Our pharmacists are always available in-store or online to confirm product suitability, screen for interactions, and ensure your self-care is safe."
        />
      </div>
    );
  }

  // ── Medication detail ──────────────────────────────────────
  const med = await prisma.pharmacyInventory
    .findFirst({
      where: { slug },
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
    .map((s) => s.trim())
    .filter(Boolean);
  const alternatives =
    altIds.length > 0
      ? await prisma.pharmacyInventory
          .findMany({
            where: { medicationMasterId: { in: altIds }, active: true },
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

  const categoryHref = `/medicines/${med.medicationMaster.category}`;
  const categoryLabel = med.medicationMaster.category.replace(/-/g, " ");

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
    <div>
      <PageHero
        eyebrow={categoryLabel}
        title={med.medicationMaster.name}
        description={
          med.medicationMaster.description ||
          med.medicationMaster.dosage ||
          `Available at ${pharmacy.name}`
        }
        crumbs={[
          { label: "Medicines", href: "/medicines" },
          { label: categoryLabel, href: categoryHref },
          { label: med.medicationMaster.name },
        ]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          {(() => {
            const gallery = (med.medicationMaster.imageUrls || "")
              .split(/[\n,]+/)
              .map((s) => s.trim())
              .filter(Boolean)
              .filter((u) => u !== med.medicationMaster.imageUrl);
            return (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-[#f4f7f4] shadow-xl">
                  {med.medicationMaster.imageUrl ? (
                    <Image
                      src={med.medicationMaster.imageUrl}
                      alt={med.medicationMaster.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-7xl">
                      💊
                    </div>
                  )}
                </div>
                {gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.slice(0, 8).map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="relative aspect-square overflow-hidden rounded-xl bg-[#f4f7f4] shadow-sm"
                      >
                        <Image
                          src={src}
                          alt={`${med.medicationMaster.name} gallery ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={categoryHref}
                className="rounded-full border border-teal-900/15 bg-white px-3.5 py-1 text-xs font-semibold capitalize text-teal-800 hover:bg-teal-50 shadow-xs"
              >
                {categoryLabel}
              </Link>
              {med.overTheCounter && (
                <span className="rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                  Over-the-Counter (OTC)
                </span>
              )}
              {med.prescriptionRequired && (
                <span className="rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-900">
                  Prescription Required
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold ${
                  med.currentStock > 0
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${med.currentStock > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                {med.currentStock > 0
                  ? `${med.currentStock} units in stock`
                  : "Currently Out of Stock"}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0c1a14]">
                KES {formatPrice(Number(med.price))}
              </span>
              <span className="text-xs text-[#5a6b62]">Inclusive of all taxes</span>
            </div>

            {/* Quick Action Box */}
            <div className="mt-6 rounded-3xl border border-[#0d6e5a]/20 bg-gradient-to-br from-[#f0faf6] via-white to-[#f0faf6]/50 p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Ready to Order / Reserve
              </p>
              <p className="mt-1 text-xs text-[#5a6b62]">
                {med.prescriptionRequired
                  ? "This medication requires a valid prescription. Request a refill via your portal or upload Rx."
                  : "Reserve online with no account (pay M-Pesa or at collection), or sign in for loyalty points & dose reminders."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {med.prescriptionRequired ? (
                  <Link
                    href="/portal/refills/new"
                    className="btn-primary btn-primary-sm"
                  >
                    Request Prescription Refill →
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`${base}/order?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}`}
                      className="btn-primary btn-primary-sm"
                    >
                      Reserve / Pay — No Account Required →
                    </Link>
                    <Link
                      href={`/portal/orders/new?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}&pharmacy=${pharmacy.slug}`}
                      className="btn-ghost btn-ghost-sm bg-white"
                    >
                      Portal Checkout
                    </Link>
                  </>
                )}
                <Link href={`${base}/contact`} className="btn-ghost btn-ghost-sm bg-white">
                  Ask Pharmacist
                </Link>
              </div>
            </div>

            {/* Structured Clinical Information */}
            <div className="mt-6 space-y-4">
              {med.medicationMaster.dosage && (
                <div className="rounded-2xl border border-[#e3ebe6] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    💊 Dosage & Administration
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#2c3e35]">
                    {med.medicationMaster.dosage}
                  </p>
                </div>
              )}

              {med.medicationMaster.indications && (
                <div className="rounded-2xl border border-[#e3ebe6] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    🎯 Uses & Indications
                  </p>
                  <div className="mt-1.5 text-xs leading-relaxed text-[#2c3e35]">
                    <Markdown>{med.medicationMaster.indications}</Markdown>
                  </div>
                </div>
              )}

              {med.medicationMaster.sideEffects && (
                <div className="rounded-2xl border border-[#e3ebe6] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    ⚠️ Side Effects & Precautions
                  </p>
                  <div className="mt-1.5 text-xs leading-relaxed text-[#2c3e35]">
                    <Markdown>{med.medicationMaster.sideEffects}</Markdown>
                  </div>
                </div>
              )}

              {med.medicationMaster.contraindications && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-950 flex items-center gap-1.5">
                    🛑 Not For You If (Contraindications)
                  </p>
                  <div className="mt-1.5 text-xs leading-relaxed text-rose-900">
                    <Markdown>{med.medicationMaster.contraindications}</Markdown>
                  </div>
                </div>
              )}

              {med.medicationMaster.storage && (
                <div className="rounded-2xl border border-[#e3ebe6] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5a6b62] flex items-center gap-1.5">
                    🌡️ Storage Instructions
                  </p>
                  <p className="mt-1.5 text-xs text-[#5a6b62]">
                    {med.medicationMaster.storage}
                  </p>
                </div>
              )}
            </div>

            {/* Self-Care Safety Reminder */}
            {med.overTheCounter && (
              <div className="mt-6 rounded-2xl border border-teal-200/80 bg-[#f4f9f6] p-4 text-xs text-[#2c3e35]">
                <strong className="text-teal-950"><span aria-hidden>💡 </span>Pharmacist Self-Care Tip: </strong>
                Over-the-counter medicines are intended for short-term symptom relief. If symptoms do not improve within 3–7 days or worsen, pause self-care and consult our pharmacist or your doctor.
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Link
                href={`${base}/medicines`}
                className="text-xs font-bold text-teal-800 hover:underline"
              >
                ← Back to all medicines
              </Link>
              <Link
                href={`${base}/health/self-care-guide`}
                className="text-xs font-bold text-teal-800 hover:underline"
              >
                Self-Care vs Doctor Guide →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 12-Pillar Digital Patient Counselling & Safety Guide */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900 border border-emerald-200">
                Digital Clinical Standard
              </span>
              <h2
                className="mt-2 text-2xl font-bold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Medication Counselling &amp; Administration Guide
              </h2>
              <p className="mt-1 text-xs text-[#5a6b62]">
                Comprehensive 12-pillar clinical guidance prepared by licensed pharmacists.
              </p>
            </div>
            <Link
              href={`${base}/health/counselling/${med.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline"
            >
              Open Full Counselling Hub Guide →
            </Link>
          </div>

          <DigitalCounsellingCard counselling={counsellingProfile} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2
              className="mb-4 text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {altIds.length > 0
                ? "Equivalent / alternative medications"
                : `Related in ${categoryLabel}`}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/medicines/${r.slug}`}
                  className="card-lift group overflow-hidden rounded-2xl border border-[#e3ebe6] bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-24 overflow-hidden bg-[#f4f7f4]">
                    {r.medicationMaster.imageUrl ? (
                      <Image
                        src={r.medicationMaster.imageUrl}
                        alt={r.medicationMaster.name}
                        fill
                        className="object-cover"
                        sizes="25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        💊
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-[#0c1a14]">
                      {r.medicationMaster.name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#0d6e5a]">
                      KES {formatPrice(Number(r.price))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBanner />
    </div>
  );
}
