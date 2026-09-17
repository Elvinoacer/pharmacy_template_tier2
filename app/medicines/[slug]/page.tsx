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
  ShieldCheck,
  Sparkles,
  Pill,
  Thermometer,
  FileText,
  Phone,
  MessageCircle,
  Truck,
} from "lucide-react";
import CtaBanner from "../../components/CtaBanner";
import DigitalCounsellingCard from "../../components/health/DigitalCounsellingCard";
import { Markdown } from "../../components/Markdown";
import {
  MedicineCatalogGrid,
  type MedicineCatalogItem,
} from "../../components/MedicineCatalogCard";
import PageHero from "../../components/PageHero";
import NetworkMedicineView from "../NetworkMedicineView";
import { prisma } from "../../lib/db";
import { formatPrice } from "../../lib/format";
import { sellableFromInventory } from "../../lib/inventory-availability";
import { generateDynamicCounsellingProfile } from "../../lib/medication-counselling";
import { getPublicCategoryBySlug } from "../../lib/medication-categories";
import { getOtcCategoryGuidance } from "../../lib/otc-guidance";
import { getMedicationCounsellingBySlug } from "../../lib/services/medication-counselling-db";
import { getResolvedPharmacyOrNull } from "../../lib/services/pharmacy-settings";
import {
  listNetworkListingsForSlug,
  listNetworkMedicineListings,
} from "../../lib/services/network-catalog";
import {
  buildPublicInventoryWhere,
  getPublicMedicineRelated,
} from "../../lib/services/public-medication-visibility";

type Props = { params: Promise<{ slug: string; pharmacySlug?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pharmacySlug: propPharmacySlug } = await params;

  const pharmacy = propPharmacySlug
    ? await getResolvedPharmacyOrNull({ slug: propPharmacySlug }).catch(() => null)
    : null;

  if (pharmacy) {
    const med = await prisma.pharmacyInventory
      .findFirst({
        where: buildPublicInventoryWhere({
          slug,
          pharmacyId: pharmacy.id,
          pharmacySlug: pharmacy.slug,
        }),
        include: {
          pharmacy: { select: { name: true, city: true, county: true, latitude: true, longitude: true, slug: true } },
          medicationMaster: {
            select: { name: true, genericName: true, brandName: true, description: true, dosage: true, imageUrl: true },
          },
        },
      })
      .catch(() => null);

    if (med) {
      const locationStr = [med.pharmacy?.city, med.pharmacy?.county, "Kenya"].filter(Boolean).join(", ");
      const coordinates =
        med.pharmacy?.latitude != null && med.pharmacy?.longitude != null
          ? `${med.pharmacy.latitude};${med.pharmacy.longitude}`
          : undefined;

      const title = `${med.medicationMaster.name} — Price, Stock & Delivery in ${med.pharmacy?.city || "Kenya"} | ${med.pharmacy?.name}`;

      return {
        title,
        description:
          med.medicationMaster.description ||
          `Buy ${med.medicationMaster.name} (${med.medicationMaster.genericName}) online in ${locationStr} at ${med.pharmacy?.name || "Aether"}. Check real-time stock, pricing, and fast delivery or pickup.`,
        alternates: { canonical: `/p/${pharmacy.slug}/medicines/${med.slug}` },
        openGraph: {
          title: `${med.medicationMaster.name} — ${med.pharmacy?.name || "Aether"}`,
          description: med.medicationMaster.description || `In stock at ${med.pharmacy?.name || "verified pharmacies"} in ${locationStr}.`,
          images: med.medicationMaster.imageUrl ? [med.medicationMaster.imageUrl] : undefined,
        },
        other: coordinates
          ? {
              "geo.position": coordinates,
              "geo.region": "KE",
              "geo.placename": med.pharmacy?.city || "Kenya",
              "ICBM": `${med.pharmacy?.latitude}, ${med.pharmacy?.longitude}`,
            }
          : undefined,
      };
    }
  } else {
    const listings = await listNetworkListingsForSlug(slug).catch(() => []);
    const first = listings[0];
    if (first) {
      return {
        title: `${first.medicationMaster.name} — Price, Availability & Guidance | Aether`,
        description:
          first.medicationMaster.description ||
          `Compare ${first.medicationMaster.name} availability across verified Aether pharmacies.`,
        alternates: { canonical: `/medicines/${slug}` },
        openGraph: {
          title: `${first.medicationMaster.name} — Aether`,
          description: first.medicationMaster.description || "Compare live pharmacy availability.",
          images: first.medicationMaster.imageUrl ? [first.medicationMaster.imageUrl] : undefined,
        },
      };
    }
  }

  // Fallback to Category if no medicine listing matched
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

  return { title: "Medicine Not Found", robots: { index: false, follow: false } };
}

