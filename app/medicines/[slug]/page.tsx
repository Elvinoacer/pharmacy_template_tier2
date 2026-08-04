import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBanner from "../../components/CtaBanner";
import PageHero from "../../components/PageHero";
import { Markdown } from "../../components/Markdown";
import { categories, getCategory } from "../../lib/data";
import { prisma } from "../../lib/db";
import { formatPrice } from "../../lib/format";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (cat) {
    return {
      title: cat.title,
      description: cat.description,
      alternates: { canonical: `/medicines/${cat.slug}` },
    };
  }
  // Try medication slug (slug lives on PharmacyInventory; name/description on MedicationMaster).
  const med = await prisma.pharmacyInventory
    .findUnique({
      where: { slug },
      include: { medicationMaster: { select: { name: true, description: true, dosage: true } } },
    })
    .catch(() => null);
  if (med) {
    return {
      title: med.medicationMaster.name,
      description:
        med.medicationMaster.description ||
        `${med.medicationMaster.name} — available at Aether Pharmacy`,
      alternates: { canonical: `/medicines/${med.slug}` },
    };
  }
  return { title: "Category" };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const cat = getCategory(slug);

  // If it's an educational category, render the educational page.
  if (cat) {
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

  // Otherwise, try to find a medication by slug. Inventory row carries the
  // commercial fields; MedicationMaster carries clinical fields.
  const med = await prisma.pharmacyInventory
    .findUnique({
      where: { slug },
      include: {
        medicationMaster: {
          select: {
            name: true,
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
          },
        },
      },
    })
    .catch(() => null);
  if (!med) notFound();

  // Prefer explicitly linked alternatives; fall back to same-category meds.
  // alternativeIds are MedicationMaster IDs — look up PharmacyInventory rows
  // whose medicationMasterId is in that list.
  const altIds = (med.medicationMaster.alternativeIds || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const alternatives =
    altIds.length > 0
      ? await prisma.pharmacyInventory
          .findMany({
            where: { medicationMasterId: { in: altIds }, active: true },
            include: { medicationMaster: { select: { name: true, imageUrl: true } } },
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
            include: { medicationMaster: { select: { name: true, imageUrl: true } } },
            take: 4,
          })
          .catch(() => []);

  return (
    <div>
      <PageHero
        eyebrow={med.medicationMaster.category.replace(/-/g, " ")}
        title={med.medicationMaster.name}
        description={
          med.medicationMaster.description ||
          med.medicationMaster.dosage ||
          "Available at Aether Pharmacy"
        }
        crumbs={[
          { label: "Medicines", href: "/medicines" },
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
                <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-xl bg-[#f4f7f4]">
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
                    <div className="flex h-full items-center justify-center text-7xl">💊</div>
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
              {med.overTheCounter && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Over the counter
                </span>
              )}
              {med.prescriptionRequired && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  Prescription required
                </span>
              )}
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${med.currentStock > 0 ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
                {med.currentStock > 0 ? `${med.currentStock} in stock` : "Out of stock"}
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-[#0c1a14]">
              KES {formatPrice(Number(med.price))}
            </p>

            {med.medicationMaster.dosage && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8a9a92]">Dosage</p>
                <p className="mt-1 text-sm text-[#0c1a14]">{med.medicationMaster.dosage}</p>
              </div>
            )}

            {med.medicationMaster.indications && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8a9a92]">Uses (indications)</p>
                <div className="mt-2 text-sm text-[#0c1a14]">
                  <Markdown>{med.medicationMaster.indications}</Markdown>
                </div>
              </div>
            )}

            {med.medicationMaster.sideEffects && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8a9a92]">Side effects</p>
                <div className="mt-2 text-sm text-[#0c1a14]">
                  <Markdown>{med.medicationMaster.sideEffects}</Markdown>
                </div>
              </div>
            )}

            {med.medicationMaster.contraindications && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8a9a92]">Not for you if…</p>
                <div className="mt-2 text-sm text-[#0c1a14]">
                  <Markdown>{med.medicationMaster.contraindications}</Markdown>
                </div>
              </div>
            )}

            {med.medicationMaster.storage && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8a9a92]">Storage</p>
                <p className="mt-1 text-sm text-[#0c1a14]">{med.medicationMaster.storage}</p>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-[#0d6e5a]/20 bg-[#f0faf6] p-4">
              <p className="text-sm font-semibold text-[#0c1a14]">How to get this medication</p>
              <p className="mt-1 text-xs text-[#5a6b62]">
                {med.prescriptionRequired
                  ? "This medication requires a valid prescription. Request a refill from your portal, or visit us with your prescription."
                  : "This over-the-counter medication can be reserved online with no account, ordered in the portal (M-Pesa), or bought in store."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {med.prescriptionRequired ? (
                  <Link href="/portal/refills/new" className="btn-primary !py-2 text-xs">
                    Request refill
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/order?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}`}
                      className="btn-primary !py-2 text-xs"
                    >
                      Buy now — no account
                    </Link>
                    <Link
                      href={`/portal/orders/new?medicationId=${med.id}&slug=${encodeURIComponent(med.slug)}`}
                      className="btn-ghost !py-2 text-xs"
                    >
                      Portal checkout
                    </Link>
                  </>
                )}
                <Link href="/contact" className="btn-ghost !py-2 text-xs">
                  Ask a pharmacist
                </Link>
              </div>
            </div>

            <Link href="/medicines" className="mt-6 inline-block text-sm font-semibold text-teal-800 hover:underline">
              ← All medications
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-4 text-xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              {altIds.length > 0 ? "Equivalent / alternative medications" : `Related in ${med.medicationMaster.category.replace(/-/g, " ")}`}
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
                      <Image src={r.medicationMaster.imageUrl} alt={r.medicationMaster.name} fill className="object-cover" sizes="25vw" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">💊</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-[#0c1a14]">{r.medicationMaster.name}</p>
                    <p className="mt-1 text-xs font-bold text-[#0d6e5a]">KES {formatPrice(Number(r.price))}</p>
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
