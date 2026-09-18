"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Filter,
  LayoutGrid,
  LocateFixed,
  MapPin,
  PackageCheck,
  PackageSearch,
  Pill,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import CareRadar, { type RadarItem } from "@/app/components/radar/CareRadar";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import { setBrowseLocation } from "@/app/actions/browse-location";
import { formatPrice } from "@/app/lib/format";
import type {
  NetworkCategoryOption,
  NetworkMedicineListing,
} from "@/app/lib/services/network-catalog";

type Props = {
  initialItems: NetworkMedicineListing[];
  categories: NetworkCategoryOption[];
  total: number;
  initialQuery: string;
  initialCategory: string;
  initialInStock: boolean;
  initialLocation?: { latitude: number; longitude: number } | null;
};

export default function MedicinesDirectory({
  initialItems,
  categories,
  total,
  initialQuery,
  initialCategory,
  initialInStock,
  initialLocation,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [inStockOnly, setInStockOnly] = useState<boolean>(initialInStock);
  const [rxRequirement, setRxRequirement] = useState<"all" | "otc" | "rx">("all");
  const [sort, setSort] = useState<"near" | "price-asc" | "price-desc" | "stock" | "name">(
    initialLocation ? "near" : "stock",
  );
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.latitude, lng: initialLocation.longitude } : null,
  );
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied">("idle");
  const [viewMode, setViewMode] = useState<"grid" | "radar">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync URL query state debounced
  const syncUrl = useCallback(
    (qVal: string, catVal: string, inStockVal: boolean) => {
      const params = new URLSearchParams();
      if (qVal.trim()) params.set("q", qVal.trim());
      if (catVal) params.set("category", catVal);
      if (!inStockVal) params.set("stock", "all");
      const qs = params.toString();
      router.replace(qs ? `/medicines?${qs}` : "/medicines", { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    const currentQ = (searchParams.get("q") || "").trim();
    const currentCat = (searchParams.get("category") || "").trim();
    const currentStock = searchParams.get("stock");
    const currentInStock = currentStock !== "all";

    if (
      currentQ === query.trim() &&
      currentCat === selectedCategory &&
      currentInStock === inStockOnly
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      syncUrl(query, selectedCategory, inStockOnly);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, selectedCategory, inStockOnly, searchParams, syncUrl]);

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
    return initialItems.map((item) => {
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
  }, [initialItems, position]);

  // Filter items
  const filtered = useMemo(() => {
    const qLower = query.trim().toLowerCase();

    return itemsWithDistance.filter((item) => {
      // Stock filter
      if (inStockOnly && item.availableStock <= 0) return false;

      // Rx requirement filter
      if (rxRequirement === "otc" && !item.overTheCounter) return false;
      if (rxRequirement === "rx" && !item.prescriptionRequired) return false;

      // Category filter
      if (selectedCategory && item.medicationMaster.category !== selectedCategory) {
        return false;
      }

      // Query filter
      if (qLower) {
        const master = item.medicationMaster;
        const matchName = master.name.toLowerCase().includes(qLower);
        const matchDesc = (master.description || "").toLowerCase().includes(qLower);
        const matchCat = master.category.toLowerCase().includes(qLower);
        const matchPharma = item.pharmacy.name.toLowerCase().includes(qLower);
        const matchCity = (item.pharmacy.city || "").toLowerCase().includes(qLower);

        if (!matchName && !matchDesc && !matchCat && !matchPharma && !matchCity) {
          return false;
        }
      }

      return true;
    });
  }, [itemsWithDistance, query, inStockOnly, rxRequirement, selectedCategory]);

  // Sort items
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
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
        return a.medicationMaster.name.localeCompare(b.medicationMaster.name);
      }
      return 0;
    });
  }, [filtered, sort]);

  // Radar items mapping
  const radarItems: RadarItem[] = useMemo(() => {
    return sorted.map((item) => ({
      id: item.id,
      name: item.medicationMaster.name,
      type: "medicine" as const,
      latitude: item.pharmacy.latitude ?? null,
      longitude: item.pharmacy.longitude ?? null,
      distanceKm: item.calculatedDistance,
      detail: `${item.pharmacy.name}${item.pharmacy.city ? ` · ${item.pharmacy.city}` : ""}`,
      subDetail: item.overTheCounter
        ? "OTC · No prescription needed"
        : "Prescription required for dispensing",
      price: item.price,
      stock: item.availableStock,
      actionLabel: item.prescriptionRequired ? "Review & Order" : "Reserve / Order",
      badge: item.overTheCounter ? "OTC" : "Rx",
      href: item.href,
    }));
  }, [sorted]);

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setInStockOnly(true);
    setRxRequirement("all");
    syncUrl("", "", true);
  };

  const activeFiltersCount = [
    selectedCategory ? 1 : 0,
    !inStockOnly ? 1 : 0,
    rxRequirement !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div id="medicines-directory" className="scroll-mt-28 text-[var(--foreground)]">
      {/* Compact search & proximity control toolbar */}
      <div className="glass-panel rounded-[24px] border border-[var(--line)] p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Live Search Input */}
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-2)]"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medication name, generic, brand, category…"
              aria-label="Search medicines"
              className="h-[46px] w-full rounded-2xl border border-[var(--line)] bg-[var(--card-elev)] pl-10 pr-9 text-xs sm:text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-4 focus:ring-teal-500/10"
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
              className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-2xl bg-[var(--brand)] px-3 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95 disabled:opacity-60"
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

            {/* Mobile Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setShowMobileFilters((v) => !v)}
              className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-2.5 text-xs font-bold text-[var(--brand-deep)] sm:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand)] text-[9px] font-bold text-[var(--background)]">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex h-[46px] items-center rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-1">
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

        {/* Quick Horizontal Filter Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {/* Stock Toggle */}
          <button
            type="button"
            onClick={() => setInStockOnly((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border ${
              inStockOnly
                ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                : "border-[var(--line-2)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <PackageCheck className="h-3 w-3" aria-hidden />
            <span>In Stock Only</span>
          </button>

          {/* Rx / OTC Toggles */}
          <button
            type="button"
            onClick={() => setRxRequirement((prev) => (prev === "otc" ? "all" : "otc"))}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border ${
              rxRequirement === "otc"
                ? "border-cyan-600 bg-cyan-600 text-white shadow-xs"
                : "border-[var(--line-2)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            <span>OTC (No Rx)</span>
          </button>

          <button
            type="button"
            onClick={() => setRxRequirement((prev) => (prev === "rx" ? "all" : "rx"))}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border ${
              rxRequirement === "rx"
                ? "border-amber-600 bg-amber-600 text-white shadow-xs"
                : "border-[var(--line-2)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <FileText className="h-3 w-3" aria-hidden />
            <span>Prescription Required</span>
          </button>

          <div className="h-4 w-px bg-[var(--line-2)] shrink-0 mx-1" />

          {/* All Categories Chip */}
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border ${
              !selectedCategory
                ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--background)] shadow-xs"
                : "border-[var(--line-2)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All Categories
          </button>

          {/* Dynamic Categories */}
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setSelectedCategory((prev) => (prev === c.slug ? "" : c.slug))}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition border ${
                selectedCategory === c.slug
                  ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--background)] shadow-xs"
                  : "border-[var(--line-2)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Mobile Filter Sheet / Dropdown (collapsible) */}
        {showMobileFilters && (
          <div className="mt-3 border-t border-[var(--line)] pt-3 sm:hidden">
            <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active Filters Bar */}
        {(query || selectedCategory || !inStockOnly || rxRequirement !== "all" || position) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2.5">
            {position && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-deep)]">
                <MapPin className="h-3 w-3" aria-hidden /> Distance calibrated
              </span>
            )}
            {query && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)]">
                “{query}”
                <button type="button" onClick={() => setQuery("")} aria-label="Clear keyword">
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)]">
                {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                <button type="button" onClick={() => setSelectedCategory("")} aria-label="Clear category">
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            )}
            {!inStockOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)]">
                Including out of stock
                <button type="button" onClick={() => setInStockOnly(true)} aria-label="Only in stock">
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            )}
            {rxRequirement !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-tint)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand-deep)]">
                {rxRequirement === "otc" ? "OTC Only" : "Prescription Only"}
                <button type="button" onClick={() => setRxRequirement("all")} aria-label="Reset Rx filter">
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

      {/* Results Count & Sort Header */}
      <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6">
        <div>
          <p className="text-base font-bold tracking-tight text-[var(--foreground)]">
            {sorted.length} {sorted.length === 1 ? "medication listing" : "medication listings"}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {position ? "Sorted by nearest pharmacy carrying stock" : "Live catalog with direct pharmacy reservation"}
          </p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]">
            <span className="hidden sm:inline">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort medications"
              className="h-9 rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="stock">In Stock First</option>
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
            title="Medicine Stock Proximity Radar"
            subtitle="Live radar scanning of nearby pharmacies currently holding physical stock."
            defaultType="medicine"
            hideTypeFilter={true}
          />
        </div>
      ) : sorted.length === 0 ? (
        <div className="care-glass mt-6 rounded-[28px] border-dashed p-8 text-center sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <PackageSearch className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="mt-4 text-base font-bold text-[var(--foreground)]">No matching medicines found</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--muted)]">
            Try checking the spelling, selecting all categories, or uploading your prescription for a pharmacist to check back-office supplies.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
            >
              Reset search
            </button>
            <Link
              href="/prescription"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-4 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--card-elev)]"
            >
              Upload prescription
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {sorted.map((item) => (
            <MedicineCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function MedicineCard({
  item,
}: {
  item: NetworkMedicineListing & { calculatedDistance?: number | null };
}) {
  const master = item.medicationMaster;
  const inStock = item.availableStock > 0;
  const dist = item.calculatedDistance ?? item.distanceKm;

  return (
    <article className="care-glass group flex flex-col overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--card)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] shadow-sm">
      {/* Product Image Frame */}
      <Link href={item.href} className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--card-elev)]">
        <Image
          src={master.imageUrl || "/images/care/medicine-still-life.png"}
          alt={master.imageUrl ? master.name : ""}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-3 transition duration-300 group-hover:scale-105"
        />

        {/* Prescription/OTC Pill */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
              item.overTheCounter
                ? "bg-emerald-600/90 text-white"
                : "bg-amber-600/90 text-white"
            }`}
          >
            {item.overTheCounter ? "OTC" : "Rx"}
          </span>
        </div>

        {/* Stock Status Pill */}
        <div className="absolute right-2 bottom-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold backdrop-blur-md ${
              inStock
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
            }`}
          >
            {inStock ? `${item.availableStock} in stock` : "Out of stock"}
          </span>
        </div>
      </Link>

      {/* Body Information */}
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <span className="text-[10px] font-semibold text-[var(--brand)] uppercase tracking-wider truncate">
          {master.category.replace(/-/g, " ")}
        </span>

        <Link href={item.href} className="mt-0.5">
          <h3 className="text-xs sm:text-sm font-bold text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--brand)] transition">
            {master.name}
          </h3>
        </Link>

        {/* Supplying Pharmacy & Distance */}
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--muted)]">
          <Link
            href={`/pharmacies/${item.pharmacy.slug}`}
            className="truncate hover:underline text-[var(--foreground)] font-medium max-w-[110px] sm:max-w-[130px]"
          >
            {item.pharmacy.name}
          </Link>
          {dist != null && (
            <span className="shrink-0 font-bold text-teal-600 dark:text-teal-400">
              {distanceLabel(dist)}
            </span>
          )}
        </div>

        {/* Price & Primary CTA */}
        <div className="mt-auto pt-3 border-t border-[var(--line)]">
          <div className="flex items-baseline justify-between gap-1 mb-2">
            <span className="text-xs sm:text-sm font-black text-[var(--foreground)]">
              KES {formatPrice(item.price)}
            </span>
            <Link
              href={`/medicines/${item.medicationMaster.slug || item.slug}`}
              className="text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--brand)]"
              title="Compare price across all pharmacies"
            >
              Compare ↗
            </Link>
          </div>

          <Link
            href={item.href}
            className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-xl bg-[var(--brand)] px-2 text-[11px] font-bold text-[var(--background)] shadow-xs transition hover:brightness-95"
          >
            <span>{item.prescriptionRequired ? "Review & Order" : "Reserve / Order"}</span>
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
