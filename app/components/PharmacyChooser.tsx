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
      ({ coords }) => { setPosition({ lat: coords.latitude, lng: coords.longitude }); setSort("near"); setLocationState("idle"); },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pharmacies
      .map((p) => ({ ...p, distance: position && p.latitude != null && p.longitude != null ? km(position.lat, position.lng, p.latitude, p.longitude) : null }))
      .filter((p) => !q || [p.name, p.city, p.county, p.country, p.tagline].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sort === "near" && position) return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [pharmacies, position, query, sort]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-[2rem] border border-teal-900/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0d6e5a]">Choose where to go</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0c1a14] sm:text-3xl" style={{ fontFamily: "var(--font-display), serif" }}>Find a pharmacy near you</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#5a6b62]">You choose the pharmacy. We never decide for you.</p>
          </div>
          <button type="button" onClick={useLocation} disabled={locationState === "loading"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0d6e5a] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b5f50] disabled:opacity-60">
            <LocateFixed className="h-4 w-4" />
            {locationState === "loading" ? "Finding you…" : position ? "Location enabled" : "Use my location"}
          </button>
        </div>
        {locationState === "denied" && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Location access was unavailable. You can still search and choose any pharmacy.</p>}
        {position && <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#0b5f50]"><Navigation className="h-3.5 w-3.5" /> Sorted by distance from your location</p>}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pharmacy or area…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-teal-700 focus:bg-white" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as "near" | "name")} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none">
            <option value="near">Nearest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => {
          const place = [p.city, p.county].filter(Boolean).join(", ") || p.country;
          const href = next === "/" ? `/p/${p.slug}` : `/p/${p.slug}${next}`;
          return (
            <Link key={p.id} href={href} className="group overflow-hidden rounded-[1.5rem] border border-teal-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative h-36 overflow-hidden bg-slate-100">
                {p.coverImageUrl ? <img src={p.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full w-full bg-gradient-to-br from-teal-50 to-emerald-100" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white">
                  <div className="min-w-0"><h3 className="truncate text-lg font-semibold">{p.name}</h3><p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/85"><MapPin className="h-3 w-3" />{place}</p></div>
                  {p.logoUrl && <img src={p.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1" />}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                  {p.distance != null && <span className="text-xs font-bold text-[#0b5f50]">{p.distance < 1 ? `${Math.round(p.distance * 1000)} m` : `${p.distance.toFixed(1)} km`} away</span>}
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-slate-500">{p.tagline || `Pharmacy in ${place}`}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-[#0d6e5a]"><span>{next === "/refill" ? "Refill here" : "Choose pharmacy"}</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
              </div>
            </Link>
          );
        })}
      </div>
      {visible.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No pharmacies match your search.</div>}
    </div>
  );
}
