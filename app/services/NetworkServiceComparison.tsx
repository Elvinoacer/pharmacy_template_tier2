"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  LayoutGrid,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  PhoneCall,
  Radio,
  Sparkles,
  Store,
} from "lucide-react";
import CareRadar, { type RadarItem } from "@/app/components/radar/CareRadar";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import { setBrowseLocation } from "@/app/actions/browse-location";
import { formatPrice } from "@/app/lib/format";
import type { NetworkServiceListing } from "@/app/lib/services/network-catalog";

type Props = {
  services: NetworkServiceListing[];
  serviceTitle: string;
  userLocation: { latitude: number; longitude: number } | null;
};

export default function NetworkServiceComparison({
  services,
  serviceTitle,
  userLocation,
}: Props) {
  const [viewMode, setViewMode] = useState<"list" | "radar">("list");
  const [filterBookable, setFilterBookable] = useState(false);
  const [sort, setSort] = useState<"near" | "price-asc" | "price-desc" | "bookable" | "name">(
    userLocation ? "near" : "bookable",
  );
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
  );
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied">("idle");

  // GPS location detection
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

  // Compute live distances dynamically
  const servicesWithDistance = useMemo(() => {
    return services.map((item) => {
      const liveDist =
        position && item.pharmacy?.latitude != null && item.pharmacy?.longitude != null
          ? distanceKm(
              { latitude: position.lat, longitude: position.lng },
              { latitude: item.pharmacy.latitude, longitude: item.pharmacy.longitude },
            )
          : item.distanceKm ?? null;

      return {
        ...item,
        calculatedDistance: liveDist,
      };
    });
  }, [services, position]);

  // Find lowest price
  const lowestPrice = useMemo(() => {
    const prices = servicesWithDistance
      .map((s) => s.price)
      .filter((p): p is number => p != null && p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [servicesWithDistance]);

  // Find nearest distance
  const nearestDistance = useMemo(() => {
    const dists = servicesWithDistance
      .map((s) => s.calculatedDistance)
      .filter((d): d is number => d != null && d > 0);
    return dists.length > 0 ? Math.min(...dists) : null;
  }, [servicesWithDistance]);

  // Filter listings
  const filtered = useMemo(() => {
    if (!filterBookable) return servicesWithDistance;
    return servicesWithDistance.filter((item) => item.bookable);
  }, [servicesWithDistance, filterBookable]);

  // Sort listings
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
        return a.pharmacy.name.localeCompare(b.pharmacy.name);
      }
      return 0;
    });
  }, [filtered, sort]);

  // Radar items mapping
  const radarItems: RadarItem[] = useMemo(() => {
    return sorted.map((item) => ({
      id: item.id,
      name: item.pharmacy.name,
      type: "service" as const,
      latitude: item.pharmacy.latitude ?? null,
      longitude: item.pharmacy.longitude ?? null,
      distanceKm: item.calculatedDistance,
      detail: `${serviceTitle} · ${item.price != null ? `KES ${formatPrice(item.price)}` : "Enquire for price"}`,
      subDetail: `${item.duration || "Appointment"} · ${[item.pharmacy.city, item.pharmacy.county].filter(Boolean).join(", ")}`,
      price: item.price,
      phone: item.pharmacy.phone,
      whatsapp: item.pharmacy.whatsapp,
      actionLabel: item.bookable ? "Book Appointment" : "Enquire / Details",
      badge: item.bookable ? "Bookable" : "Walk-in",
      href: item.href,
    }));
  }, [sorted, serviceTitle]);

  return (
    <div className="mt-6">
      {/* Control toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-2)] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Near me button */}
          <button
            type="button"
            onClick={requestLocation}
            disabled={locationState === "loading"}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95 disabled:opacity-60"
          >
            <LocateFixed className="h-3.5 w-3.5" aria-hidden />
            <span>
              {locationState === "loading"
                ? "Locating…"
                : position
                  ? "Nearby calibrated"
                  : "Near me"}
            </span>
          </button>

          {/* Bookable filter button */}
          <button
            type="button"
            onClick={() => setFilterBookable((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition border ${
              filterBookable
                ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                : "border-[var(--line-2)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <CalendarCheck2 className="h-3.5 w-3.5" />
            <span>Bookable Online ({services.filter((s) => s.bookable).length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Sort service providers"
            className="h-9 rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          >
            <option value="bookable">Bookable First</option>
            <option value="near" disabled={!position}>
              Nearest{position ? "" : " (turn on location)"}
            </option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Pharmacy Name A–Z</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex h-9 items-center rounded-xl border border-[var(--line-2)] bg-[var(--card)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex h-full items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List ({filtered.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("radar")}
              className={`inline-flex h-full items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
                viewMode === "radar"
                  ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span className="hidden sm:inline">Proximity Radar</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "radar" ? (
        <div className="mt-5">
          <CareRadar
            items={radarItems}
            userLocation={position}
            onRequestLocation={requestLocation}
            title={`${serviceTitle} Provider Radar`}
            subtitle="Geographic proximity scan of verified pharmacies offering this clinical care service."
            defaultType="service"
            hideTypeFilter={true}
          />
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-8 text-center">
          <CalendarCheck2 className="mx-auto h-6 w-6 text-[var(--brand)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">No pharmacies match your active filter</p>
          <button
            type="button"
            onClick={() => setFilterBookable(false)}
            className="mt-3 text-xs font-bold text-[var(--brand)] hover:underline"
          >
            Show all {services.length} providers
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sorted.map((item) => {
            const location = [item.pharmacy.city, item.pharmacy.county].filter(Boolean).join(", ");
            const isLowestPrice = lowestPrice != null && item.price === lowestPrice;
            const isNearest = nearestDistance != null && item.calculatedDistance === nearestDistance;
            const phoneHref = item.pharmacy.phone ? `tel:${item.pharmacy.phone.replace(/[^\d+]/g, "")}` : null;
            const whatsappHref = item.pharmacy.whatsapp ? `https://wa.me/${item.pharmacy.whatsapp.replace(/\D/g, "")}` : null;

            return (
              <li
                key={item.id}
                className="care-glass relative flex flex-col gap-3 rounded-3xl border border-[var(--line-2)] bg-[var(--card)]/90 p-4 sm:p-5 transition hover:border-[var(--brand)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-base text-[var(--foreground)]">{item.pharmacy.name}</p>
                      {item.bookable && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Online Booking
                        </span>
                      )}
                      {isNearest && (
                        <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                          Nearest
                        </span>
                      )}
                      {isLowestPrice && (
                        <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                          Best Price
                        </span>
                      )}
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{location || "Kenya"}</span>
                      {item.calculatedDistance != null && (
                        <span className="font-semibold text-teal-600 dark:text-teal-400">
                          · {distanceLabel(item.calculatedDistance)}
                        </span>
                      )}
                      {item.duration && (
                        <span className="text-[var(--muted-2)]">
                          · {item.duration}
                        </span>
                      )}
                    </p>

                    <div className="mt-2.5 flex items-baseline gap-3">
                      <span className="text-base font-extrabold text-[var(--foreground)]">
                        {item.price != null ? `KES ${formatPrice(item.price)}` : "Ask about pricing"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {item.pharmacy.latitude != null && item.pharmacy.longitude != null && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.pharmacy.latitude},${item.pharmacy.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line-2)] text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition"
                        title="Get directions"
                        aria-label="Get directions"
                      >
                        <Navigation className="h-4 w-4" />
                      </a>
                    )}

                    {phoneHref && (
                      <a
                        href={phoneHref}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line-2)] text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition"
                        title="Call pharmacy"
                        aria-label="Call pharmacy"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </a>
                    )}

                    {whatsappHref && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line-2)] text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition"
                        title="WhatsApp pharmacy"
                        aria-label="WhatsApp pharmacy"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}

                    <Link
                      href={`/pharmacies/${item.pharmacy.slug}`}
                      className="inline-flex h-10 items-center gap-1 rounded-2xl border border-[var(--line-2)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition"
                    >
                      <Store className="h-3.5 w-3.5" />
                      <span>Pharmacy Profile</span>
                    </Link>

                    <Link
                      href={item.href}
                      className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-[var(--brand)] px-4 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
                    >
                      <span>{item.bookable ? "Book Appointment" : "View Details"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {item.short && (
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{item.short}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
