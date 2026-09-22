"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LayoutGrid,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  PackageCheck,
  PackageSearch,
  PhoneCall,
  Radio,
  Sparkles,
  Store,
} from "lucide-react";
import CareRadar, { type RadarItem } from "@/app/components/radar/CareRadar";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import { setBrowseLocation } from "@/app/actions/browse-location";
import { formatPrice } from "@/app/lib/format";
import type { NetworkMedicineListing } from "@/app/lib/services/network-catalog";

type Props = {
  listings: NetworkMedicineListing[];
  masterName: string;
  userLocation: { latitude: number; longitude: number } | null;
};

export default function NetworkMedicineComparison({
  listings,
  masterName,
  userLocation,
}: Props) {
  const [viewMode, setViewMode] = useState<"list" | "radar">("list");
  const [filterInStock, setFilterInStock] = useState(false);
  const [sort, setSort] = useState<"near" | "price-asc" | "price-desc" | "stock" | "name">(
    userLocation ? "near" : "stock",
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
  const listingsWithDistance = useMemo(() => {
    return listings.map((item) => {
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
  }, [listings, position]);

  // Find lowest price
  const lowestPrice = useMemo(() => {
    const prices = listingsWithDistance.map((l) => l.price).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [listingsWithDistance]);

  // Find nearest distance
  const nearestDistance = useMemo(() => {
    const dists = listingsWithDistance
      .map((l) => l.calculatedDistance)
      .filter((d): d is number => d != null && d > 0);
    return dists.length > 0 ? Math.min(...dists) : null;
  }, [listingsWithDistance]);

  const filteredListings = useMemo(() => {
    if (!filterInStock) return listingsWithDistance;
    return listingsWithDistance.filter((item) => item.availableStock > 0);
  }, [listingsWithDistance, filterInStock]);

  // Sort listings
  const sorted = useMemo(() => {
    return [...filteredListings].sort((a, b) => {
      if (sort === "near") {
        const distA = a.calculatedDistance ?? Infinity;
        const distB = b.calculatedDistance ?? Infinity;
        if (distA !== distB) return distA - distB;
      }
      if (sort === "price-asc") {
        return a.price - b.price;
      }
      if (sort === "price-desc") {
        return b.price - a.price;
      }
      if (sort === "stock") {
        if (a.availableStock !== b.availableStock) return b.availableStock - a.availableStock;
      }
      if (sort === "name") {
        return a.pharmacy.name.localeCompare(b.pharmacy.name);
      }
      return 0;
    });
  }, [filteredListings, sort]);

  const radarItems: RadarItem[] = useMemo(() => {
    return sorted.map((item) => ({
      id: item.id,
      name: item.pharmacy.name,
      type: "medicine" as const,
      latitude: item.pharmacy.latitude ?? null,
      longitude: item.pharmacy.longitude ?? null,
      distanceKm: item.calculatedDistance,
      detail: `${masterName} · KES ${formatPrice(item.price)}`,
      subDetail: `${item.availableStock} in stock · ${item.pharmacy.city || "Kenya"}`,
      price: item.price,
      stock: item.availableStock,
      phone: item.pharmacy.phone,
      whatsapp: item.pharmacy.whatsapp,
      actionLabel: item.prescriptionRequired ? "Review & Order" : "Reserve with M-Pesa",
      badge: item.price === lowestPrice ? "Best Price" : undefined,
      href: item.href,
    }));
  }, [sorted, masterName, lowestPrice]);

  return (
    <div className="mt-6">
      {/* Toolbar controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--medicine-ui-border)] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Near me button */}
          <button
            type="button"
            onClick={requestLocation}
            disabled={locationState === "loading"}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-100 disabled:border disabled:border-[var(--medicine-ui-border)] disabled:bg-[color-mix(in_srgb,var(--foreground)_10%,var(--card))] disabled:text-[var(--foreground)]"
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

          {/* In Stock toggle button */}
          <button
            type="button"
            onClick={() => setFilterInStock((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition border ${
              filterInStock
                ? "border-emerald-700 bg-emerald-700 text-white shadow-xs"
                : "border-[var(--medicine-ui-border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>In Stock Only ({listings.filter((l) => l.availableStock > 0).length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Sort pharmacy listings"
            className="h-9 rounded-xl border border-[var(--medicine-ui-border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          >
            <option value="stock">In Stock First</option>
            <option value="near" disabled={!position}>
              Nearest{position ? "" : " (turn on location)"}
            </option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Pharmacy Name A–Z</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex h-9 items-center rounded-xl border border-[var(--medicine-ui-border)] bg-[var(--card)] p-0.5">
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
              <span className="hidden sm:inline">Listings ({filteredListings.length})</span>
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
            title={`${masterName} Availability Radar`}
            subtitle="Geographic scanning of verified pharmacies currently carrying physical stock."
            defaultType="medicine"
            hideTypeFilter={true}
          />
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-[var(--medicine-ui-border)] bg-[var(--card)] p-8 text-center">
          <PackageSearch className="mx-auto h-6 w-6 text-[var(--brand)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">No available listings match your filter</p>
          <button
            type="button"
            onClick={() => setFilterInStock(false)}
            className="mt-3 text-xs font-bold text-[var(--brand)] hover:underline"
          >
            Show all {listings.length} listings
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sorted.map((item) => {
            const location = [item.pharmacy.city, item.pharmacy.county].filter(Boolean).join(", ");
            const available = item.availableStock > 0;
            const isLowestPrice = lowestPrice != null && item.price === lowestPrice;
            const isNearest = nearestDistance != null && item.calculatedDistance === nearestDistance;
            const phoneHref = item.pharmacy.phone ? `tel:${item.pharmacy.phone.replace(/[^\d+]/g, "")}` : null;
            const whatsappHref = item.pharmacy.whatsapp ? `https://wa.me/${item.pharmacy.whatsapp.replace(/\D/g, "")}` : null;

            return (
              <li
                key={item.id}
                className="care-glass relative flex flex-col gap-3 rounded-3xl border !border-[var(--medicine-ui-border)] bg-[var(--card-elev)] p-4 shadow-sm transition hover:!border-[var(--brand)] sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Link href={item.href} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--medicine-ui-border)] bg-[var(--card)]" aria-label={`View ${masterName}`}>
                      <Image
                        unoptimized
                        src={item.medicationMaster.imageUrl || "/images/care/medicine-still-life.png"}
                        alt={item.medicationMaster.imageUrl ? item.medicationMaster.name : ""}
                        fill
                        sizes="80px"
                        className={item.medicationMaster.imageUrl ? "object-contain p-2" : "object-cover"}
                      />
                    </Link>
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-base text-[var(--foreground)]">{item.pharmacy.name}</p>
                      {isNearest && (
                        <span className="rounded-full bg-teal-500/15 border border-teal-700/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-800 dark:border-teal-200/50 dark:text-teal-100">
                          Nearest
                        </span>
                      )}
                      {isLowestPrice && (
                        <span className="rounded-full bg-cyan-500/15 border border-cyan-700/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-800 dark:border-cyan-200/50 dark:text-cyan-100">
                          Best Price
                        </span>
                      )}
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <MapPin className="h-3.5 w-3.5 text-amber-700 dark:text-amber-200 shrink-0" />
                      <span>{location || "Kenya"}</span>
                      {item.calculatedDistance != null && (
                        <span className="font-semibold text-teal-700 dark:text-teal-200">
                          · {distanceLabel(item.calculatedDistance)}
                        </span>
                      )}
                    </p>

                    <div className="mt-2.5 flex items-baseline gap-3">
                      <span className="text-base font-extrabold text-[var(--foreground)]">
                        KES {formatPrice(item.price)}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          available ? "text-emerald-800 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200"
                        }`}
                      >
                        {available ? `${item.availableStock} in stock` : "Currently unavailable"}
                      </span>
                    </div>
                  </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {item.pharmacy.latitude != null && item.pharmacy.longitude != null && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.pharmacy.latitude},${item.pharmacy.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--medicine-ui-border)] text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition"
                        title="Get directions"
                        aria-label="Get directions"
                      >
                        <Navigation className="h-4 w-4" />
                      </a>
                    )}

                    {phoneHref && (
                      <a
                        href={phoneHref}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--medicine-ui-border)] text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition"
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
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--medicine-ui-border)] text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition"
                        title="WhatsApp pharmacy"
                        aria-label="WhatsApp pharmacy"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}

                    <Link
                      href={`/pharmacies/${item.pharmacy.slug}`}
                      className="inline-flex h-10 items-center gap-1 rounded-2xl border border-[var(--medicine-ui-border)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition"
                    >
                      <Store className="h-3.5 w-3.5" />
                      <span>Pharmacy Profile</span>
                    </Link>

                    <Link
                      href={item.href}
                      className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-[var(--brand)] px-4 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
                    >
                      {item.prescriptionRequired ? (
                        <>
                          <FileText className="h-3.5 w-3.5" />
                          <span>Review & Order</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Reserve with M-Pesa</span>
                        </>
                      )}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {item.overTheCounter && (
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Over-The-Counter · No prescription needed
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
