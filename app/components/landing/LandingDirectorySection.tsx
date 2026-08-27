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
  MessageCircle,
  Clock,
  X,
} from "lucide-react";
import type { PublicPharmacy } from "@/app/lib/tenant";

interface LandingDirectorySectionProps {
  pharmacies: PublicPharmacy[];
  initialCity?: string;
  initialQuery?: string;
}

const FALLBACK_COVERS = [
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/comfortable_waiting_area.webp",
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
];

export default function LandingDirectorySection({
  pharmacies,
  initialCity = "",
  initialQuery = "",
}: LandingDirectorySectionProps) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCity, setSelectedCity] = useState(initialCity);

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

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter((p) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.county && p.county.toLowerCase().includes(q));

      const matchesCity = !selectedCity || (p.city && p.city.toLowerCase() === selectedCity.toLowerCase());
      return matchesSearch && matchesCity;
    });
  }, [pharmacies, searchTerm, selectedCity]);

  return (
    <section id="pharmacies" className="relative border-t border-slate-200/80 bg-[#f8fafc] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f172a]">
              The Network
            </p>
            <h2
              className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a] sm:text-3xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Verified neighbourhood pharmacies
            </h2>
          </div>
          <Link
            href="/for-pharmacies"
            className="text-xs font-semibold text-[#0f172a] hover:underline"
          >
            List your pharmacy →
          </Link>
        </div>

        {/* Minimal Search & Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name or city..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs text-[#0f172a] placeholder:text-slate-400 focus:border-[#0f172a] focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {uniqueCities.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCity("")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  !selectedCity
                    ? "bg-[#0f172a] text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                All ({pharmacies.length})
              </button>
              {uniqueCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(selectedCity === city ? "" : city)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedCity === city
                      ? "bg-[#0f172a] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Directory Cards */}
        {filteredPharmacies.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-xs text-slate-500">No pharmacies found for this search.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCity("");
              }}
              className="mt-3 text-xs font-bold text-[#0f172a] hover:underline"
            >
              Reset search
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPharmacies.map((p, idx) => {
              const whatsappUrl = p.whatsapp
                ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hello ${p.name}, I have a prescription inquiry via Aether.`
                  )}`
                : null;

              const coverImg = p.coverImageUrl || FALLBACK_COVERS[idx % FALLBACK_COVERS.length];

              return (
                <div
                  key={p.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Photo with Overlay */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                    <Image
                      src={coverImg}
                      alt={p.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    <span className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
                      ● Open Now
                    </span>

                    <span className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-amber-300 shrink-0" />
                      <span className="truncate">{[p.city, p.county].filter(Boolean).join(", ") || p.country}</span>
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3
                        className="font-semibold text-base text-[#0f172a] truncate"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        {p.name}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {p.tagline || p.description || "PPB accredited independent pharmacy"}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
                      <Link
                        href={`/p/${p.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f172a] py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        <span>Visit</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>

                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#0f172a] hover:bg-slate-100"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4 text-[#c9a227]" />
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
