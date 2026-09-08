"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, LocateFixed, MapPin, Navigation, Search } from "lucide-react";

export type ChooserPharmacy = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  county: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  featured: boolean;
};

type Props = { pharmacies: ChooserPharmacy[]; next: string };

const km = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default function PharmacyChooser({ pharmacies, next }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"near" | "name">("near");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied">("idle");

  function useLocation() {
    if (!navigator.geolocation) return setLocationState("denied");
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
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pharmacies
      .map((p) => ({
        ...p,
        distance:
          position && p.latitude != null && p.longitude != null
            ? km(position.lat, position.lng, p.latitude, p.longitude)
            : null,
      }))
      .filter((p) => !q || [p.name, p.city, p.county, p.country, p.tagline].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === "near" && position) return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [pharmacies, position, query, sort]);

  return (
    <div className="mx-auto min-w-0 max-w-6xl">
      <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm transition-colors duration-300 sm:rounded-[2rem] sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:tracking-[0.2em]">Choose where to go</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>
              Find a pharmacy near you
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-[var(--muted)] sm:text-sm">You choose the pharmacy. We never decide for you.</p>
          </div>
          <button
            type="button"
            onClick={useLocation}
            disabled={locationState === "loading"}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {locationState === "loading" ? "Finding you…" : position ? "Location enabled" : "Use my location"}
          </button>
        </div>

        {locationState === "denied" && (
          <p className="mt-3 rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3 py-2.5 text-xs leading-5 text-amber-600">
            Location access was unavailable. You can still search and choose any pharmacy.
          </p>
        )}
        {position && (
          <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-[var(--brand)]">
            <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Sorted by distance from your location</span>
          </p>
        )}

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-2)]" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pharmacy or area…"
              className="h-12 w-full min-w-0 rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] pl-10 pr-3 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:bg-[var(--card)] sm:text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "near" | "name")}
            className="h-12 w-full rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-3 text-base font-semibold text-[var(--foreground)] outline-none focus:border-[var(--brand)] sm:w-auto sm:min-w-36 sm:text-sm"
          >
            <option value="near">Nearest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {visible.map((p) => {
          const place = [p.city, p.county].filter(Boolean).join(", ") || p.country;
          const href = next === "/" ? `/p/${p.slug}` : `/p/${p.slug}${next}`;
          return (
            <Link
              key={p.id}
              href={href}
              className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:rounded-[1.5rem]"
            >
              <div className="relative h-32 overflow-hidden bg-[var(--card-elev)] sm:h-36">
                {p.coverImageUrl ? (
                  <img src={p.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full bg-[var(--brand-soft)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex min-w-0 items-end justify-between gap-3 text-white sm:left-4 sm:right-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold sm:text-lg">{p.name}</h3>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-white/85">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{place}</span>
                    </p>
                  </div>
                  {p.logoUrl && <img src={p.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1" />}
                </div>
              </div>

              <div className="min-w-0 p-3.5 sm:p-4">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--brand)]">
                    <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" /> Verified
                  </span>
                  {p.distance != null && (
                    <span className="shrink-0 text-[11px] font-bold text-[var(--brand)] sm:text-xs">
                      {p.distance < 1 ? `${Math.round(p.distance * 1000)} m` : `${p.distance.toFixed(1)} km`} away
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-[var(--muted)]">{p.tagline || `Pharmacy in ${place}`}</p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-sm font-semibold text-[var(--brand)] sm:mt-4">
                  <span>{next === "/refill" ? "Refill here" : "Choose pharmacy"}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)] sm:p-10">
          No pharmacies match your search.
        </div>
      )}
    </div>
  );
}
