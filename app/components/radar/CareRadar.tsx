"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Crosshair,
  HeartPulse,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  PhoneCall,
  Pill,
  Radio,
  Store,
  X,
} from "lucide-react";
import { distanceLabel } from "@/app/lib/proximity";

export type RadarItem = {
  id: string;
  name: string;
  type: "pharmacy" | "medicine" | "service";
  latitude: number | null;
  longitude: number | null;
  distanceKm?: number | null;
  detail?: string;
  subDetail?: string;
  price?: number | null;
  stock?: number | null;
  phone?: string | null;
  whatsapp?: string | null;
  actionLabel?: string;
  badge?: string;
  href: string;
};

type Props = {
  items: RadarItem[];
  userLocation: { lat: number; lng: number } | null;
  onRequestLocation?: () => void;
  title?: string;
  subtitle?: string;
  defaultType?: "all" | "pharmacy" | "medicine" | "service";
  hideTypeFilter?: boolean;
};

/** Calculate bearing in radians from Point A to Point B */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return Math.atan2(y, x);
}

export default function CareRadar({
  items,
  userLocation,
  onRequestLocation,
  title = "Care Proximity Radar",
  subtitle = "Live geographic scanning of nearby pharmacies, stock listings, and clinical services.",
  defaultType = "all",
  hideTypeFilter = false,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "pharmacy" | "medicine" | "service">(defaultType);
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number | null>(null);

  // Check distinct types
  const distinctTypes = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.type)));
  }, [items]);
  const showTypeSwitcher = !hideTypeFilter && distinctTypes.length > 1;

  // Center coordinate (default to Nairobi CBD if user location not yet permitted)
  const center = userLocation || { lat: -1.286389, lng: 36.817223 };

  // Filter items with coordinates and distance cap
  const validItems = useMemo(() => {
    return items.filter((it) => {
      if (it.latitude == null || it.longitude == null) return false;
      if (showTypeSwitcher && filterType !== "all" && it.type !== filterType) return false;
      if (maxDistanceFilter != null && it.distanceKm != null && it.distanceKm > maxDistanceFilter) return false;
      return true;
    });
  }, [items, showTypeSwitcher, filterType, maxDistanceFilter]);

  // Determine dynamic max range (default to 25 km, minimum 5 km, capped at 100 km)
  const maxRangeKm = useMemo(() => {
    let max = 15;
    for (const item of validItems) {
      if (item.distanceKm != null && item.distanceKm > max) {
        max = item.distanceKm;
      }
    }
    return Math.min(100, Math.max(5, Math.ceil(max / 5) * 5));
  }, [validItems]);

  const rings = [0.25, 0.5, 0.75, 1.0];

  // Map items to 2D radar positions (-1 to 1 normalized)
  const blips = useMemo(() => {
    return validItems.map((item) => {
      const bearing = calculateBearing(
        center.lat,
        center.lng,
        item.latitude!,
        item.longitude!,
      );

      // Distance normalized (capped at 0.95 so blips don't render off-canvas)
      const dist = item.distanceKm ?? 5;
      const normalizedDist = Math.min(0.92, Math.max(0.12, dist / maxRangeKm));

      // x and y in percentage offsets from center (50%, 50%)
      const xPercent = 50 + normalizedDist * 44 * Math.sin(bearing);
      const yPercent = 50 - normalizedDist * 44 * Math.cos(bearing);

      return {
        ...item,
        x: xPercent,
        y: yPercent,
      };
    });
  }, [validItems, center, maxRangeKm]);

  const selectedItem = blips.find((b) => b.id === selectedId) || null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-teal-500/20 bg-[#071d18] p-4 text-white shadow-2xl sm:p-6 lg:p-8">
      {/* Background ambient grid glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />

      {/* Header controls */}
      <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>{title}</span>
          </div>
          <p className="mt-1 max-w-xl text-xs text-teal-100/70">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showTypeSwitcher ? (
            /* Type filters */
            <div className="inline-flex rounded-xl bg-black/30 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  filterType === "all" ? "bg-teal-500 text-black shadow" : "text-teal-200/70 hover:text-white"
                }`}
              >
                All ({items.length})
              </button>
              {distinctTypes.includes("pharmacy") && (
                <button
                  type="button"
                  onClick={() => setFilterType("pharmacy")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    filterType === "pharmacy" ? "bg-emerald-500 text-black shadow" : "text-teal-200/70 hover:text-white"
                  }`}
                >
                  Pharmacies
                </button>
              )}
              {distinctTypes.includes("medicine") && (
                <button
                  type="button"
                  onClick={() => setFilterType("medicine")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    filterType === "medicine" ? "bg-cyan-500 text-black shadow" : "text-teal-200/70 hover:text-white"
                  }`}
                >
                  Medicines
                </button>
              )}
              {distinctTypes.includes("service") && (
                <button
                  type="button"
                  onClick={() => setFilterType("service")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    filterType === "service" ? "bg-amber-400 text-black shadow" : "text-teal-200/70 hover:text-white"
                  }`}
                >
                  Services
                </button>
              )}
            </div>
          ) : (
            /* Quick range filters */
            <div className="inline-flex rounded-xl bg-black/30 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setMaxDistanceFilter(null)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  maxDistanceFilter === null ? "bg-teal-500 text-black shadow" : "text-teal-200/70 hover:text-white"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setMaxDistanceFilter(10)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  maxDistanceFilter === 10 ? "bg-teal-500 text-black shadow" : "text-teal-200/70 hover:text-white"
                }`}
              >
                ≤ 10 km
              </button>
              <button
                type="button"
                onClick={() => setMaxDistanceFilter(25)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  maxDistanceFilter === 25 ? "bg-teal-500 text-black shadow" : "text-teal-200/70 hover:text-white"
                }`}
              >
                ≤ 25 km
              </button>
            </div>
          )}

          {!userLocation && onRequestLocation && (
            <button
              type="button"
              onClick={onRequestLocation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/40 bg-teal-500/10 px-3 py-1.5 text-xs font-bold text-teal-300 transition hover:bg-teal-500/20"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              <span>Near me</span>
            </button>
          )}
        </div>
      </div>

      {/* Radar Canvas Area */}
      <div className="relative mx-auto aspect-square w-full max-w-[340px] select-none rounded-full border border-teal-500/30 bg-radial from-[#0d3b32]/40 via-[#07241e]/80 to-[#041511] p-3 shadow-inner sm:max-w-[440px] md:max-w-[480px]">
        {/* Concentric rings */}
        {rings.map((factor, idx) => {
          const ringKm = Math.round(maxRangeKm * factor);
          return (
            <div
              key={factor}
              className="pointer-events-none absolute inset-0 m-auto rounded-full border border-teal-500/20"
              style={{
                width: `${factor * 88}%`,
                height: `${factor * 88}%`,
              }}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-[#071d18] px-1 text-[9px] font-mono text-teal-400/75">
                {ringKm} km
              </span>
            </div>
          );
        })}

        {/* Crosshair lines */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-teal-500/15" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-teal-500/15" />

        {/* Cardinal Directions */}
        <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-bold text-teal-400">N</span>
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-teal-400/70">S</span>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-teal-400/70">E</span>
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-teal-400/70">W</span>

        {/* Sweeping Radar Beam Animation */}
        <div
          className="pointer-events-none absolute inset-0 origin-center animate-[spin_6s_linear_infinite] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 315deg, rgba(45, 212, 191, 0.15) 350deg, rgba(45, 212, 191, 0.4) 360deg)",
          }}
        />

        {/* Center Beacon (User Location) */}
        <div className="absolute inset-0 m-auto flex h-6 w-6 items-center justify-center">
          <span className="animate-radar-ring absolute h-10 w-10 rounded-full bg-teal-400/40" />
          <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-teal-400 shadow-[0_0_12px_#2dd4bf]">
            <Crosshair className="h-2.5 w-2.5 text-black" />
          </div>
        </div>

        {/* Radar Blips with generous touch target */}
        {blips.map((blip) => {
          const isSelected = blip.id === selectedId;
          const toneColor =
            blip.type === "pharmacy"
              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
              : blip.type === "medicine"
                ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                : "bg-amber-400 shadow-[0_0_8px_#fbbf24]";

          return (
            <button
              key={blip.id}
              type="button"
              onClick={() => setSelectedId(isSelected ? null : blip.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center focus:outline-none touch-manipulation"
              style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
              aria-label={`${blip.name}, ${blip.distanceKm ? distanceLabel(blip.distanceKm) : "nearby"}`}
            >
              {/* Radar ping ring when selected */}
              {isSelected && (
                <span className="animate-radar-ring absolute inset-0 rounded-full bg-white/50" />
              )}

              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full transition-transform duration-200 ${toneColor} ${
                  isSelected ? "scale-150 ring-2 ring-white" : "group-hover:scale-125"
                }`}
              >
                {blip.type === "pharmacy" && <Store className="h-2.5 w-2.5 text-black" />}
                {blip.type === "medicine" && <Pill className="h-2.5 w-2.5 text-black" />}
                {blip.type === "service" && <HeartPulse className="h-2.5 w-2.5 text-black" />}
              </div>

              {/* Mini floating label on hover/select */}
              <span
                className={`pointer-events-none absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur transition-opacity ${
                  isSelected ? "opacity-100 ring-1 ring-teal-400" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {blip.name.slice(0, 18)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontal contact chips for fast mobile touch switching */}
      {blips.length > 0 && (
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1.5 text-xs">
          {blips.map((blip) => {
            const isSelected = blip.id === selectedId;
            return (
              <button
                key={`chip-${blip.id}`}
                type="button"
                onClick={() => setSelectedId(isSelected ? null : blip.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-left transition border ${
                  isSelected
                    ? "bg-teal-500/20 border-teal-400 text-white ring-1 ring-teal-400 shadow-sm"
                    : "bg-black/30 border-white/10 text-teal-100/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    blip.type === "pharmacy"
                      ? "bg-emerald-400"
                      : blip.type === "medicine"
                        ? "bg-cyan-400"
                        : "bg-amber-400"
                  }`}
                />
                <span className="font-semibold text-[11px] truncate max-w-[130px]">{blip.name}</span>
                {blip.distanceKm != null && (
                  <span className="text-[10px] font-mono text-teal-300">
                    {distanceLabel(blip.distanceKm)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty fallback when filtered out */}
      {blips.length === 0 && (
        <div className="mt-4 rounded-xl border border-teal-500/20 bg-black/40 p-4 text-center text-xs text-teal-200/70">
          <p>No locations match the selected distance or type filter.</p>
          {(maxDistanceFilter !== null || filterType !== "all") && (
            <button
              type="button"
              onClick={() => {
                setMaxDistanceFilter(null);
                setFilterType("all");
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-teal-400/40 bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200 hover:bg-teal-500/30"
            >
              Reset filters & show all
            </button>
          )}
        </div>
      )}

      {/* Selected Item Card / Info Sheet */}
      {selectedItem ? (
        <div className="relative mt-4 rounded-2xl border border-teal-400/30 bg-[#0a2923] p-4 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  selectedItem.type === "pharmacy"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : selectedItem.type === "medicine"
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {selectedItem.type === "pharmacy" && <Store className="h-5 w-5" />}
                {selectedItem.type === "medicine" && <Pill className="h-5 w-5" />}
                {selectedItem.type === "service" && <HeartPulse className="h-5 w-5" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-200">
                    {selectedItem.type}
                  </span>
                  {selectedItem.distanceKm != null && (
                    <span className="text-xs font-bold text-teal-300">
                      {distanceLabel(selectedItem.distanceKm)}
                    </span>
                  )}
                  {selectedItem.badge && (
                    <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[9px] font-semibold text-teal-200">
                      {selectedItem.badge}
                    </span>
                  )}
                </div>

                <h4 className="mt-1 text-base font-bold text-white">{selectedItem.name}</h4>
                {selectedItem.detail && (
                  <p className="text-xs text-teal-100/75">{selectedItem.detail}</p>
                )}
                {selectedItem.subDetail && (
                  <p className="text-[11px] text-teal-200/60">{selectedItem.subDetail}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-lg p-1 text-teal-200/60 hover:bg-white/10 hover:text-white"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div>
              {selectedItem.price != null && (
                <span className="text-sm font-bold text-emerald-300">
                  KES {selectedItem.price.toLocaleString("en-KE")}
                </span>
              )}
              {selectedItem.stock != null && (
                <span className="ml-2 text-xs text-teal-200/70">
                  ({selectedItem.stock} in stock)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedItem.phone && (
                <a
                  href={`tel:${selectedItem.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-teal-200 hover:bg-white/15"
                  aria-label="Call"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                </a>
              )}
              {selectedItem.whatsapp && (
                <a
                  href={`https://wa.me/${selectedItem.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-teal-200 hover:bg-white/15"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              )}
              {selectedItem.latitude != null && selectedItem.longitude != null && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.latitude},${selectedItem.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-teal-200 hover:bg-white/15"
                  aria-label="Directions"
                >
                  <Navigation className="h-3.5 w-3.5" />
                </a>
              )}

              <Link
                href={selectedItem.href}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-1.5 text-xs font-bold text-black shadow transition hover:bg-teal-400"
              >
                <span>
                  {selectedItem.actionLabel ||
                    (selectedItem.type === "service"
                      ? "Book Service"
                      : selectedItem.type === "medicine"
                        ? "Reserve / Order"
                        : "Visit Storefront")}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between text-xs text-teal-200/60">
          <p className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-teal-400" />
            <span>Tap any blip or contact below to inspect distance, directions, and action options.</span>
          </p>
          <span className="font-mono text-[11px] text-teal-300">
            {blips.length} contact{blips.length === 1 ? "" : "s"} locked
          </span>
        </div>
      )}
    </div>
  );
}