export default async function CategoryOrMedicinePage({ params }: Props) {
  const { slug, pharmacySlug: propPharmacySlug } = await params;
  const pharmacy = propPharmacySlug
    ? await getResolvedPharmacyOrNull({ slug: propPharmacySlug }).catch(() => null)
    : null;
  if (propPharmacySlug && !pharmacy) notFound();
  const pharmacyId = pharmacy?.id;
  const pharmacySlug = pharmacy?.slug;
  const base = pharmacySlug ? `/p/${pharmacySlug}` : "";

  // 1. Check for network-level medicine listing if no pharmacy is selected
  if (!pharmacy || !pharmacyId || !pharmacySlug) {
    const networkListings = await listNetworkListingsForSlug(slug).catch(() => []);
    if (networkListings.length > 0) {
      return <NetworkMedicineView slug={slug} />;
    }
  }

  // 2. Check for pharmacy inventory medicine listing
  const med = pharmacyId
    ? await prisma.pharmacyInventory
        .findFirst({
          where: buildPublicInventoryWhere({ pharmacyId, slug }),
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
            reservations: { where: { status: "active" }, select: { quantity: true } },
          },
        })
        .catch(() => null)
    : null;

  // 3. If no medicine matched, check if this slug is a Category
  if (!med) {
    const cat = await getPublicCategoryBySlug(slug).catch(() => null);
    if (!cat) notFound();

    const otcGuidance = getOtcCategoryGuidance(cat.slug);
    const network = pharmacy
      ? null
      : await listNetworkMedicineListings({ category: cat.slug, take: 24 }).catch(() => null);
    const rows = pharmacy
      ? await prisma.pharmacyInventory
          .findMany({
            where: buildPublicInventoryWhere({
              pharmacyId,
              category: cat.slug,
            }),
            include: {
              medicationMaster: {
                select: {
                  name: true,
                  description: true,
                  category: true,
                  imageUrl: true,
                },
              },
              reservations: { where: { status: "active" }, select: { quantity: true } },
            },
            orderBy: [{ currentStock: "desc" }],
            take: 24,
          })
          .catch(() => [])
      : [];

    const items: MedicineCatalogItem[] = pharmacy
      ? rows.flatMap((row) => {
          const master = row.medicationMaster;
          if (!master) return [];
          const price = Number(row.price.toString());
          const availableStock = sellableFromInventory(row);
          return [{
            id: row.id,
            slug: row.slug,
            href: `/p/${pharmacy.slug}/medicines/${row.slug}`,
            price: Number.isFinite(price) ? price : 0,
            currentStock: row.currentStock,
            availableStock,
            overTheCounter: row.overTheCounter,
            prescriptionRequired: row.prescriptionRequired,
            medicationMaster: {
              name: master.name,
              description: master.description,
              category: master.category,
              imageUrl: master.imageUrl,
            },
          } satisfies MedicineCatalogItem];
        })
      : (network?.items ?? []);

    const available = items.filter((item) => (item.availableStock ?? item.currentStock) > 0).length;

    return (
      <div className="min-w-0">
        <PageHero
          eyebrow="Medicines · Category guide"
          title={cat.name}
          description={
            cat.description ||
            "Browse current verified stock, then review concise self-care and safety guidance before choosing your treatment."
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
              className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1 text-xs font-semibold print:hidden"
            >
              <a href="#products" className="shrink-0 rounded-full bg-[var(--brand)] px-4 py-2 text-white shadow-sm transition hover:brightness-105">
                Browse products ({items.length})
              </a>
              <a href="#overview" className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 py-2 text-[var(--foreground)] transition hover:bg-[var(--card-elev)]">
                Category guidance
              </a>
              {otcGuidance && (
                <a href="#safety" className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 py-2 text-[var(--foreground)] transition hover:bg-[var(--card-elev)]">
                  Safety first
                </a>
              )}
            </nav>

            <div id="overview" className="scroll-mt-32 overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/90 backdrop-blur-xl shadow-[var(--glass-shadow)] transition-all">
              <div className="grid min-w-0 lg:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)]">
                <div className="relative min-h-52 overflow-hidden bg-[var(--card-elev)] sm:min-h-64 lg:min-h-[360px]">
                  {cat.imageUrl ? (
                    <Image src={cat.imageUrl} alt={cat.name} fill priority className="object-cover" sizes="(max-width:1024px) 100vw,44vw" />
                  ) : (
                    <div className="flex h-full min-h-52 items-center justify-center text-6xl opacity-40">💊</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-black/50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-white backdrop-blur-md sm:bottom-4 sm:left-4 sm:text-xs">
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

                  <h2 className="mt-4 text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                    Compare genuine products with clear pharmacist guidance
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
                    {cat.description || (pharmacy ? "Review available medicines from this pharmacy and check safety guidance before starting home treatment." : "Review available medicines across verified Aether pharmacies and check safety guidance before starting home treatment.")}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      ["Listed", String(items.length), "products"],
                      ["Available", String(available), "in stock now"],
                      ["Pharmacy", pharmacy?.name ?? "Aether network", pharmacy ? "live catalogue" : "verified pharmacies"],
                    ].map(([label, value, note], index) => (
                      <div key={label} className={`rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)]/80 backdrop-blur-md p-3 ${index === 2 ? "col-span-2 sm:col-span-1" : ""}`}>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">{label}</span>
                        <p className="mt-1 line-clamp-1 text-sm font-bold text-[var(--foreground)] sm:text-base">{value}</p>
                        <p className="text-[10px] text-[var(--muted)]">{note}</p>
                      </div>
                    ))}
                  </div>

                  {otcGuidance?.commonActiveIngredients?.length ? (
                    <div className="mt-6">
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted-2)] sm:text-xs">Common active ingredients</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {otcGuidance.commonActiveIngredients.map((ingredient) => (
                          <span key={ingredient} className="rounded-full border border-[var(--line-2)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)] sm:text-xs">
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {cat.brands.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted-2)] sm:text-xs">Common brands</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cat.brands.map((brand) => (
                          <span key={brand} className="rounded-full border border-[var(--line-2)] bg-[var(--card-elev)] px-2.5 py-1 text-[10px] font-semibold text-[var(--foreground)] sm:text-xs">
                            {brand}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products Anchor Section with ID fixed */}
            <div id="products" className="scroll-mt-32 mt-8 sm:mt-12">
              <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand)] sm:text-xs">Current verified inventory</p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                    {pharmacy ? `${cat.name} available at ${pharmacy.name}` : `${cat.name} across Aether`}
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                    {pharmacy ? "Live stock and direct pricing verified by the pharmacy." : "Live stock and pricing reported by verified pharmacies. Confirm when you reserve."}
                  </p>
                </div>
                <Link href={`${base || ""}/medicines?category=${encodeURIComponent(cat.slug)}`} className="inline-flex min-h-10 w-fit items-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition">
                  Full catalogue filter →
                </Link>
              </div>

              {items.length > 0 ? (
                <MedicineCatalogGrid items={items} />
              ) : (
                <div className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/90 backdrop-blur-xl p-6 text-center shadow-sm sm:p-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--card-elev)] text-[var(--brand)]"><PackageSearch className="h-5 w-5" /></div>
                  <h3 className="mt-3 text-sm font-bold text-[var(--foreground)]">No products currently listed in this category</h3>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">Browse the wider catalogue or contact our pharmacist to check warehouse availability.</p>
                  <Link href={`${base}/medicines`} className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[var(--brand)] px-4 text-xs font-semibold text-white">Browse all medicines</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {otcGuidance && (
          <section id="safety" className="scroll-mt-32 px-4 pb-10 sm:px-6 sm:pb-14">
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 sm:mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand)] sm:text-xs">Safety before self-treatment</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>Know when self-care is appropriate</h2>
                <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">Use this safety guide as a helpful reference, not a diagnosis. Always consult a licensed clinician for severe, rapidly worsening, or concerning symptoms.</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                <article className="rounded-3xl border border-emerald-500/30 bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300 sm:text-xs">Safe for home care</p>
                      <h3 className="mt-0.5 text-base font-bold text-[var(--foreground)]">Mild, familiar symptoms</h3>
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
                  <div className="mt-4 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3 text-xs text-[var(--muted)]">
                    <strong className="text-[var(--foreground)]">When to check in:</strong> If symptoms do not improve within {otcGuidance.maxSelfCareDuration}, seek clinical evaluation.
                  </div>
                </article>

                <article className="rounded-3xl border border-rose-500/30 bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white"><AlertOctagon className="h-5 w-5" /></span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-rose-700 dark:text-rose-300 sm:text-xs">Seek medical care</p>
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
                    <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold leading-relaxed text-rose-900 dark:text-rose-200">
                      {otcGuidance.emergencyWarning}
                    </div>
                  )}
                </article>
              </div>

              {otcGuidance.pharmacistTips.length > 0 && (
                <div className="mt-4 rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-sm sm:p-6">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>Pharmacist tips for {cat.name}</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {otcGuidance.pharmacistTips.map((tip, index) => (
                      <div key={index} className="flex items-start gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] p-3 text-xs leading-relaxed text-[var(--muted)]">
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

        <CtaBanner title={`Need help finding the right ${cat.name.toLowerCase()} treatment?`} description="Our pharmacists are on call to verify suitability, drug interactions, and whether your symptoms require a doctor's examination." />
      </div>
    );
  }

  // ── INDIVIDUAL MEDICINE PRODUCT DETAIL ──

  if (!pharmacy || !pharmacyId) notFound();

  const altIds = (med.medicationMaster.alternativeIds || "").split(/[,\s]+/).map((value) => value.trim()).filter(Boolean);
  const related = await getPublicMedicineRelated({
    pharmacyId,
    category: med.medicationMaster.category,
    currentInventoryId: med.id,
    alternativeMasterIds: altIds,
    take: 4,
  }).catch(() => []);

  const categoryLabel = med.medicationMaster.category.replace(/-/g, " ");
  const categoryHref = `${base}/medicines?category=${encodeURIComponent(med.medicationMaster.category)}`;
  const availableStock = sellableFromInventory(med);
  const inStock = availableStock > 0;
  const gallery = (med.medicationMaster.imageUrls || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean).filter((url) => url !== med.medicationMaster.imageUrl).slice(0, 8);
  const counselling = (await getMedicationCounsellingBySlug(med.slug)) || generateDynamicCounsellingProfile(
    med.medicationMaster.name,
    med.medicationMaster.genericName,
    med.medicationMaster.category,
    med.medicationMaster.dosageForm?.value || null,
    med.medicationMaster.dosage,
    med.medicationMaster.storage,
    med.medicationMaster.sideEffects
  );

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Product", "MedicalWebPage"],
    name: med.medicationMaster.name,
    description: med.medicationMaster.description || `${med.medicationMaster.name} available at ${pharmacy.name}`,
    image: med.medicationMaster.imageUrl || undefined,
    category: categoryLabel,
    offers: {
      "@type": "Offer",
      price: Number(med.price),
      priceCurrency: "KES",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Pharmacy",
        name: pharmacy.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: pharmacy.address.city || undefined,
          addressCountry: "KE",
        },
      },
    },
  };

  return (
    <div className="min-w-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <PageHero
        eyebrow={categoryLabel}
        title={med.medicationMaster.name}
        description={med.medicationMaster.description || med.medicationMaster.dosage || `Dispensed and verified by ${pharmacy.name}`}
        crumbs={[
          { label: "Medicines", href: `${base}/medicines` },
          { label: categoryLabel, href: categoryHref },
          { label: med.medicationMaster.name },
        ]}
      />

      {/* Main Product Showcase Section with Glassmorphic Panels */}
      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          {/* Left Column: Product Imagery + Authenticity Badges */}
          <div className="min-w-0 space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/80 backdrop-blur-xl shadow-[var(--glass-shadow)] sm:rounded-[2rem]">
              {/* Top Floating Badges */}
              <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 sm:left-4 sm:top-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Verified Stock
                </span>
              </div>

              <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md ${inStock ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-300" : "border-rose-500/40 bg-rose-950/70 text-rose-300"}`}>
                  <span className={`h-2 w-2 rounded-full ${inStock ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                  {inStock ? `${availableStock} available` : "Out of stock"}
                </div>
              </div>

              {med.medicationMaster.imageUrl ? (
                <Image src={med.medicationMaster.imageUrl} alt={med.medicationMaster.name} fill priority className="object-contain p-6 sm:p-8" sizes="(max-width:1024px) 100vw,45vw" />
              ) : (
                <Image src="/images/care/medicine-still-life.png" alt="Illustrative medicine supplies; product photo not provided" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              )}
            </div>

            {gallery.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {gallery.map((src, index) => (
                  <div key={`${src}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--card)]/80 backdrop-blur-md transition hover:border-[var(--brand)]">
                    <Image src={src} alt={`${med.medicationMaster.name} view ${index + 2}`} fill className="object-contain p-2" sizes="140px" />
                  </div>
                ))}
              </div>
            )}

            {/* Quality & Trust Highlights */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)]/80 backdrop-blur-md p-3 text-center text-xs">
              <div className="p-1">
                <ShieldCheck className="mx-auto h-4 w-4 text-[var(--brand)]" />
                <p className="mt-1 font-bold text-[var(--foreground)] text-[11px]">100% Genuine</p>
                <p className="text-[10px] text-[var(--muted)]">Certified supplier</p>
              </div>
              <div className="border-x border-[var(--line-2)] p-1">
                <Clock3 className="mx-auto h-4 w-4 text-[var(--brand)]" />
                <p className="mt-1 font-bold text-[var(--foreground)] text-[11px]">15-Min Ready</p>
                <p className="text-[10px] text-[var(--muted)]">Express dispensing</p>
              </div>
              <div className="p-1">
                <Truck className="mx-auto h-4 w-4 text-[var(--brand)]" />
                <p className="mt-1 font-bold text-[var(--foreground)] text-[11px]">Fast Delivery</p>
                <p className="text-[10px] text-[var(--muted)]">Discreet & sealed</p>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing, Ordering & Clear Actions */}
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={categoryHref} className="rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-1.5 text-xs font-semibold capitalize text-[var(--foreground)] hover:bg-[var(--card-elev)] transition">
                {categoryLabel}
              </Link>
              {med.overTheCounter && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  No Prescription Needed (Over-The-Counter)
                </span>
              )}
              {med.prescriptionRequired && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  Prescription Required
                </span>
              )}
            </div>

            {/* Price Card */}
            <div className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-[var(--glass-shadow)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--muted-2)]">Pharmacy price</span>
                  <p className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl">
                    KES {formatPrice(Number(med.price))}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--line-2)] bg-[var(--card-elev)] px-3 py-1 text-[11px] font-semibold text-[var(--muted)]">
                  All taxes & dispensing fees included
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line-2)] pt-4 text-xs">
                <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Dispensing pharmacy</span>
                  <Link href={`${base}/about`} className="mt-1 block font-bold text-[var(--brand)] hover:underline truncate">
                    {pharmacy.name} ↗
                  </Link>
                </div>
                <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted-2)]">Supply method</span>
                  <p className="mt-1 font-bold text-[var(--foreground)]">
                    {med.prescriptionRequired ? "Prescription review" : "Direct purchase / Pickup"}
                  </p>
                </div>
              </div>
            </div>

            {/* Clear Customer Order Actions */}
            <div className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-[var(--glass-shadow)] sm:p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--brand)]">
                  {med.prescriptionRequired ? "Prescription Dispensing" : "Fast Order Options"}
                </span>
                <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)] sm:text-xl" style={{ fontFamily: "var(--font-display), serif" }}>
                  {med.prescriptionRequired ? "Order this medication with your prescription" : "Order now with M-Pesa or reserve for pickup"}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                  {med.prescriptionRequired
                    ? "A valid prescription from a registered doctor or clinic is required. Submit your prescription online — our licensed pharmacist will inspect it, confirm your dosage, and contact you immediately."
                    : "No account required. Fast checkout in under a minute — pay now with M-Pesa or pay at the counter when you collect your medicine."}
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
                {med.prescriptionRequired ? (
                  <Link
                    href={`${base}/refill?inventoryId=${med.id}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:brightness-105"
                  >
                    <FileText className="h-4 w-4" />
                    Upload Prescription & Order
                  </Link>
                ) : (
                  <Link
                    href={`${base}/order?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 text-center text-sm font-bold text-white shadow-md transition hover:brightness-105"
                  >
                    <Sparkles className="h-4 w-4" />
                    Order Now with M-Pesa ⚡
                  </Link>
                )}

                <a
                  href={pharmacy.whatsappHref || pharmacy.phoneHref || `${base}/contact`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] px-4 py-3 text-center text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--card)]"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--brand)]" />
                  Ask Pharmacist a Question
                </a>
              </div>

              {!med.prescriptionRequired && (
                <div className="pt-1">
                  <Link
                    href={`/portal/orders/new?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}&pharmacy=${pharmacySlug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    Have a registered patient account? Sign in for portal checkout →
                  </Link>
                </div>
              )}

              {med.overTheCounter && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs leading-relaxed text-[var(--foreground)]">
                  <strong className="text-emerald-800 dark:text-emerald-300">Self-care note:</strong> OTC medicines are intended for short-term symptom relief. If symptoms worsen or do not resolve, consult a pharmacist or clinician.
                </div>
              )}
            </div>

            {/* Pharmacy Contact & Location Snapshot */}
            <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)]/80 backdrop-blur-md p-4 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--foreground)] truncate">{pharmacy.name}</p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">{pharmacy.address.full || "Local licensed pharmacy"}</p>
                </div>
                {pharmacy.phone && (
                  <a href={`tel:${pharmacy.phone}`} className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[var(--card)] border border-[var(--line-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)]">
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Clinical Information Section */}
      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand)] sm:text-xs">Clinical summary</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
              Essential usage & safety information
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
              Review verified clinical guidelines before taking this medication. Always follow the label instructions and pharmacist guidance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {med.medicationMaster.dosage && (
              <article className="rounded-3xl border border-teal-500/30 bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-[var(--brand)]"><Pill className="h-4 w-4" /></span>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand)]">How to Take</p>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--foreground)] sm:text-sm">{med.medicationMaster.dosage}</p>
              </article>
            )}

            {med.medicationMaster.indications && (
              <article className="rounded-3xl border border-emerald-500/30 bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></span>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">What It Treats</p>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-[var(--muted)] sm:text-sm"><Markdown>{med.medicationMaster.indications}</Markdown></div>
              </article>
            )}

            {med.medicationMaster.sideEffects && (
              <article className="rounded-3xl border border-amber-500/30 bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><AlertOctagon className="h-4 w-4" /></span>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Precautions</p>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-[var(--muted)] sm:text-sm"><Markdown>{med.medicationMaster.sideEffects}</Markdown></div>
              </article>
            )}

            {med.medicationMaster.storage && (
              <article className="rounded-3xl border border-cyan-500/30 bg-[var(--card)]/90 backdrop-blur-xl p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600"><Thermometer className="h-4 w-4" /></span>
                  <p className="text-xs font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Safe Storage</p>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">{med.medicationMaster.storage}</p>
              </article>
            )}
          </div>

          {med.medicationMaster.contraindications && (
            <div className="mt-4 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <h4 className="font-bold text-sm">Contraindications — Do Not Take If:</h4>
              </div>
              <div className="mt-2 text-xs leading-relaxed text-[var(--foreground)] sm:text-sm">
                <Markdown>{med.medicationMaster.contraindications}</Markdown>
              </div>
            </div>
          )}

          {/* Navigation Links with Dead Links Fixed */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link href={`${base}/medicines`} className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] hover:underline">
              ← Back to all medicines at {pharmacy.name}
            </Link>
            <Link href="/health/self-care-guide" className="inline-flex min-h-10 items-center text-xs font-semibold text-[var(--brand)] hover:underline">
              Self-care vs when to see a doctor guide →
            </Link>
          </div>
        </div>
      </section>

      {/* Digital Pharmacist Advice & Counselling Section */}
      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-emerald-800 dark:text-emerald-300 sm:text-xs">
                Digital Clinical Leaflet
              </span>
              <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                Pharmacist advice & administration leaflet
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                Interactive clinical guidance covering safe administration, food interactions, missed dose rules, and patient advice.
              </p>
            </div>
            <Link href={`/health/counselling/${med.slug}`} className="inline-flex min-h-10 w-fit items-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition">
              Full counselling reference ↗
            </Link>
          </div>
          <DigitalCounsellingCard counselling={counselling} />
        </div>
      </section>

      {/* Related & Equivalent Medicines */}
      {related.length > 0 && (
        <section className="px-4 pb-10 sm:px-6 sm:pb-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand)] sm:text-xs">Keep exploring</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                {altIds.length ? "Equivalent or alternative medicines" : `Related medicines in ${categoryLabel}`}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {related.map((item) => (
                <Link key={item.id} href={`${base}/medicines/${item.slug}`} className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--card)]/90 backdrop-blur-md shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--card-elev)]">
                    {item.medicationMaster.imageUrl ? (
                      <Image src={item.medicationMaster.imageUrl} alt={item.medicationMaster.name} fill className="object-contain p-2 transition duration-300 group-hover:scale-[1.02] sm:p-3" sizes="(max-width:640px) 50vw,25vw" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl opacity-50">💊</div>
                    )}
                  </div>
                  <div className="min-w-0 p-3 sm:p-4">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--foreground)] sm:text-sm">{item.medicationMaster.name}</p>
                    <p className="mt-1.5 text-xs font-bold text-[var(--brand)] sm:text-sm">KES {formatPrice(Number(item.price))}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBanner title={`Have questions about ${med.medicationMaster.name}?`} description="Speak directly with our pharmacy team to confirm availability, dosages, drug interactions, or prescription requirements." />
    </div>
  );
}
