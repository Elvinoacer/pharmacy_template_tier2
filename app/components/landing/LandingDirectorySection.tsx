"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { PublicPharmacy } from "@/app/lib/tenant";

interface LandingDirectorySectionProps {
  pharmacies: PublicPharmacy[];
  initialCity?: string;
  initialQuery?: string;
}

export default function LandingDirectorySection({
  pharmacies,
  initialCity = "",
  initialQuery = "",
}: LandingDirectorySectionProps) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [filterOnlyFeatured, setFilterOnlyFeatured] = useState(false);
  const [filterWithDelivery, setFilterWithDelivery] = useState(false);

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
              <span>Accredited Network</span>
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

          <Link
            href="/for-pharmacies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d6e5a] hover:underline underline-offset-4"
          >
            <span>Are you a pharmacy owner? List your branch</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Interactive Filter Bar */}
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
                    ? "border-[#0d6e5a] bg-[#0d6e5a] text-white"
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
                    ? "border-[#0d6e5a] bg-[#0d6e5a] text-white"
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

        {/* Directory Results */}
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
            {filteredPharmacies.map((p) => {
              const whatsappUrl = p.whatsapp
                ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hello ${p.name}, I found your pharmacy on the Aether Network and have a prescription inquiry.`
                  )}`
                : null;

              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[1.85rem] border border-teal-900/8 bg-white shadow-[0_10px_35px_rgba(8,40,32,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0d6e5a]/30 hover:shadow-[0_20px_50px_rgba(8,40,32,0.12)]"
                >
                  {/* Pharmacy Card Header Image */}
                  <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#0d6e5a] to-[#084c3f]">
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImageUrl}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0d6e5a] to-[#062e26]">
                        <Building2 className="h-16 w-16 text-teal-300/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Open Now
                      </span>
                    </div>

                    <div className="absolute right-3 top-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#084c3f] shadow-sm">
                        <ShieldCheck className="h-3 w-3 text-[#0d6e5a]" />
                        {p.featured ? "Featured Partner" : "PPB Verified"}
                      </span>
                    </div>

                    {/* Bottom Location Indicator inside Image */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-100">
                        <MapPin className="h-3.5 w-3.5 text-teal-300" />
                        {[p.city, p.county].filter(Boolean).join(", ") || p.country}
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
                        Doorstep Delivery
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
      </div>
    </section>
  );
}
