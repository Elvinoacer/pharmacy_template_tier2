"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
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

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

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
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [county, setCounty] = useState(initialCounty);
  const [category, setCategory] = useState(initialCategory);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<"near" | "featured" | "name">("near");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied">("idle");

  // Keep the URL shareable — filters round-trip through the server page.
  const syncUrl = useCallback(
    (next: Partial<{ q: string; city: string; county: string; category: string; delivery: boolean }>) => {
      const params = new URLSearchParams();
      const merged = {
        q: "q" in next ? next.q! : query,
        city: "city" in next ? next.city! : city,
        county: "county" in next ? next.county! : county,
        category: "category" in next ? next.category! : category,
        delivery: "delivery" in next ? next.delivery! : delivery,
      };
      if (merged.q.trim()) params.set("q", merged.q.trim());
      if (merged.city) params.set("city", merged.city);
      if (merged.county) params.set("county", merged.county);
      if (merged.category) params.set("category", merged.category);
      if (merged.delivery) params.set("delivery", "1");
      const qs = params.toString();
      router.replace(qs ? `/pharmacies?${qs}` : "/pharmacies", { scroll: false });
    },
    [router, query, city, county, category, delivery],
  );

  const selectedCategoryName = categories.find((i) => i.slug === category)?.name?.toLowerCase();

  const filtered = useMemo(
    () =>
      pharmacies.filter((p) => {
        if (city && p.city?.toLowerCase() !== city.toLowerCase()) return false;
        if (county && p.county?.toLowerCase() !== county.toLowerCase()) return false;
        if (selectedCategoryName && !p.topCategories.some((v) => v.toLowerCase() === selectedCategoryName))
          return false;
        if (delivery && !p.hasDelivery) return false;
        const n = query.trim().toLowerCase();
        if (!n) return true;
        return (
          p.name.toLowerCase().includes(n) ||
          p.city?.toLowerCase().includes(n) ||
          p.county?.toLowerCase().includes(n) ||
          p.topCategories.some((i) => i.toLowerCase().includes(n)) ||
          p.services.some((i) => i.toLowerCase().includes(n)) ||
          p.hasSearchedMedicine
        );
      }),
    [pharmacies, query, city, county, selectedCategoryName, delivery],
  );

  const sorted = useMemo(
    () =>
      filtered
        .map((p) => ({
          ...p,
          distance:
            position && p.latitude != null && p.longitude != null
              ? distanceKm(position.lat, position.lng, p.latitude, p.longitude)
              : null,
        }))
        .sort((a, b) => {
          if (sort === "near" && position) return (a.distance ?? Infinity) - (b.distance ?? Infinity);
          if (sort === "name") return a.name.localeCompare(b.name);
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    [filtered, position, sort],
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState("denied");
      return;
    }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setSort("near");
        setLocationState("idle");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  const reset = () => {
    setQuery("");
    setCity("");
    setCounty("");
    setCategory("");
    setDelivery(false);
    syncUrl({ q: "", city: "", county: "", category: "", delivery: false });
  };

  const activeFilterCount = [city, county, category, delivery ? "delivery" : ""].filter(Boolean).length;

  return (
    <div>
      {/* Search + location toolbar */}
      <div className="rounded-3xl border border-teal-900/10 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => syncUrl({ q: query })}
              onKeyDown={(e) => {
                if (e.key === "Enter") syncUrl({ q: query });
              }}
              placeholder="Search pharmacy, medicine, category or area…"
              aria-label="Search pharmacies"
              className="h-12 w-full rounded-2xl bg-[#f4f7f4] pl-11 pr-10 text-sm text-[#0c1a14] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-[#0d6e5a]/30"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  syncUrl({ q: "" });
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#5a6b62] hover:bg-[#e6f4ef]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={requestLocation}
            disabled={locationState === "loading"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0d6e5a] px-4 text-sm font-semibold text-white transition hover:bg-[#084c3f] disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" aria-hidden />
            {locationState === "loading" ? "Finding you…" : position ? "Location enabled" : "Near me"}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-teal-900/15 px-4 text-sm font-semibold text-[#084c3f] hover:bg-[#f0faf6] lg:hidden"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#0d6e5a] px-2 py-0.5 text-[10px] text-white">{activeFilterCount}</span>
            )}
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Filter row */}
        <div className={`${showFilters ? "grid" : "hidden"} mt-3 gap-3 border-t border-teal-900/5 pt-3 lg:grid lg:grid-cols-4`}>
          <Select
            value={city}
            onChange={(v) => {
              setCity(v);
              syncUrl({ city: v });
            }}
            placeholder="All cities"
            label="Filter by city"
            options={cities.map((v) => ({ label: v, value: v }))}
          />
          <Select
            value={county}
            onChange={(v) => {
              setCounty(v);
              syncUrl({ county: v });
            }}
            placeholder="All counties"
            label="Filter by county"
            options={counties.map((v) => ({ label: v, value: v }))}
          />
          <Select
            value={category}
            onChange={(v) => {
              setCategory(v);
              syncUrl({ category: v });
            }}
            placeholder="All categories"
            label="Filter by medicine category"
            options={categories.map((i) => ({ label: i.name, value: i.slug }))}
          />
          <button
            type="button"
            onClick={() => {
              const next = !delivery;
              setDelivery(next);
              syncUrl({ delivery: next });
            }}
            aria-pressed={delivery}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
              delivery
                ? "border-[#0d6e5a] bg-[#0d6e5a] text-white"
                : "border-teal-900/15 text-[#084c3f] hover:bg-[#f0faf6]"
            }`}
          >
            <Truck className="h-4 w-4" aria-hidden /> Delivery available
          </button>
        </div>

        {/* Sort + status line */}
        <div className="mt-3 flex flex-col gap-2 border-t border-teal-900/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {position && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <Navigation className="h-3.5 w-3.5" aria-hidden /> Sorted by distance from you
              </span>
            )}
            {locationState === "denied" && (
              <span className="text-[11px] text-amber-700">Location unavailable — showing standard order</span>
            )}
          </div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-[#5a6b62]">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-10 rounded-xl border border-teal-900/15 bg-white px-3 text-xs font-semibold text-[#0c1a14] outline-none focus:border-[#0d6e5a]/40"
            >
              <option value="near">Nearest first</option>
              <option value="featured">Featured first</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-teal-900/5 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8a9a92]">Active</span>
            {city && <FilterChip label={city} onRemove={() => { setCity(""); syncUrl({ city: "" }); }} />}
            {county && <FilterChip label={county} onRemove={() => { setCounty(""); syncUrl({ county: "" }); }} />}
            {category && (
              <FilterChip
                label={categories.find((i) => i.slug === category)?.name ?? category}
                onRemove={() => { setCategory(""); syncUrl({ category: "" }); }}
              />
            )}
            {delivery && <FilterChip label="Delivery" onRemove={() => { setDelivery(false); syncUrl({ delivery: false }); }} />}
            <button onClick={reset} className="ml-auto text-[11px] font-bold text-teal-800 hover:underline">
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Result count */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0c1a14]">
            {sorted.length} {sorted.length === 1 ? "pharmacy" : "pharmacies"}
          </p>
          {query && (
            <p className="mt-0.5 text-xs text-[#5a6b62]">Showing results for “{query}”</p>
          )}
        </div>
        <Link href="/for-pharmacies" className="hidden text-xs font-semibold text-teal-800 hover:underline sm:block">
          List your pharmacy →
        </Link>
      </div>

      {/* Live stock-search explainer */}
      {query && sorted.some((p) => p.hasSearchedMedicine) && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-teal-900/15 bg-[#084c3f] px-4 py-3 text-white">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-bold">Stock search</p>
            <p className="truncate text-[11px] text-teal-100/85">
              Showing pharmacies with public, in-stock matches for “{query}”.
            </p>
          </div>
          <span className="ml-auto whitespace-nowrap rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold">
            Live listing
          </span>
        </div>
      )}

      {/* Grid / empty state */}
      {sorted.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-teal-900/20 bg-white/70 p-12 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-[#8a9a92]" aria-hidden />
          <h2 className="mt-4 text-base font-semibold text-[#0c1a14]">No pharmacies match those filters</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#5a6b62]">
            Try another area, medicine, category, or remove a filter.
          </p>
          <button onClick={reset} className="mt-5 rounded-xl bg-[#0d6e5a] px-4 py-2 text-xs font-bold text-white hover:bg-[#084c3f]">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((pharmacy, index) => (
            <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} index={index} searchQuery={query} distance={pharmacy.distance} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-11 w-full appearance-none rounded-xl border border-teal-900/15 bg-white px-3 pr-9 text-xs font-medium text-[#0c1a14] outline-none focus:border-[#0d6e5a]/40"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a9a92]" aria-hidden />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-2.5 py-1 text-[11px] font-semibold text-[#084c3f] hover:bg-[#d0ece2]"
    >
      {label}
      <X className="h-3 w-3" aria-hidden />
    </button>
  );
}

function PharmacyCard({
  pharmacy,
  index,
  searchQuery,
  distance,
}: {
  pharmacy: DirectoryPharmacy & { distance?: number | null };
  index: number;
  searchQuery: string;
  distance: number | null;
}) {
  const whatsapp = pharmacy.whatsapp
    ? `https://wa.me/${pharmacy.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hello ${pharmacy.name}, I found you on the network directory and would like to ask about a medicine or service.`,
      )}`
    : null;
  const location = [pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || pharmacy.country;
  const cover = pharmacy.coverImageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length];
  const medicineHref = searchQuery
    ? `/p/${pharmacy.slug}/medicines?q=${encodeURIComponent(searchQuery)}`
    : `/p/${pharmacy.slug}/medicines`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-[#e3ebe6] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden bg-[#084c3f]">
        <Image
          src={cover}
          alt={pharmacy.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 380px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {pharmacy.featured && <Badge>Featured</Badge>}
          <Badge>
            <CheckCircle2 className="h-3 w-3" aria-hidden /> Verified listing
          </Badge>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{pharmacy.name}</h2>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-teal-100">
              <MapPin className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              {location}
            </p>
          </div>
          {pharmacy.logoUrl && (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-white">
              <Image src={pharmacy.logoUrl} alt="" fill sizes="44px" className="object-contain p-1" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="line-clamp-1 min-h-5 text-xs leading-5 text-[#5a6b62]">
            {pharmacy.tagline || pharmacy.description || "Active pharmacy on the network."}
          </p>
          {distance != null && (
            <span className="shrink-0 rounded-full bg-[#e6f4ef] px-2.5 py-1 text-[10px] font-bold text-[#084c3f]">
              {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} away
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] font-medium text-[#8a9a92]">
          {distance != null ? "Distance from your location" : `Location: ${location}`}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {pharmacy.topCategories.slice(0, 4).map((c) => (
            <span key={c} className="rounded-full bg-[#f0faf6] px-2.5 py-1 text-[10px] font-semibold text-[#084c3f]">
              {c}
            </span>
          ))}
          {pharmacy.services.slice(0, 2).map((s) => (
            <span key={s} className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-y border-[#e3ebe6] py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a9a92]">Public stock</p>
            <p className="mt-0.5 text-sm font-bold text-[#0c1a14]">{pharmacy.stockCount} items</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a9a92]">OTC</p>
            <p className="mt-0.5 text-sm font-bold text-[#0c1a14]">{pharmacy.otcCount} in stock</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {pharmacy.hasDelivery && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              <Truck className="h-3 w-3" aria-hidden /> Delivery
            </span>
          )}
          {pharmacy.hasSearchedMedicine && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              <PackageCheck className="h-3 w-3" aria-hidden /> {pharmacy.searchedMedicineCount} match
              {pharmacy.searchedMedicineCount === 1 ? "" : "es"}
            </span>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <Link
            href={`/p/${pharmacy.slug}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0d6e5a] py-2.5 text-xs font-bold text-white transition hover:bg-[#084c3f]"
          >
            Visit storefront <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp ${pharmacy.name}`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-teal-900/15 px-3 text-[#084c3f] hover:bg-[#f0faf6]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/p/${pharmacy.slug}/refill`}
            className="rounded-xl border border-teal-900/15 py-2 text-center text-[10px] font-bold text-[#084c3f] hover:bg-[#f0faf6]"
          >
            Refill here
          </Link>
          <Link
            href={medicineHref}
            className="rounded-xl border border-teal-900/15 py-2 text-center text-[10px] font-bold text-[#084c3f] hover:bg-[#f0faf6]"
          >
            Order OTC
          </Link>
        </div>
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur">
      {children}
    </span>
  );
}
