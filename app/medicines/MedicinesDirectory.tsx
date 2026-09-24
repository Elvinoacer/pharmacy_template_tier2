"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ListingChrome from "@/app/components/listing/ListingChrome";
import {
  Aisle,
  EmptyShelf,
  MedicineFeature,
  MedicineTile,
  joinMeta,
  shelfPrice,
} from "@/app/components/listing/pieces";
import styles from "@/app/components/listing/listing.module.css";
import CareRadar, { type RadarItem } from "@/app/components/radar/CareRadar";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import { setBrowseLocation } from "@/app/actions/browse-location";
import type { NetworkCategoryOption, NetworkMedicineListing } from "@/app/lib/services/network-catalog";

type Props = {
  initialItems: NetworkMedicineListing[];
  categories: NetworkCategoryOption[];
  total: number;
  initialQuery: string;
  initialCategory: string;
  initialInStock: boolean;
  initialLocation?: { latitude: number; longitude: number } | null;
};

type Medicine = NetworkMedicineListing & { calculatedDistance?: number | null };

function categoryName(slug: string, categories: NetworkCategoryOption[]) {
  return categories.find((category) => category.slug === slug)?.name || slug.replace(/[-_]+/g, " ");
}

function medicineMeta(item: Medicine) {
  const distance = item.calculatedDistance ?? item.distanceKm;
  return joinMeta([
    item.availableStock > 0 ? (item.overTheCounter ? "No prescription" : "Prescription") : "Out of stock",
    item.pharmacy.name,
    distance != null ? distanceLabel(distance) : null,
  ]);
}

