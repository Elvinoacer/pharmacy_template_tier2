"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  MapPin,
  Search,
  ArrowRight,
  ShieldCheck,
  Phone,
  MessageCircle,
  Clock,
  Sparkles,
  Truck,
  Syringe,
  Filter,
  X,
  CheckCircle,
  LayoutGrid,
  Map,
  Compass,
} from "lucide-react";
import type { PublicPharmacy } from "@/app/lib/tenant";

interface LandingDirectorySectionProps {
  pharmacies: PublicPharmacy[];
  initialCity?: string;
  initialQuery?: string;
}

const FALLBACK_COVERS = [
  "/images/gallery/welcoming_retail_floor.webp",
  "/images/gallery/curated_wellness_aisle.webp",
  "/images/gallery/comfortable_waiting_area.webp",
  "/images/gallery/careful_dispensing.webp",
  "/images/gallery/modern_care_tools.webp",
];

const KENYA_COUNTIES = [
  { name: "Nairobi", region: "Central", branches: "8+" },
  { name: "Mombasa", region: "Coast", branches: "3+" },
  { name: "Kisumu", region: "Western / Nyanza", branches: "2+" },
  { name: "Nakuru", region: "Rift Valley", branches: "2+" },
  { name: "Eldoret", region: "North Rift", branches: "1+" },
  { name: "Kiambu", region: "Central", branches: "2+" },
];

