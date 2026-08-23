import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { platform } from "@/app/lib/data";
import { getDirectoryFacets, listPharmacyDirectory } from "@/app/lib/services/pharmacy-directory";
import PharmacyDirectory from "./PharmacyDirectory";
import DirectoryAssistant from "./DirectoryAssistant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Find a Pharmacy — ${platform.name}`,
  description: "Search active Aether network pharmacies by area, category, delivery and public medicine stock.",
};

type SearchParams = { q?: string; city?: string; county?: string; category?: string; delivery?: string };

export default async function PharmaciesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const city = (params.city || "").trim();
  const county = (params.county || "").trim();
  const category = (params.category || "").trim();
  const delivery = params.delivery === "1";

  const [pharmacies, facets] = await Promise.all([
    listPharmacyDirectory({ q: q || undefined, city: city || undefined, county: county || undefined, category: category || undefined, delivery }),
    getDirectoryFacets(),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8"><Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-3.5 w-3.5" /> Back to Aether</Link></div></header>
      <section className="bg-white px-4 pb-10 pt-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600"><Sparkles className="h-3 w-3" /> Aether Pharmacy Directory</div><h1 className="mt-5 text-4xl font-medium tracking-tight text-slate-950 sm:text-5xl" style={{ fontFamily: "var(--font-display), serif" }}>Find the right pharmacy for what you need.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Search neighbourhood pharmacies, browse public medicine stock, compare services, and go directly into the pharmacy storefront you choose.</p></div></div></section>
      <section className="px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><DirectoryAssistant /><div className="mt-8"><PharmacyDirectory pharmacies={pharmacies} cities={facets.cities} counties={facets.counties} categories={facets.categories} initialQuery={q} initialCity={city} initialCounty={county} initialCategory={category} initialDelivery={delivery} /></div></div></section>
    </main>
  );
}