function medicineTrust(item: Medicine) {
  if (item.availableStock <= 0) return "Out of stock at this pharmacy right now.";
  if (item.overTheCounter) return "No prescription. Reserve it and pick it up.";
  return "A pharmacist reviews this before it is dispensed.";
}

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
  const [viewMode, setViewMode] = useState<"shelf" | "radar">("shelf");

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
    if (currentQ === query.trim() && currentCat === selectedCategory && currentInStock === inStockOnly) return;
    const timer = window.setTimeout(() => syncUrl(query, selectedCategory, inStockOnly), 350);
    return () => window.clearTimeout(timer);
  }, [query, selectedCategory, inStockOnly, searchParams, syncUrl]);

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

  const itemsWithDistance = useMemo(() => {
    return initialItems.map((item) => {
      const liveDist =
        position && item.pharmacy?.latitude != null && item.pharmacy?.longitude != null
          ? distanceKm(
              { latitude: position.lat, longitude: position.lng },
              { latitude: item.pharmacy.latitude, longitude: item.pharmacy.longitude },
            )
          : item.distanceKm ?? null;
      return { ...item, calculatedDistance: liveDist };
    });
  }, [initialItems, position]);

  const filtered = useMemo(() => {
    const qLower = query.trim().toLowerCase();
    return itemsWithDistance.filter((item) => {
      if (inStockOnly && item.availableStock <= 0) return false;
      if (rxRequirement === "otc" && !item.overTheCounter) return false;
      if (rxRequirement === "rx" && !item.prescriptionRequired) return false;
      if (selectedCategory && item.medicationMaster.category !== selectedCategory) return false;
      if (qLower) {
        const master = item.medicationMaster;
        const matchName = master.name.toLowerCase().includes(qLower);
        const matchDesc = (master.description || "").toLowerCase().includes(qLower);
        const matchCat = master.category.toLowerCase().includes(qLower);
        const matchPharma = item.pharmacy.name.toLowerCase().includes(qLower);
        const matchCity = (item.pharmacy.city || "").toLowerCase().includes(qLower);
        if (!matchName && !matchDesc && !matchCat && !matchPharma && !matchCity) return false;
      }
      return true;
    });
  }, [itemsWithDistance, query, inStockOnly, rxRequirement, selectedCategory]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === "near") {
        const distA = a.calculatedDistance ?? Infinity;
        const distB = b.calculatedDistance ?? Infinity;
        if (distA !== distB) return distA - distB;
      }
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "stock" && a.availableStock !== b.availableStock) return b.availableStock - a.availableStock;
      if (sort === "name") return a.medicationMaster.name.localeCompare(b.medicationMaster.name);
      return 0;
    });
  }, [filtered, sort]);

  const shelf = useMemo(() => {
    const browsing = !query.trim() && !selectedCategory && rxRequirement === "all" && inStockOnly && sorted.length >= 4;
    if (!browsing) return null;
    const groups = new Map<string, Medicine[]>();
    for (const item of sorted.slice(1)) {
      const key = item.medicationMaster.category || "general";
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    const grouped = [...groups.entries()]
      .map(([slug, items]) => ({ slug, name: categoryName(slug, categories), items }))
      .sort((a, b) => b.items.length - a.items.length);
    const shelves = grouped.filter((group) => group.items.length >= 2);
    if (!shelves.length) return null;
    return {
      lead: sorted[0],
      shelves,
      loose: grouped.filter((group) => group.items.length < 2).flatMap((group) => group.items),
    };
  }, [sorted, query, selectedCategory, rxRequirement, inStockOnly, categories]);

  const radarItems: RadarItem[] = useMemo(
    () =>
      sorted.map((item) => ({
        id: item.id,
        name: item.medicationMaster.name,
        type: "medicine" as const,
        latitude: item.pharmacy.latitude ?? null,
        longitude: item.pharmacy.longitude ?? null,
        distanceKm: item.calculatedDistance,
        detail: `${item.pharmacy.name}${item.pharmacy.city ? ` · ${item.pharmacy.city}` : ""}`,
        subDetail: item.overTheCounter ? "OTC · No prescription needed" : "Prescription required for dispensing",
        price: item.price,
        stock: item.availableStock,
        actionLabel: item.prescriptionRequired ? "Review & Order" : "Reserve / Order",
        badge: item.overTheCounter ? "OTC" : "Rx",
        href: item.href,
      })),
    [sorted],
  );

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("");
    setInStockOnly(true);
    setRxRequirement("all");
    syncUrl("", "", true);
  };

  const tuneCount = [selectedCategory ? 1 : 0, !inStockOnly ? 1 : 0, rxRequirement !== "all" ? 1 : 0].reduce((a, b) => a + b, 0);
  const summary = [!inStockOnly ? "Including out of stock" : null, locationState === "denied" ? "Location is off" : null]
    .filter(Boolean)
    .join(" · ");

  const feature = (item: Medicine, priority = false) => (
    <MedicineFeature
      href={item.href}
      compareHref={`/medicines/${item.medicationMaster.slug || item.slug}`}
      name={item.medicationMaster.name}
      imageUrl={item.medicationMaster.imageUrl}
      category={item.medicationMaster.category}
      kicker={categoryName(item.medicationMaster.category, categories)}
      trust={medicineTrust(item)}
      priceLabel={item.availableStock > 0 ? shelfPrice(item.price, false) : "Out of stock"}
      meta={medicineMeta(item)}
      priority={priority}
    />
  );

  return (
    <div id="medicines-directory" className="scroll-mt-28">
      <ListingChrome
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search medicines"
        searchPlaceholder="Name, pharmacy, or town"
        chips={[
          {
            id: "all",
            label: "All",
            pressed: !selectedCategory && rxRequirement === "all" && inStockOnly,
            onSelect: () => {
              setSelectedCategory("");
              setRxRequirement("all");
              setInStockOnly(true);
            },
          },
          {
            id: "otc",
            label: "No Rx",
            pressed: rxRequirement === "otc",
            onSelect: () => setRxRequirement((prev) => (prev === "otc" ? "all" : "otc")),
          },
          ...categories.map((category) => ({
            id: category.slug,
            label: category.name,
            pressed: selectedCategory === category.slug,
            onSelect: () => setSelectedCategory((prev) => (prev === category.slug ? "" : category.slug)),
          })),
        ]}
        count={sorted.length}
        countLabel={`${sorted.length} ${sorted.length === 1 ? "medicine" : "medicines"}`}
        sortValue={sort}
        sortOptions={[
          { value: "stock", label: "In stock first" },
          { value: "near", label: position ? "Nearest" : "Nearest (turn on location)", disabled: !position },
          { value: "price-asc", label: "Price, low to high" },
          { value: "price-desc", label: "Price, high to low" },
          { value: "name", label: "Name A–Z" },
        ]}
        onSort={(value) => setSort(value as typeof sort)}
        toggles={[
          { id: "stock", label: "In stock only", pressed: inStockOnly, onToggle: () => setInStockOnly((value) => !value) },
          {
            id: "rx",
            label: "Prescription",
            pressed: rxRequirement === "rx",
            onToggle: () => setRxRequirement((prev) => (prev === "rx" ? "all" : "rx")),
          },
        ]}
        near={{
          label: locationState === "loading" ? "Finding you…" : position ? "Update my location" : "Use my location",
          busy: locationState === "loading",
          onClick: requestLocation,
        }}
        radar={{ on: viewMode === "radar", onChange: (on) => setViewMode(on ? "radar" : "shelf") }}
        tuneCount={tuneCount}
        summary={summary || null}
        onClear={resetFilters}
      />

      {viewMode === "radar" ? (
        <>
          <div className={styles.back}>
            <button type="button" className={styles.textLink} onClick={() => setViewMode("shelf")}>
              Back to the shelf
            </button>
          </div>
          <CareRadar
            items={radarItems}
            userLocation={position}
            onRequestLocation={requestLocation}
            title="Medicine stock nearby"
            subtitle="Pharmacies holding these medicines, placed by distance."
            defaultType="medicine"
            hideTypeFilter
          />
        </>
      ) : sorted.length === 0 ? (
        <EmptyShelf title="Nothing on the shelf matches">
          <p>Try another name, or clear the refine and look through the shelf again.</p>
          <div className={styles.emptyActions}>
            <button type="button" className={styles.primary} onClick={resetFilters}>
              Clear
            </button>
            <Link href="/prescription" className={styles.ghost}>
              Prescription
            </Link>
          </div>
        </EmptyShelf>
      ) : shelf ? (
        <>
          {feature(shelf.lead, true)}
          {shelf.shelves.map((aisle) => (
            <Aisle
              key={aisle.slug}
              title={aisle.name}
              aside={
                aisle.items.length > 8 ? (
                  <button type="button" className={styles.textLink} onClick={() => setSelectedCategory(aisle.slug)}>
                    All {aisle.items.length}
                  </button>
                ) : (
                  <span className={styles.aisleCount}>{aisle.items.length}</span>
                )
              }
            >
              <div className={styles.rail}>
                {aisle.items.slice(0, 8).map((item) => (
                  <MedicineTile
                    key={item.id}
                    href={item.href}
                    name={item.medicationMaster.name}
                    imageUrl={item.medicationMaster.imageUrl}
                    category={item.medicationMaster.category}
                    prescriptionRequired={item.prescriptionRequired}
                    priceLabel={item.availableStock > 0 ? shelfPrice(item.price) : "Out"}
                    meta={medicineMeta(item)}
                  />
                ))}
              </div>
            </Aisle>
          ))}
          {shelf.loose.length > 0 ? (
            <Aisle title="Also on the shelf" aside={<span className={styles.aisleCount}>{shelf.loose.length}</span>}>
              <div className={styles.rail}>
                {shelf.loose.map((item) => (
                  <MedicineTile
                    key={item.id}
                    href={item.href}
                    name={item.medicationMaster.name}
                    imageUrl={item.medicationMaster.imageUrl}
                    category={item.medicationMaster.category}
                    prescriptionRequired={item.prescriptionRequired}
                    priceLabel={item.availableStock > 0 ? shelfPrice(item.price) : "Out"}
                    meta={medicineMeta(item)}
                  />
                ))}
              </div>
            </Aisle>
          ) : null}
        </>
      ) : (
        <div className={styles.mosaic}>
          <div className={styles.span}>{feature(sorted[0], true)}</div>
          {sorted.slice(1).map((item) => (
            <MedicineTile
              key={item.id}
              layout="cell"
              href={item.href}
              name={item.medicationMaster.name}
              imageUrl={item.medicationMaster.imageUrl}
              category={item.medicationMaster.category}
              prescriptionRequired={item.prescriptionRequired}
              priceLabel={item.availableStock > 0 ? shelfPrice(item.price) : "Out"}
              meta={medicineMeta(item)}
            />
          ))}
        </div>
      )}

      {sorted.length > 0 ? (
        <p className={styles.footnote}>
          Prices are each pharmacy’s own. Prescription items are checked before they leave the counter.
          {total > initialItems.length && !query.trim() ? ` Showing ${initialItems.length} of ${total}. Search to narrow the shelf.` : ""}
        </p>
      ) : null}
    </div>
  );
}
