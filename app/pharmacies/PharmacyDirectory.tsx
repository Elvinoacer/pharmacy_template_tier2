"use client";

import { setBrowseLocation } from "@/app/actions/browse-location";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ListingChrome from "@/app/components/listing/ListingChrome";
import {
  Aisle,
  EmptyShelf,
  PharmacyPlace,
  PharmacyStreet,
  PharmacyWindow,
} from "@/app/components/listing/pieces";
import { joinMeta } from "@/app/lib/listing-format";
import styles from "@/app/components/listing/listing.module.css";
import CareRadar, { type RadarItem } from "@/app/components/radar/CareRadar";
import { distanceKm, distanceLabel } from "@/app/lib/proximity";
import type { DirectoryPharmacy } from "@/app/lib/services/pharmacy-directory";
import { resolvePharmacyCover } from "@/app/lib/media-fallbacks";

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
  initialLocation?: { latitude: number; longitude: number } | null;
};

type Pharmacy = DirectoryPharmacy & { distance: number | null };

function phoneHref(phone: string | null) {
  return phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
}

function whatsappHref(pharmacy: DirectoryPharmacy) {
  if (!pharmacy.whatsapp) return null;
  const text = `Hello ${pharmacy.name}, I found you on the network directory and would like to ask about a medicine or service.`;
  return `https://wa.me/${pharmacy.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function placeMeta(pharmacy: Pharmacy) {
  return joinMeta([
    [pharmacy.city, pharmacy.county].filter(Boolean).join(", ") || pharmacy.country,
    pharmacy.distance != null ? distanceLabel(pharmacy.distance) : null,
    pharmacy.stockCount ? `${pharmacy.stockCount} on the shelf` : null,
    pharmacy.hasDelivery ? "Delivers" : null,
    pharmacy.hasSearchedMedicine ? `${pharmacy.searchedMedicineCount} stock match${pharmacy.searchedMedicineCount === 1 ? "" : "es"}` : null,
  ]);
}

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
  initialLocation,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [county, setCounty] = useState(initialCounty);
  const [category, setCategory] = useState(initialCategory);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [sort, setSort] = useState<"near" | "featured" | "name">(initialLocation ? "near" : "featured");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.latitude, lng: initialLocation.longitude } : null,
  );
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied">("idle");
  const [viewMode, setViewMode] = useState<"shelf" | "radar">("shelf");

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

  useEffect(() => {
    const current = (searchParams.get("q") || "").trim();
    if (current === query.trim()) return;
    const timer = window.setTimeout(() => syncUrl({ q: query }), 350);
    return () => window.clearTimeout(timer);
  }, [query, searchParams, syncUrl]);

  const sorted = useMemo(
    () =>
      pharmacies
        .map((pharmacy) => ({
          ...pharmacy,
          distance:
            position && pharmacy.latitude != null && pharmacy.longitude != null
              ? distanceKm(
                  { latitude: position.lat, longitude: position.lng },
                  { latitude: pharmacy.latitude, longitude: pharmacy.longitude },
                )
              : null,
        }))
        .sort((a, b) => {
          if (sort === "near" && position) return (a.distance ?? Infinity) - (b.distance ?? Infinity);
          if (sort === "name") return a.name.localeCompare(b.name);
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    [pharmacies, position, sort],
  );

  const radarItems: RadarItem[] = useMemo(
    () =>
      sorted.map((pharmacy) => ({
        id: pharmacy.id,
        name: pharmacy.name,
        type: "pharmacy" as const,
        latitude: pharmacy.latitude,
        longitude: pharmacy.longitude,
        distanceKm: pharmacy.distance,
        detail: [pharmacy.city, pharmacy.county].filter(Boolean).join(", "),
        subDetail: pharmacy.services?.slice(0, 2).join(" • ") || (pharmacy.hasDelivery ? "Delivery Available" : undefined),
        phone: pharmacy.phone,
        whatsapp: pharmacy.whatsapp,
        actionLabel: "Visit Storefront",
        badge: pharmacy.hasDelivery ? "Delivery" : undefined,
        href: `/pharmacies/${pharmacy.slug}`,
      })),
    [sorted],
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
        void setBrowseLocation(coords.latitude, coords.longitude);
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

  const shownCategories = categories.slice(0, 8);
  const selectedCategory = categories.find((item) => item.slug === category);
  const chipCategories =
    selectedCategory && !shownCategories.some((item) => item.slug === selectedCategory.slug)
      ? [...shownCategories, selectedCategory]
      : shownCategories;
  const lead = sorted[0];
  const windows = sorted.length > 4 ? sorted.slice(1, 5) : [];
  const street = sorted.length > 4 ? sorted.slice(5) : sorted.slice(1);
  const summary = [
    query.trim() && sorted.some((pharmacy) => pharmacy.hasSearchedMedicine) ? `Stock matches for “${query.trim()}”` : null,
    city || null,
    county || null,
    locationState === "denied" ? "Location is off" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div id="directory" className="scroll-mt-28">
      <ListingChrome
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search pharmacies"
        searchPlaceholder="Pharmacy, medicine, or town"
        openSearch={searchParams.get("focus") === "search"}
        chips={[
          {
            id: "all",
            label: "All",
            pressed: !category && !delivery,
            onSelect: () => {
              setCategory("");
              setDelivery(false);
              syncUrl({ category: "", delivery: false });
            },
          },
          {
            id: "delivery",
            label: "Delivery",
            pressed: delivery,
            onSelect: () => {
              const next = !delivery;
              setDelivery(next);
              syncUrl({ delivery: next });
            },
          },
          ...chipCategories.map((item) => ({
            id: item.slug,
            label: item.name,
            pressed: category === item.slug,
            onSelect: () => {
              const next = category === item.slug ? "" : item.slug;
              setCategory(next);
              syncUrl({ category: next });
            },
          })),
        ]}
        count={sorted.length}
        countLabel={`${sorted.length} ${sorted.length === 1 ? "pharmacy" : "pharmacies"}`}
        sortValue={sort}
        sortOptions={[
          { value: "featured", label: "Recommended" },
          { value: "near", label: position ? "Nearest" : "Nearest (turn on location)", disabled: !position },
          { value: "name", label: "Name A–Z" },
        ]}
        onSort={(value) => setSort(value as typeof sort)}
        fields={[
          {
            id: "city",
            label: "City",
            value: city,
            placeholder: "All cities",
            options: cities.map((value) => ({ value, label: value })),
            onChange: (value) => {
              setCity(value);
              syncUrl({ city: value });
            },
          },
          {
            id: "county",
            label: "County",
            value: county,
            placeholder: "All counties",
            options: counties.map((value) => ({ value, label: value })),
            onChange: (value) => {
              setCounty(value);
              syncUrl({ county: value });
            },
          },
          {
            id: "category",
            label: "Medicine category",
            value: category,
            placeholder: "All categories",
            options: categories.map((item) => ({ value: item.slug, label: item.name })),
            onChange: (value) => {
              setCategory(value);
              syncUrl({ category: value });
            },
          },
        ]}
        near={{
          label: locationState === "loading" ? "Finding you…" : position ? "Update my location" : "Use my location",
          busy: locationState === "loading",
          onClick: requestLocation,
        }}
        radar={{ on: viewMode === "radar", onChange: (on) => setViewMode(on ? "radar" : "shelf") }}
        tuneCount={[city, county, category, delivery ? "delivery" : ""].filter(Boolean).length}
        summary={summary || null}
        onClear={reset}
      />

      {viewMode === "radar" ? (
        <>
          <div className={styles.back}>
            <button type="button" className={styles.textLink} onClick={() => setViewMode("shelf")}>
              Back to pharmacies
            </button>
          </div>
          <CareRadar
            items={radarItems}
            userLocation={position}
            onRequestLocation={requestLocation}
            title="Pharmacies nearby"
            subtitle="Verified pharmacies placed by distance."
          />
        </>
      ) : sorted.length === 0 ? (
        <EmptyShelf title="No pharmacy matches">
          <p>Try a town or a medicine name, or clear the refine.</p>
          <div className={styles.emptyActions}>
            <button type="button" className={styles.primary} onClick={reset}>
              Clear
            </button>
          </div>
        </EmptyShelf>
      ) : (
        <>
          <PharmacyPlace
            href={`/pharmacies/${lead.slug}`}
            name={lead.name}
            imageUrl={resolvePharmacyCover(lead.coverImageUrl, lead.slug || lead.name || 0)}
            imageAlt={lead.coverImageUrl ? lead.name : `${lead.name} pharmacy interior`}
            logoUrl={lead.logoUrl}
            featured={lead.featured}
            meta={placeMeta(lead)}
            priority
            actions={[
              {
                href: query.trim() ? `/p/${lead.slug}/medicines?q=${encodeURIComponent(query.trim())}` : `/p/${lead.slug}/medicines`,
                label: "Medicines",
              },
              ...(phoneHref(lead.phone) ? [{ href: phoneHref(lead.phone)!, label: "Call", external: true }] : []),
              ...(whatsappHref(lead) ? [{ href: whatsappHref(lead)!, label: "WhatsApp", external: true }] : []),
            ]}
          />
          {windows.length > 0 ? (
            <Aisle title="Along the way">
              <div className={styles.windowRail}>
                {windows.map((pharmacy, index) => (
                  <PharmacyWindow
                    key={pharmacy.id}
                    href={`/pharmacies/${pharmacy.slug}`}
                    name={pharmacy.name}
                    imageUrl={resolvePharmacyCover(pharmacy.coverImageUrl, pharmacy.slug || pharmacy.name || index + 1)}
                    imageAlt={pharmacy.coverImageUrl ? pharmacy.name : `${pharmacy.name} pharmacy interior`}
                    meta={placeMeta(pharmacy)}
                  />
                ))}
              </div>
            </Aisle>
          ) : null}
          {street.length > 0 ? (
            <Aisle title={windows.length > 0 ? "More pharmacies" : "Also nearby"}>
              <div className={styles.streetList}>
                {street.map((pharmacy, index) => (
                  <PharmacyStreet
                    key={pharmacy.id}
                    href={`/pharmacies/${pharmacy.slug}`}
                    name={pharmacy.name}
                    imageUrl={resolvePharmacyCover(pharmacy.coverImageUrl, pharmacy.slug || pharmacy.name || index + windows.length + 1)}
                    imageAlt={pharmacy.coverImageUrl ? pharmacy.name : `${pharmacy.name} dispensary`}
                    meta={placeMeta(pharmacy)}
                    callHref={phoneHref(pharmacy.phone)}
                  />
                ))}
              </div>
            </Aisle>
          ) : null}
          <p className={styles.footnote}>
            Verified pharmacies on Afyvia.{" "}
            <Link href="/for-pharmacies" className={styles.textLink}>
              List a pharmacy
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
