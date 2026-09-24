"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ListingChrome from "@/app/components/listing/ListingChrome";
import { Aisle, EmptyShelf, ServicePoster, ServiceRow, joinMeta, shelfPrice } from "@/app/components/listing/pieces";
import styles from "@/app/components/listing/listing.module.css";
import CareRadar, { type RadarItem } from "@/app/components/radar/CareRadar";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import { setBrowseLocation } from "@/app/actions/browse-location";
import type { NetworkServiceListing } from "@/app/lib/services/network-catalog";

type Props = {
  services: NetworkServiceListing[];
  initialQuery: string;
  initialBookable: boolean;
  initialLocation?: { latitude: number; longitude: number } | null;
};

type Service = NetworkServiceListing & { calculatedDistance?: number | null };

const SERVICE_CATEGORIES = [
  { id: "screening", label: "Screenings" },
  { id: "vaccine", label: "Vaccines" },
  { id: "consultation", label: "Visits" },
];

function serviceMeta(service: Service) {
  const distance = service.calculatedDistance ?? service.distanceKm;
  return joinMeta([
    service.pharmacy.name,
    distance != null ? distanceLabel(distance) : null,
    service.duration,
  ]);
}

export default function ServicesDirectory({ services, initialQuery, initialBookable, initialLocation }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [viewMode, setViewMode] = useState<"shelf" | "radar">("shelf");

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
    if (currentQ === query.trim() && currentBookable === bookableOnly) return;
    const timer = window.setTimeout(() => syncUrl(query, bookableOnly), 350);
    return () => window.clearTimeout(timer);
  }, [query, bookableOnly, searchParams, syncUrl]);

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
    return services.map((service) => {
      const liveDist =
        position && service.pharmacy?.latitude != null && service.pharmacy?.longitude != null
          ? distanceKm(
              { latitude: position.lat, longitude: position.lng },
              { latitude: service.pharmacy.latitude, longitude: service.pharmacy.longitude },
            )
          : service.distanceKm ?? null;
      return { ...service, calculatedDistance: liveDist };
    });
  }, [services, position]);

  const filtered = useMemo(() => {
    const qLower = query.trim().toLowerCase();
    return itemsWithDistance.filter((item) => {
      if (bookableOnly && !item.bookable) return false;
      const text = `${item.title} ${item.short} ${item.description}`.toLowerCase();
      if (selectedCategory === "screening" && !/screen|check|test|pressure|sugar/.test(text)) return false;
      if (selectedCategory === "vaccine" && !/vaccin|immun|shot|dose/.test(text)) return false;
      if (selectedCategory === "consultation" && !/consult|counsel|doctor|review/.test(text)) return false;
      if (qLower) {
        const match =
          item.title.toLowerCase().includes(qLower) ||
          item.short.toLowerCase().includes(qLower) ||
          item.description.toLowerCase().includes(qLower) ||
          item.pharmacy.name.toLowerCase().includes(qLower) ||
          (item.pharmacy.city || "").toLowerCase().includes(qLower) ||
          item.benefits?.some((benefit) => benefit.toLowerCase().includes(qLower));
        if (!match) return false;
      }
      return true;
    });
  }, [itemsWithDistance, query, selectedCategory, bookableOnly]);

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
      if (sort === "bookable" && a.bookable !== b.bookable) return a.bookable ? -1 : 1;
      if (sort === "name") return a.title.localeCompare(b.title);
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [filtered, sort]);

  const radarItems: RadarItem[] = useMemo(
    () =>
      sorted.map((service) => ({
        id: service.id,
        name: service.title,
        type: "service" as const,
        latitude: service.pharmacy.latitude ?? null,
        longitude: service.pharmacy.longitude ?? null,
        distanceKm: service.calculatedDistance,
        detail: `${service.pharmacy.name}${service.pharmacy.city ? ` · ${service.pharmacy.city}` : ""}`,
        subDetail: service.short,
        price: service.price,
        phone: service.pharmacy.phone,
        whatsapp: service.pharmacy.whatsapp,
        actionLabel: service.bookable ? "Book Online" : "View Service",
        badge: service.bookable ? "Bookable" : "Enquire",
        href: service.href,
      })),
    [sorted],
  );

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setBookableOnly(false);
    syncUrl("", false);
  };

  const browsing = !query.trim() && selectedCategory === "all" && !bookableOnly;
  const posterTake = sorted.length <= 2 ? sorted.length : Math.min(browsing ? 6 : 3, sorted.length);
  const posters = sorted.slice(0, posterTake);
  const rows = sorted.slice(posterTake);
  const tuneCount = (selectedCategory !== "all" ? 1 : 0) + (bookableOnly ? 1 : 0);
  const summary = locationState === "denied" ? "Location is off" : null;

  return (
    <div id="services-directory" className="scroll-mt-28">
      <ListingChrome
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search care"
        searchPlaceholder="Screening, vaccine, or pharmacy"
        chips={[
          {
            id: "all",
            label: "All",
            pressed: selectedCategory === "all" && !bookableOnly,
            onSelect: () => {
              setSelectedCategory("all");
              setBookableOnly(false);
            },
          },
          {
            id: "book",
            label: "Book",
            pressed: bookableOnly,
            onSelect: () => setBookableOnly((value) => !value),
          },
          ...SERVICE_CATEGORIES.map((category) => ({
            id: category.id,
            label: category.label,
            pressed: selectedCategory === category.id,
            onSelect: () => setSelectedCategory((prev) => (prev === category.id ? "all" : category.id)),
          })),
        ]}
        count={sorted.length}
        countLabel={`${sorted.length} ${sorted.length === 1 ? "service" : "services"}`}
        sortValue={sort}
        sortOptions={[
          { value: "bookable", label: "Bookable first" },
          { value: "near", label: position ? "Nearest" : "Nearest (turn on location)", disabled: !position },
          { value: "price-asc", label: "Price, low to high" },
          { value: "price-desc", label: "Price, high to low" },
          { value: "name", label: "Name A–Z" },
        ]}
        onSort={(value) => setSort(value as typeof sort)}
        toggles={[
          { id: "book", label: "Online booking", pressed: bookableOnly, onToggle: () => setBookableOnly((value) => !value) },
        ]}
        near={{
          label: locationState === "loading" ? "Finding you…" : position ? "Update my location" : "Use my location",
          busy: locationState === "loading",
          onClick: requestLocation,
        }}
        radar={{ on: viewMode === "radar", onChange: (on) => setViewMode(on ? "radar" : "shelf") }}
        tuneCount={tuneCount}
        summary={summary}
        onClear={resetFilters}
      />

      {viewMode === "radar" ? (
        <>
          <div className={styles.back}>
            <button type="button" className={styles.textLink} onClick={() => setViewMode("shelf")}>
              Back to care
            </button>
          </div>
          <CareRadar
            items={radarItems}
            userLocation={position}
            onRequestLocation={requestLocation}
            title="Care nearby"
            subtitle="Screenings, vaccines, and visits placed by distance."
            defaultType="service"
            hideTypeFilter
          />
        </>
      ) : sorted.length === 0 ? (
        <EmptyShelf title="No care matches that">
          <p>Try another word, or clear the refine to see every published service.</p>
          <div className={styles.emptyActions}>
            <button type="button" className={styles.primary} onClick={resetFilters}>
              Show all care
            </button>
          </div>
        </EmptyShelf>
      ) : (
        <>
          <h2 className={styles.sr}>Available now</h2>
          <div className={styles.posterRail}>
            {posters.map((service, index) => (
              <ServicePoster
                key={service.id}
                href={service.href}
                title={service.title}
                imageUrl={service.imageUrl}
                meta={serviceMeta(service)}
                action={`${service.bookable ? "Book" : "View"} · ${shelfPrice(service.price, false)}`}
                priority={index === 0}
              />
            ))}
          </div>
          {rows.length > 0 ? (
            <Aisle title={rows.every((service) => !service.bookable) ? "Walk in or ask" : "More care"}>
              <div className={styles.rows}>
                {rows.map((service) => (
                  <ServiceRow
                    key={service.id}
                    href={service.href}
                    title={service.title}
                    imageUrl={service.imageUrl}
                    meta={serviceMeta(service)}
                    priceLabel={shelfPrice(service.price)}
                  />
                ))}
              </div>
            </Aisle>
          ) : null}
          <p className={styles.footnote}>Bookable visits can be requested online. The pharmacy confirms the time.</p>
        </>
      )}
    </div>
  );
}