export default function LandingDirectorySection({
  pharmacies,
  initialCity = "",
  initialQuery = "",
}: LandingDirectorySectionProps) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [filterOnlyFeatured, setFilterOnlyFeatured] = useState(false);
  const [filterWithDelivery, setFilterWithDelivery] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "regions">("grid");

  // Extract unique cities with counts
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pharmacies) {
      if (p.city) {
        counts[p.city] = (counts[p.city] || 0) + 1;
      }
    }
    return counts;
  }, [pharmacies]);

  const uniqueCities = Object.keys(cityCounts).sort();

  // Filtered pharmacies
  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter((p) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.tagline && p.tagline.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.county && p.county.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesCity = !selectedCity || (p.city && p.city.toLowerCase() === selectedCity.toLowerCase());
      const matchesFeatured = !filterOnlyFeatured || p.featured;

      return matchesSearch && matchesCity && matchesFeatured;
    });
  }, [pharmacies, searchTerm, selectedCity, filterOnlyFeatured]);

  return (
    <section id="pharmacies" className="relative border-t border-teal-900/5 bg-[#f4f7f4] px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0d6e5a]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#0d6e5a]">
              <Building2 className="h-3.5 w-3.5" />
              <span>Accredited Network Explorer</span>
            </div>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Explore Verified Pharmacies
            </h2>
            <p className="mt-2 text-sm text-[#5a6b62] sm:text-base">
              Every premise has undergone PPB licence inspection and maintains cold-chain integrity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-teal-900/10 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "grid"
                    ? "bg-[#0d6e5a] text-white"
                    : "text-[#5a6b62] hover:bg-slate-100"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("regions")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "regions"
                    ? "bg-[#0d6e5a] text-white"
                    : "text-[#5a6b62] hover:bg-slate-100"
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Regional Coverage</span>
              </button>
            </div>

            <Link
              href="/for-pharmacies"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#0d6e5a] hover:underline underline-offset-4"
            >
              <span>List your pharmacy</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Regional Coverage Map View */}
        {viewMode === "regions" && (
          <div className="mt-8 rounded-[2.2rem] border border-teal-900/10 bg-gradient-to-br from-[#061e16] to-[#041510] p-8 text-white shadow-xl sm:p-10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal-300">National Healthcare Rails</p>
                <h3
                  className="text-2xl font-medium text-white mt-1"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Accredited Network Coverage in Kenya
                </h3>
              </div>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                ● Live & Expanding
              </span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {KENYA_COUNTIES.map((county) => (
                <div
                  key={county.name}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-teal-300">{county.region}</span>
                    <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] font-bold text-teal-200">
                      {county.branches} premises
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-semibold text-white">{county.name} County</h4>
                  <p className="mt-1 text-xs text-teal-100/70">
                    Same-day delivery & cold-chain distribution active.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity(county.name);
                      setViewMode("grid");
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white"
                  >
                    <span>Browse {county.name} pharmacies</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Filter Bar */}
        {viewMode === "grid" && (
          <div className="mt-8 rounded-2xl border border-teal-900/10 bg-white p-4 shadow-[0_8px_30px_rgba(8,40,32,0.05)] sm:p-5">
            <div className="grid gap-4 md:grid-cols-12 md:items-center">
              {/* Search Input */}
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by pharmacy name, area, or service..."
                  className="h-11 w-full rounded-xl border border-teal-900/10 bg-[#f8faf9] pl-10 pr-10 text-sm text-[#0c1a14] placeholder:text-[#8a9a92] focus:border-[#0d6e5a] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0d6e5a]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2 md:col-span-6 md:justify-end">
                <button
                  type="button"
                  onClick={() => setFilterOnlyFeatured(!filterOnlyFeatured)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    filterOnlyFeatured
                      ? "border-[#0d6e5a] bg-[#0d6e5a] text-white shadow-sm"
                      : "border-teal-900/10 bg-[#f8faf9] text-[#5a6b62] hover:bg-teal-50"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Featured Partners</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterWithDelivery(!filterWithDelivery)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    filterWithDelivery
                      ? "border-[#0d6e5a] bg-[#0d6e5a] text-white shadow-sm"
                      : "border-teal-900/10 bg-[#f8faf9] text-[#5a6b62] hover:bg-teal-50"
                  }`}
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Same-Day Delivery</span>
                </button>
              </div>
            </div>

            {/* City Category Pills */}
            {uniqueCities.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-[#8a9a92] mr-1">Locations:</span>
                <button
                  type="button"
                  onClick={() => setSelectedCity("")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    !selectedCity
                      ? "bg-[#0d6e5a] text-white shadow-sm"
                      : "bg-[#f0faf6] text-[#084c3f] hover:bg-teal-100"
                  }`}
                >
                  All ({pharmacies.length})
                </button>
                {uniqueCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(selectedCity === city ? "" : city)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selectedCity === city
                        ? "bg-[#0d6e5a] text-white shadow-sm"
                        : "bg-[#f0faf6] text-[#084c3f] hover:bg-teal-100"
                    }`}
                  >
                    {city} ({cityCounts[city]})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Directory Results */}
        {viewMode === "grid" && (
          <>
            {filteredPharmacies.length === 0 ? (
              <div className="mt-8 rounded-[2rem] border border-dashed border-teal-900/20 bg-white p-12 text-center shadow-sm">
                <Building2 className="mx-auto h-12 w-12 text-teal-800/30" />
                <h3
                  className="mt-4 text-xl font-semibold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  No pharmacies found for this search
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5a6b62]">
                  Try clearing filters or search for another neighborhood or county. New pharmacies are verified every week.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCity("");
                      setFilterOnlyFeatured(false);
                    }}
                    className="rounded-full bg-[#0d6e5a] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#084c3f]"
                  >
                    Reset filters
                  </button>
                  <Link
                    href="/for-pharmacies"
                    className="rounded-full border border-teal-900/20 bg-white px-5 py-2 text-xs font-bold text-[#0c1a14] transition hover:bg-slate-50"
                  >
                    Apply as a pharmacy
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPharmacies.map((p, idx) => {
                  const whatsappUrl = p.whatsapp
                    ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hello ${p.name}, I found your pharmacy on the Aether Network and have a prescription inquiry.`
                      )}`
                    : null;

                  const coverImg = p.coverImageUrl || FALLBACK_COVERS[idx % FALLBACK_COVERS.length];

                  return (
                    <div
                      key={p.id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-teal-900/8 bg-white shadow-[0_10px_35px_rgba(8,40,32,0.05)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[#0d6e5a]/30 hover:shadow-[0_24px_60px_rgba(8,40,32,0.12)]"
                    >
                      {/* Pharmacy Card Header Image */}
                      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#0d6e5a] to-[#084c3f]">
                        <Image
                          src={coverImg}
                          alt={p.name}
                          fill
                          className="object-cover transition duration-700 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#041510] via-black/30 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            Open Now
                          </span>
                        </div>

                        <div className="absolute right-3.5 top-3.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#084c3f] shadow-md backdrop-blur">
                            <ShieldCheck className="h-3.5 w-3.5 text-[#0d6e5a]" />
                            {p.featured ? "Featured Partner" : "PPB Verified"}
                          </span>
                        </div>

                        {/* Bottom Location Indicator inside Image */}
                        <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between text-white">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-100 drop-shadow">
                            <MapPin className="h-3.5 w-3.5 text-teal-300" />
                            {[p.city, p.county].filter(Boolean).join(", ") || p.country}
                          </span>
                          <span className="text-[11px] font-medium text-teal-200/90">
                            35 min delivery
                          </span>
                        </div>
                      </div>

                      {/* Body Content */}
                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 font-bold text-[#0d6e5a] shadow-inner text-base">
                            {p.name.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-xl font-semibold text-[#0c1a14] group-hover:text-[#0d6e5a] transition truncate"
                              style={{ fontFamily: "var(--font-display), serif" }}
                            >
                              {p.name}
                            </h3>
                            <p className="text-xs text-[#8a9a92]">
                              Independent licensed dispensary
                            </p>
                          </div>
                        </div>

                        <p className="mt-3.5 line-clamp-2 text-sm leading-relaxed text-[#5a6b62]">
                          {p.tagline || p.description || "Neighbourhood pharmacy accredited on the Aether Healthcare Network."}
                        </p>

                        {/* Service Feature Tags */}
                        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-[#3d4f46]">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#f0faf6] px-2 py-0.5 font-medium text-[#084c3f]">
                            <Clock className="h-3 w-3" />
                            Refills in 60s
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#f0faf6] px-2 py-0.5 font-medium text-[#084c3f]">
                            <Syringe className="h-3 w-3" />
                            Vaccines
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#f0faf6] px-2 py-0.5 font-medium text-[#084c3f]">
                            <Truck className="h-3 w-3" />
                            Doorstep Courier
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 flex items-center gap-2 pt-2">
                          <Link
                            href={`/p/${p.slug}`}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d6e5a] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#084c3f]"
                          >
                            <span>Visit Storefront</span>
                            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                          </Link>

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                              title="Chat with pharmacist on WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4 text-emerald-700" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
