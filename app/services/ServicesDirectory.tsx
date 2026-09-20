"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  HeartPulse,
  LayoutGrid,
  LocateFixed,
  MapPin,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Syringe,
  X,
} from "lucide-react";
import CareRadar, { type RadarItem } from "@/app/components/radar/CareRadar";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import { setBrowseLocation } from "@/app/actions/browse-location";
import { formatPrice } from "@/app/lib/format";
import type { NetworkServiceListing } from "@/app/lib/services/network-catalog";

type Props = {
  services: NetworkServiceListing[];
  initialQuery: string;
  initialBookable: boolean;
  initialLocation?: { latitude: number; longitude: number } | null;
};

const SERVICE_CATEGORIES = [
  { id: "all", label: "All Care", icon: HeartPulse },
  { id: "screening", label: "Screenings & Checks", icon: Stethoscope },
  { id: "vaccine", label: "Vaccinations", icon: Syringe },
  { id: "consultation", label: "Consultations", icon: Sparkles },
];

export default function ServicesDirectory({
  services,
  initialQuery,
  initialBookable,
  initialLocation,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [bookableOnly, setBookableOnly] = useState<boolean>(initialBookable);
  const [sort, setSort] = useState<"near" | "price-asc" | "price-desc" | "bookable" | "name">(
    initialLocation ? "near" : "bookable",
  );
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.latitude, lng: initialLocation.longitude } : null,
  );
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied">("idle");
  const [viewMode, setViewMode] = useState<"grid" | "radar">("grid");

  // Sync URL query state debounced
  const syncUrl = useCallback(
    (qVal: string, bookableVal: boolean) => {
      const params = new URLSearchParams();
      if (qVal.trim()) params.set("q", qVal.trim());
      if (bookableVal) params.set("bookable", "1");
      const qs = params.toString();
      router.replace(qs ? `/services?${qs}` : "/services", { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const currentQ = (searchParams.get("q") || "").trim();
    const currentBookable = searchParams.get("bookable") === "1";

    if (currentQ === query.trim() && currentBookable === bookableOnly) {
      return;
    }

    const timer = window.setTimeout(() => {
      syncUrl(query, bookableOnly);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, bookableOnly, searchParams, syncUrl]);

  // Handle GPS location request
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState("denied");
      return;
    }

    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        void setBrowseLocation(coords.latitude, coords.longitude);
        setSort("near");
        setLocationState("idle");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  // Compute live distances from client coordinates
  const itemsWithDistance = useMemo(() => {
    return services.map((s) => {
      const liveDist =
        position && s.pharmacy?.latitude != null && s.pharmacy?.longitude != null
          ? distanceKm(
              { latitude: position.lat, longitude: position.lng },
              { latitude: s.pharmacy.latitude, longitude: s.pharmacy.longitude },
            )
          : s.distanceKm ?? null;

      return {
        ...s,
        calculatedDistance: liveDist,
      };
    });
  }, [services, position]);

  // Filter items
  const filtered = useMemo(() => {
    const qLower = query.trim().toLowerCase();

    return itemsWithDistance.filter((item) => {
      // Bookable filter
      if (bookableOnly && !item.bookable) return false;

      // Category filter
      if (selectedCategory === "screening") {
        const text = `${item.title} ${item.short} ${item.description}`.toLowerCase();
        if (!text.includes("screen") && !text.includes("check") && !text.includes("test") && !text.includes("pressure") && !text.includes("sugar")) {
          return false;
        }
      }
      if (selectedCategory === "vaccine") {
        const text = `${item.title} ${item.short} ${item.description}`.toLowerCase();
        if (!text.includes("vaccin") && !text.includes("immun") && !text.includes("shot") && !text.includes("dose")) {
          return false;
        }
      }
      if (selectedCategory === "consultation") {
        const text = `${item.title} ${item.short} ${item.description}`.toLowerCase();
        if (!text.includes("consult") && !text.includes("counsel") && !text.includes("doctor") && !text.includes("review")) {
          return false;
        }
      }

      // Query filter
      if (qLower) {
        const matchTitle = item.title.toLowerCase().includes(qLower);
        const matchShort = item.short.toLowerCase().includes(qLower);
        const matchDesc = item.description.toLowerCase().includes(qLower);
        const matchPharma = item.pharmacy.name.toLowerCase().includes(qLower);
        const matchCity = (item.pharmacy.city || "").toLowerCase().includes(qLower);
        const matchBenefits = item.benefits?.some((b) => b.toLowerCase().includes(qLower));

        if (!matchTitle && !matchShort && !matchDesc && !matchPharma && !matchCity && !matchBenefits) {
          return false;
        }
      }

      return true;
    });
  }, [itemsWithDistance, query, selectedCategory, bookableOnly]);

  // Sort items
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "near") {
        const distA = a.calculatedDistance ?? Infinity;
        const distB = b.calculatedDistance ?? Infinity;
        if (distA !== distB) return distA - distB;
      }
      if (sort === "price-asc") {
        const priceA = a.price ?? Infinity;
        const priceB = b.price ?? Infinity;
        if (priceA !== priceB) return priceA - priceB;
      }
      if (sort === "price-desc") {
        const priceA = a.price ?? -1;
        const priceB = b.price ?? -1;
        if (priceA !== priceB) return priceB - priceA;
      }
      if (sort === "bookable") {
        if (a.bookable !== b.bookable) return a.bookable ? -1 : 1;
      }
      if (sort === "name") {
        return a.title.localeCompare(b.title);
      }
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [filtered, sort]);

  // Radar blips mapping
  const radarItems: RadarItem[] = useMemo(() => {
    return sorted.map((s) => ({
      id: s.id,
      name: s.title,
      type: "service" as const,
      latitude: s.pharmacy.latitude ?? null,
      longitude: s.pharmacy.longitude ?? null,
      distanceKm: s.calculatedDistance,
      detail: `${s.pharmacy.name}${s.pharmacy.city ? ` · ${s.pharmacy.city}` : ""}`,
      subDetail: s.short,
      price: s.price,
      phone: s.pharmacy.phone,
      whatsapp: s.pharmacy.whatsapp,
      actionLabel: s.bookable ? "Book Online" : "View Service",
      badge: s.bookable ? "Bookable" : "Enquire",
      href: s.href,
    }));
  }, [sorted]);

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setBookableOnly(false);
    syncUrl("", false);
  };

  return (
    <div id="services-directory" className="scroll-mt-28 text-[var(--foreground)]">
      {/* Compact search & proximity control toolbar */}
      <div className="glass-panel rounded-[24px] border !border-[var(--service-ui-border)] p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Live Search Input */}
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search screenings, vaccinations, consultations or area…"
              aria-label="Search clinical services"
              className="h-[46px] w-full rounded-2xl border border-[var(--service-ui-border)] bg-[var(--card-elev)] pl-10 pr-9 text-xs sm:text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-4 focus:ring-teal-500/10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>

          {/* Location & View Mode Switcher */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationState === "loading"}
              className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-[var(--brand)] px-3 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-100 disabled:border disabled:border-[var(--service-ui-border)] disabled:bg-[color-mix(in_srgb,var(--foreground)_10%,var(--card))] disabled:text-[var(--foreground)]"
            >
              <LocateFixed className="h-3.5 w-3.5" aria-hidden />
              <span>
                {locationState === "loading"
                  ? "Locating…"
                  : position
                    ? "Nearby"
                    : "Near me"}
              </span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex h-[46px] items-center rounded-2xl border border-[var(--service-ui-border)] bg-[var(--card)] p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`inline-flex h-full items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition ${
                  viewMode === "grid"
                    ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("radar")}
                aria-label="Radar view"
                className={`inline-flex h-full items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition ${
                  viewMode === "radar"
                    ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />
                <span className="hidden sm:inline">Radar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick category and booking filter pills (1-tap mobile filtering) */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {/* Online Booking Toggle Pill */}
          <button
            type="button"
            onClick={() => setBookableOnly((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border ${
              bookableOnly
                ? "border-emerald-700 bg-emerald-700 text-white shadow-xs"
                : "border-[var(--service-ui-border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <CalendarCheck2 className="h-3 w-3" aria-hidden />
            <span>Online Booking</span>
          </button>

          <div className="h-4 w-px bg-[var(--service-ui-border)] shrink-0 mx-1" />

          {SERVICE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border ${
                  isSelected
                    ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--background)] shadow-xs"
                    : "border-[var(--service-ui-border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-3 w-3" aria-hidden />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active filter badges & Location status */}
        {(query || selectedCategory !== "all" || bookableOnly || position) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--service-ui-border)] pt-2.5">
            {position && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--service-ui-border)] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-deep)]">
                <MapPin className="h-3 w-3" aria-hidden /> Distances live
              </span>
            )}
            {bookableOnly && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/60 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 dark:border-emerald-200/50 dark:text-emerald-200">
                Online booking only
                <button
                  type="button"
                  onClick={() => setBookableOnly(false)}
                  aria-label="Clear bookable filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            )}
            {query && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--service-ui-border)] bg-[var(--brand-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)]">
                Keyword: “{query}”
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Remove keyword filter"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            )}
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--service-ui-border)] bg-[var(--brand-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)]">
                {SERVICE_CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  aria-label="Reset category"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-[10px] font-bold text-[var(--brand)] hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Results Header: Count & Sort */}
      <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6">
        <div>
          <p className="text-base font-bold tracking-tight text-[var(--foreground)]">
            {sorted.length} {sorted.length === 1 ? "care service" : "care services"}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {position ? "Sorted by proximity to your coordinates" : "Verified offerings across network pharmacies"}
          </p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]">
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort services"
              className="h-9 rounded-xl border border-[var(--service-ui-border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="bookable">Bookable First</option>
              <option value="near" disabled={!position}>
                Nearest{position ? "" : " (turn on location)"}
              </option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
      </div>

      {/* Main Content Area: Radar or Grid */}
      {viewMode === "radar" ? (
        <div className="mt-4">
          <CareRadar
            items={radarItems}
            userLocation={position}
            onRequestLocation={requestLocation}
            title="Clinical Care Proximity Radar"
            subtitle="Live spatial scan of pharmacy screenings, diagnostic tests, and clinical appointments."
            defaultType="service"
            hideTypeFilter={true}
          />
        </div>
      ) : sorted.length === 0 ? (
        <div className="care-glass mt-6 rounded-[28px] border border-dashed !border-[var(--service-ui-border)] bg-[var(--card-elev)] p-8 text-center sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <HeartPulse className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="mt-4 text-base font-bold text-[var(--foreground)]">No matching services found</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--muted)]">
            Try adjusting your search terms, selecting “All Care”, or removing active filters.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
          >
            Show all services
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
}: {
  service: NetworkServiceListing & { calculatedDistance?: number | null };
}) {
  const dist = service.calculatedDistance ?? service.distanceKm;

  return (
    <article className="care-glass group flex flex-col overflow-hidden rounded-[24px] border !border-[var(--service-ui-border)] bg-[var(--card-elev)] transition duration-200 hover:-translate-y-0.5 hover:!border-[var(--brand)] shadow-sm">
      {/* Visual Header */}
      <Link href={service.href} className="relative block h-36 w-full overflow-hidden bg-[#07241e] sm:h-40">
        <Image
          src={service.imageUrl || "/images/care/editorial-pharmacy.png"}
          alt={service.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
              service.bookable
                ? "bg-emerald-700/95 text-white"
                : "bg-black/60 text-teal-200"
            }`}
          >
            {service.bookable ? (
              <>
                <CalendarCheck2 className="h-3 w-3" aria-hidden /> Online Booking
              </>
            ) : (
              "Walk-in / Enquire"
            )}
          </span>
        </div>

        {/* Bottom Title in Image */}
        <div className="absolute inset-x-3 bottom-2.5 text-white">
          <h3 className="text-base font-bold leading-tight tracking-tight line-clamp-1">{service.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-teal-50">
            <MapPin className="h-3 w-3 shrink-0 text-amber-300" aria-hidden />
            <span className="truncate">{service.pharmacy.name}</span>
            {dist != null && (
              <span className="font-semibold text-teal-200 shrink-0">
                · {distanceLabel(dist)}
              </span>
            )}
          </p>
        </div>
      </Link>

      {/* Body Content */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">{service.short}</p>

        {/* Benefits bullets */}
        {service.benefits && service.benefits.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {service.benefits.slice(0, 2).map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-1.5 text-[11px] text-[var(--foreground)]">
                <Check className="h-3 w-3 shrink-0 text-teal-700 dark:text-teal-200" aria-hidden />
                <span className="truncate">{benefit}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Footer Actions */}
        <div className="mt-auto pt-3.5 border-t border-[var(--service-ui-border)]">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">Pricing</span>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {service.price != null ? `KES ${formatPrice(service.price)}` : "Ask pharmacy"}
              </p>
            </div>
            {service.duration && (
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-semibold">Duration</span>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]">
                  <Clock3 className="h-3 w-3" aria-hidden />
                  <span>{service.duration}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href={service.href}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[var(--background)] shadow-xs transition hover:brightness-95"
            >
              <span>{service.bookable ? "Book Appointment" : "View Details"}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Link
              href={`/pharmacies/${service.pharmacy.slug}`}
              aria-label={`View ${service.pharmacy.name}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--service-ui-border)] text-[var(--brand-deep)] hover:bg-[var(--brand-tint)]"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
