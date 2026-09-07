"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  PhoneCall,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import type { DirectoryPharmacy } from "@/app/lib/services/pharmacy-directory";

const FALLBACK_COVERS = [
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/comfortable_waiting_area.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
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
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [county, setCounty] = useState(initialCounty);
  const [category, setCategory] = useState(initialCategory);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<"near" | "featured" | "name">("featured");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied">("idle");

  useEffect(() => {
    if (searchParams.get("focus") !== "search") return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
      searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [searchParams]);

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

  const selectedCategoryName = categories.find((item) => item.slug === category)?.name?.toLowerCase();

  const filtered = useMemo(
    () =>
      pharmacies.filter((pharmacy) => {
        if (city && pharmacy.city?.toLowerCase() !== city.toLowerCase()) return false;
        if (county && pharmacy.county?.toLowerCase() !== county.toLowerCase()) return false;
        if (
          selectedCategoryName &&
          !pharmacy.topCategories.some((value) => value.toLowerCase() === selectedCategoryName)
        )
          return false;
        if (delivery && !pharmacy.hasDelivery) return false;

        const needle = query.trim().toLowerCase();
        if (!needle) return true;

        return (
          pharmacy.name.toLowerCase().includes(needle) ||
          pharmacy.city?.toLowerCase().includes(needle) ||
          pharmacy.county?.toLowerCase().includes(needle) ||
          pharmacy.topCategories.some((item) => item.toLowerCase().includes(needle)) ||
          pharmacy.services.some((item) => item.toLowerCase().includes(needle)) ||
          pharmacy.hasSearchedMedicine
        );
      }),
    [pharmacies, query, city, county, selectedCategoryName, delivery],
  );

  const sorted = useMemo(
    () =>
      filtered
        .map((pharmacy) => ({
          ...pharmacy,
          distance:
            position && pharmacy.latitude != null && pharmacy.longitude != null
              ? distanceKm(position.lat, position.lng, pharmacy.latitude, pharmacy.longitude)
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
    <div id="directory" className="scroll-mt-28">
      <div className="glass-panel rounded-[28px] border border-teal-900/10 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" aria-hidden />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => syncUrl({ q: query })}
              onKeyDown={(event) => {
                if (event.key === "Enter") syncUrl({ q: query });
              }}
              placeholder="Search pharmacy, medicine, service or area"
              aria-label="Search pharmacies"
              className="h-[50px] w-full rounded-2xl border border-transparent bg-[#f3f7f4] pl-11 pr-10 text-sm text-[#0c1a14] outline-none transition placeholder:text-[#8a9a92] focus:border-[#0d6e5a]/20 focus:bg-white focus:ring-4 focus:ring-[#0d6e5a]/5"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  syncUrl({ q: "" });
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#5a6b62] transition hover:bg-[#e6f4ef]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationState === "loading"}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#0d6e5a] px-4 text-xs font-bold text-white transition hover:bg-[#084c3f] disabled:opacity-60 sm:text-sm"
            >
              <LocateFixed className="h-4 w-4" aria-hidden />
              <span>{locationState === "loading" ? "Finding…" : position ? "Location on" : "Near me"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl border border-teal-900/15 bg-white/70 px-4 text-xs font-bold text-[#084c3f] transition hover:bg-[#f0faf6] lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[#0d6e5a] px-1.5 py-0.5 text-[9px] text-white">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        <div
          className={`${showFilters ? "grid" : "hidden"} mt-3 gap-2.5 border-t border-teal-900/5 pt-3 sm:grid-cols-2 lg:grid lg:grid-cols-4`}
        >
          <Select
            value={city}
            onChange={(value) => {
              setCity(value);
              syncUrl({ city: value });
            }}
            placeholder="All cities"
            label="Filter by city"
            options={cities.map((value) => ({ label: value, value }))}
          />
          <Select
            value={county}
            onChange={(value) => {
              setCounty(value);
              syncUrl({ county: value });
            }}
            placeholder="All counties"
            label="Filter by county"
            options={counties.map((value) => ({ label: value, value }))}
          />
          <Select
            value={category}
            onChange={(value) => {
              setCategory(value);
              syncUrl({ category: value });
            }}
            placeholder="All categories"
            label="Filter by medicine category"
            options={categories.map((item) => ({ label: item.name, value: item.slug }))}
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
                : "border-teal-900/15 bg-white text-[#084c3f] hover:bg-[#f0faf6]"
            }`}
          >
            <Truck className="h-4 w-4" aria-hidden /> Delivery available
          </button>
        </div>

        {(activeFilterCount > 0 || position || locationState === "denied") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-teal-900/5 pt-3">
            {position && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
                <Navigation className="h-3 w-3" aria-hidden /> Distance enabled
              </span>
            )}
            {locationState === "denied" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700">
                Location unavailable
              </span>
            )}
            {city && <FilterChip label={city} onRemove={() => { setCity(""); syncUrl({ city: "" }); }} />}
            {county && <FilterChip label={county} onRemove={() => { setCounty(""); syncUrl({ county: "" }); }} />}
            {category && (
              <FilterChip
                label={categories.find((item) => item.slug === category)?.name ?? category}
                onRemove={() => { setCategory(""); syncUrl({ category: "" }); }}
              />
            )}
            {delivery && <FilterChip label="Delivery" onRemove={() => { setDelivery(false); syncUrl({ delivery: false }); }} />}
            {activeFilterCount > 0 && (
              <button type="button" onClick={reset} className="ml-auto px-1 text-[10px] font-bold text-teal-800 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3 sm:mt-7">
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight text-[#0c1a14]">
            {sorted.length} {sorted.length === 1 ? "pharmacy" : "pharmacies"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-[#6b7a72]">
            {query ? `Results for “${query}”` : "Verified public listings on the network"}
          </p>
        </div>

        <label className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8a9a92]">
          <span className="hidden sm:inline">Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="h-10 rounded-xl border border-teal-900/15 bg-white px-3 text-[11px] font-semibold normal-case tracking-normal text-[#0c1a14] outline-none focus:border-[#0d6e5a]/40"
          >
            <option value="featured">Recommended</option>
            <option value="near" disabled={!position}>Nearest{position ? "" : " · enable location"}</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      {query && sorted.some((pharmacy) => pharmacy.hasSearchedMedicine) && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-teal-900/10 bg-[#084c3f] px-3.5 py-3 text-white shadow-sm sm:px-4">
          <PackageCheck className="h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold">Public stock matches found</p>
            <p className="mt-0.5 truncate text-[10px] text-teal-100/75">Listings below include visible in-stock matches for “{query}”.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[9px] font-bold">Live</span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="mt-5 rounded-[28px] border border-dashed border-teal-900/20 bg-white/70 p-7 text-center sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0faf6] text-[#0d6e5a]">
            <PackageCheck className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 text-base font-bold text-[#0c1a14]">No matching pharmacies yet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#5a6b62]">
            Try a broader area or medicine name, or remove one of the active filters.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 rounded-xl bg-[#0d6e5a] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#084c3f]"
          >
            Reset search
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((pharmacy, index) => (
            <PharmacyCard
              key={pharmacy.id}
              pharmacy={pharmacy}
              index={index}
              searchQuery={query}
              distance={pharmacy.distance}
            />
          ))}
        </div>
      )}

      <div className="mt-7 text-center sm:hidden">
        <Link href="/for-pharmacies" className="text-xs font-bold text-teal-800 hover:underline">
          Own a pharmacy? Join the network →
        </Link>
      </div>
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
  onChange: (value: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-11 w-full appearance-none rounded-xl border border-teal-900/15 bg-white px-3 pr-9 text-xs font-medium text-[#0c1a14] outline-none transition focus:border-[#0d6e5a]/40"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
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
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-2.5 py-1.5 text-[10px] font-semibold text-[#084c3f] transition hover:bg-[#d0ece2]"
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
  const phoneHref = pharmacy.phone ? `tel:${pharmacy.phone.replace(/[^\d+]/g, "")}` : null;
  const location = [pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || pharmacy.country;
  const cover = pharmacy.coverImageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length];
  const medicineHref = searchQuery
    ? `/p/${pharmacy.slug}/medicines?q=${encodeURIComponent(searchQuery)}`
    : `/p/${pharmacy.slug}/medicines`;
  const visibleTags = [
    ...pharmacy.topCategories.slice(0, 3).map((label) => ({ label, tone: "teal" as const })),
    ...pharmacy.services.slice(0, 1).map((label) => ({ label, tone: "amber" as const })),
  ];

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[26px] border border-teal-900/10 bg-white/85 shadow-[0_4px_20px_rgba(8,76,63,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(8,76,63,0.12)]">
      <div className="relative h-40 overflow-hidden bg-[#084c3f] sm:h-44">
        <Image
          src={cover}
          alt={pharmacy.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 380px"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" aria-hidden />

        <div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap gap-1.5">
          {pharmacy.featured && <Badge>Featured</Badge>}
          <Badge>
            <CheckCircle2 className="h-3 w-3" aria-hidden /> Verified
          </Badge>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-bold tracking-tight sm:text-lg">{pharmacy.name}</h2>
            <p className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-teal-50/85">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
              <span className="truncate">{location}</span>
            </p>
          </div>
          {pharmacy.logoUrl && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-white shadow-sm">
              <Image src={pharmacy.logoUrl} alt="" fill sizes="40px" className="object-contain p-1" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex min-w-0 items-start justify-between gap-2.5">
          <p className="line-clamp-2 min-h-9 flex-1 text-[11px] leading-[18px] text-[#5a6b62]">
            {pharmacy.tagline || pharmacy.description || "Active pharmacy on the network."}
          </p>
          {distance != null && (
            <span className="shrink-0 rounded-full bg-[#e6f4ef] px-2 py-1 text-[9px] font-bold text-[#084c3f]">
              {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
            </span>
          )}
        </div>

        {visibleTags.length > 0 && (
          <div className="mt-3 flex gap-1.5 overflow-hidden">
            {visibleTags.map((tag) => (
              <span
                key={`${tag.tone}-${tag.label}`}
                className={`max-w-[145px] truncate rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                  tag.tone === "teal" ? "bg-[#f0faf6] text-[#084c3f]" : "bg-amber-50 text-amber-800"
                }`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 divide-x divide-[#e3ebe6] rounded-2xl border border-[#e7eee9] bg-[#f8faf8] py-2.5">
          <div className="px-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8a9a92]">Public stock</p>
            <p className="mt-0.5 text-sm font-bold text-[#0c1a14]">{pharmacy.stockCount}</p>
          </div>
          <div className="px-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8a9a92]">OTC in stock</p>
            <p className="mt-0.5 text-sm font-bold text-[#0c1a14]">{pharmacy.otcCount}</p>
          </div>
        </div>

        {(pharmacy.hasDelivery || pharmacy.hasSearchedMedicine) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pharmacy.hasDelivery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                <Truck className="h-3 w-3" aria-hidden /> Delivery
              </span>
            )}
            {pharmacy.hasSearchedMedicine && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                <PackageCheck className="h-3 w-3" aria-hidden /> {pharmacy.searchedMedicineCount} stock match
                {pharmacy.searchedMedicineCount === 1 ? "" : "es"}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex gap-2">
            <Link
              href={`/p/${pharmacy.slug}`}
              className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0d6e5a] px-3 text-[11px] font-bold text-white transition hover:bg-[#084c3f]"
            >
              Visit storefront <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </Link>
            {phoneHref && (
              <a
                href={phoneHref}
                aria-label={`Call ${pharmacy.name}`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-900/15 text-[#084c3f] transition hover:bg-[#f0faf6]"
              >
                <PhoneCall className="h-4 w-4" aria-hidden />
              </a>
            )}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${pharmacy.name}`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-900/15 text-[#084c3f] transition hover:bg-[#f0faf6]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href={`/p/${pharmacy.slug}/refill`}
              className="rounded-xl border border-teal-900/15 py-2 text-center text-[10px] font-bold text-[#084c3f] transition hover:bg-[#f0faf6]"
            >
              Request refill
            </Link>
            <Link
              href={medicineHref}
              className="rounded-xl border border-teal-900/15 py-2 text-center text-[10px] font-bold text-[#084c3f] transition hover:bg-[#f0faf6]"
            >
              Browse medicines
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-md">
      {children}
    </span>
  );
}
