"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  Truck,
  X,
} from "lucide-react";
import type { DirectoryPharmacy } from "@/app/lib/services/pharmacy-directory";

const FALLBACK_COVERS = [
  "/images/gallery/welcoming_retail_floor.webp",
  "/images/gallery/curated_wellness_aisle.webp",
  "/images/gallery/comfortable_waiting_area.webp",
  "/images/gallery/careful_dispensing.webp",
];

type Props = {
  pharmacies: DirectoryPharmacy[];
  cities: string[];
  counties: string[];
  categories: { name: string; slug: string }[];
  initialQuery: string;
  initialCity: string;
  initialCounty: string;
  initialCategory: string;
  initialDelivery: boolean;
};

export default function PharmacyDirectory({
  pharmacies,
  cities,
  counties,
  categories,
  initialQuery,
  initialCity,
  initialCounty,
  initialCategory,
  initialDelivery,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [county, setCounty] = useState(initialCounty);
  const [category, setCategory] = useState(initialCategory);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pharmacies.filter((p) => {
      if (city && p.city?.toLowerCase() !== city.toLowerCase()) return false;
      if (county && p.county?.toLowerCase() !== county.toLowerCase()) return false;
      if (category && !p.topCategories.some((value) => value.toLowerCase() === category.toLowerCase())) {
        // Server-side category filtering already happened; this only protects URL/state changes.
        return p.hasSearchedMedicine || p.stockCount === 0 ? false : true;
      }
      if (delivery && !p.hasDelivery) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.city?.toLowerCase().includes(needle) ||
        p.county?.toLowerCase().includes(needle) ||
        p.topCategories.some((item) => item.toLowerCase().includes(needle)) ||
        p.services.some((item) => item.toLowerCase().includes(needle)) ||
        p.hasSearchedMedicine
      );
    });
  }, [pharmacies, query, city, county, category, delivery]);

  const reset = () => {
    setQuery("");
    setCity("");
    setCounty("");
    setCategory("");
    setDelivery(false);
  };

  const activeFilterCount = [city, county, category, delivery ? "delivery" : ""].filter(Boolean).length;

  return (
    <div>
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pharmacy, medicine, category or area..."
              className="h-12 w-full rounded-2xl bg-slate-50 pl-11 pr-10 text-sm outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-slate-300"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 lg:hidden"
          >
            Filters {activeFilterCount > 0 && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">{activeFilterCount}</span>}
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} mt-3 gap-3 border-t border-slate-100 pt-3 lg:grid lg:grid-cols-4`}>
          <Select value={city} onChange={setCity} placeholder="All cities" options={cities.map((value) => ({ label: value, value }))} />
          <Select value={county} onChange={setCounty} placeholder="All counties" options={counties.map((value) => ({ label: value, value }))} />
          <Select value={category} onChange={setCategory} placeholder="All categories" options={categories.map((item) => ({ label: item.name, value: item.slug }))} />
          <button
            type="button"
            onClick={() => setDelivery((value) => !value)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${delivery ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            <Truck className="h-4 w-4" /> Delivery available
          </button>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active</span>
            {city && <FilterChip label={city} onRemove={() => setCity("")} />}
            {county && <FilterChip label={county} onRemove={() => setCounty("")} />}
            {category && <FilterChip label={categories.find((item) => item.slug === category)?.name ?? category} onRemove={() => setCategory("")} />}
            {delivery && <FilterChip label="Delivery" onRemove={() => setDelivery(false)} />}
            <button onClick={reset} className="ml-auto text-[11px] font-bold text-slate-700 hover:underline">Reset</button>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{filtered.length} {filtered.length === 1 ? "pharmacy" : "pharmacies"}</p>
          {query && <p className="mt-0.5 text-xs text-slate-500">Showing results for “{query}”</p>}
        </div>
        <Link href="/for-pharmacies" className="hidden text-xs font-semibold text-slate-700 hover:underline sm:block">List your pharmacy →</Link>
      </div>

      {query && filtered.some((p) => p.hasSearchedMedicine) && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-white">
          <Search className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold">Stock search</p>
            <p className="truncate text-[11px] text-slate-300">Showing pharmacies with public, in-stock matches for “{query}”.</p>
          </div>
          <span className="ml-auto whitespace-nowrap rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold">Live listing</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-4 text-base font-semibold text-slate-900">No pharmacies match those filters</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Try another area, medicine, category, or remove a filter. Only public, active listings are shown.</p>
          <button onClick={reset} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Clear filters</button>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pharmacy, index) => <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} index={index} />)}
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: { label: string; value: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-700 outline-none focus:border-slate-400">
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <button onClick={onRemove} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{label}<X className="h-3 w-3" /></button>;
}

function PharmacyCard({ pharmacy, index }: { pharmacy: DirectoryPharmacy; index: number }) {
  const whatsapp = pharmacy.whatsapp ? `https://wa.me/${pharmacy.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${pharmacy.name}, I found you on Aether and would like to ask about a medicine or service.`)}` : null;
  const location = [pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || pharmacy.country;
  const cover = pharmacy.coverImageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length];

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden bg-slate-900">
        <Image src={cover} alt={pharmacy.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 380px" className="object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {pharmacy.featured && <Badge>Featured</Badge>}
          <Badge><CheckCircle2 className="h-3 w-3" /> Verified listing</Badge>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{pharmacy.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-200"><MapPin className="h-3.5 w-3.5 text-amber-300" />{location}</p>
          </div>
          {pharmacy.logoUrl && <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-white"><Image src={pharmacy.logoUrl} alt="" fill className="object-contain p-1" /></div>}
        </div>
      </div>

      <div className="p-5">
        <p className="line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{pharmacy.tagline || pharmacy.description || "Active pharmacy on the Aether network."}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {pharmacy.topCategories.slice(0, 4).map((category) => <span key={category} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{category}</span>)}
          {pharmacy.services.slice(0, 2).map((service) => <span key={service} className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">{service}</span>)}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 border-y border-slate-100 py-3">
          <div><p className="text-[10px] uppercase tracking-wider text-slate-400">Public stock</p><p className="mt-0.5 text-sm font-bold text-slate-900">{pharmacy.stockCount} items</p></div>
          <div><p className="text-[10px] uppercase tracking-wider text-slate-400">OTC</p><p className="mt-0.5 text-sm font-bold text-slate-900">{pharmacy.otcCount} in stock</p></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {pharmacy.hasDelivery && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><Truck className="h-3 w-3" /> Delivery</span>}
          {pharmacy.hasSearchedMedicine && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700"><PackageCheck className="h-3 w-3" /> {pharmacy.searchedMedicineCount} match{pharmacy.searchedMedicineCount === 1 ? "" : "es"}</span>}
        </div>

        <div className="mt-5 flex gap-2">
          <Link href={`/p/${pharmacy.slug}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800">Visit storefront <ArrowRight className="h-3.5 w-3.5" /></Link>
          {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${pharmacy.name}`} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-800 hover:bg-slate-50"><MessageCircle className="h-4 w-4" /></a>}
        </div>
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur">{children}</span>;
}
