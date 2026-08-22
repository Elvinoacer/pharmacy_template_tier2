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
  Sparkles,
  Zap,
  Camera,
  Syringe,
  X,
} from "lucide-react";
import type { PublicPharmacy } from "@/app/lib/tenant";

interface TravelLabNetworkProps {
  pharmacies: PublicPharmacy[];
  initialCity?: string;
  initialQuery?: string;
}

const FALLBACK_COVERS = [
  "/images/gallery/welcoming_retail_floor.webp",
  "/images/gallery/curated_wellness_aisle.webp",
  "/images/gallery/comfortable_waiting_area.webp",
  "/images/gallery/careful_dispensing.webp",
];

const SERVICES = [
  {
    title: "AI Symptom Triage",
    desc: "Instant clinical matching and pharmacist guidance.",
    href: "/how-do-you-feel",
    icon: Sparkles,
    tag: "Clinical AI",
    img: "/images/services/medication-counselling.webp",
  },
  {
    title: "Photo Medicine Scan",
    desc: "Snap any blister pack or slip to check live local stock.",
    href: "/medicines?photo=1",
    icon: Camera,
    tag: "Vision AI",
    img: "/images/services/prescription-dispensing.webp",
  },
  {
    title: "60s Prescription Refill",
    desc: "Two-tap recurring refills with Lipa na M-Pesa STK push.",
    href: "/refill",
    icon: Zap,
    tag: "Fast Refill",
    img: "/images/services/prescription-refills.webp",
  },
  {
    title: "Vaccines & Screenings",
    desc: "Flu shots, blood pressure, and cold-chain immunizations.",
    href: "/vaccinations",
    icon: Syringe,
    tag: "Clinic Visit",
    img: "/images/services/vaccinations.webp",
  },
];

export default function TravelLabNetwork({
  pharmacies,
  initialCity = "",
  initialQuery = "",
}: TravelLabNetworkProps) {
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
    <section id="network" className="relative px-4 py-20 sm:px-6 sm:py-28 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0f172a]">
            Our Network
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-tight text-[#0f172a] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Accredited Pharmacies & Services
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            Browse our licensed partner storefronts or access instant care tools.
          </p>
        </div>

        {/* 4 Core Service Cards (Top Deck) */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
                href={s.href}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 transition hover:-translate-y-1 hover:border-[#0f172a] hover:bg-white hover:shadow-lg"
              >
                <div>
                  <div className="relative h-32 w-full overflow-hidden rounded-xl bg-slate-900 mb-3">
                    <Image
                      src={s.img}
                      alt={s.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 250px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute top-2 left-2 rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                      {s.tag}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-[#0f172a] group-hover:text-[#c9a227] transition">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#64748b] line-clamp-2 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs font-bold text-[#0f172a]">
                  <span>Access service</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Directory Explorer Header */}
        <div className="mt-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-slate-100 pt-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Directory</span>
            <h3
              className="text-2xl font-semibold text-[#0f172a] mt-1"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Verified Partner Storefronts
            </h3>
          </div>

          <Link
            href="/for-pharmacies"
            className="text-xs font-semibold text-[#0f172a] hover:underline"
          >
            Apply to list your pharmacy →
          </Link>
        </div>

        {/* Search & Location Filter */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by pharmacy name or city..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] pl-10 pr-9 text-xs text-[#0f172a] placeholder:text-slate-400 focus:border-[#0f172a] focus:bg-white focus:outline-none"
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
                    : "bg-[#f8fafc] text-slate-600 border border-slate-200 hover:bg-slate-100"
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
                      : "bg-[#f8fafc] text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Directory Card Grid */}
        {filteredPharmacies.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-[#f8fafc] p-8 text-center">
            <p className="text-xs text-slate-500">No pharmacies found matching your search.</p>
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
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPharmacies.map((p, idx) => {
              const whatsappUrl = p.whatsapp
                ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hello ${p.name}, I have a prescription inquiry via Aether Network.`
                  )}`
                : null;

              const coverImg = p.coverImageUrl || FALLBACK_COVERS[idx % FALLBACK_COVERS.length];

              return (
                <div
                  key={p.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] transition duration-300 hover:-translate-y-1 hover:border-[#0f172a] hover:bg-white hover:shadow-xl"
                >
                  {/* Photo Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <Image
                      src={coverImg}
                      alt={p.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    <span className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
                      ● Open Now
                    </span>

                    <span className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                      <span className="truncate">{[p.city, p.county].filter(Boolean).join(", ") || p.country}</span>
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h4
                        className="font-semibold text-base text-[#0f172a] truncate"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        {p.name}
                      </h4>
                      <p className="mt-1 text-xs text-[#64748b] line-clamp-2 leading-relaxed">
                        {p.tagline || p.description || "PPB accredited independent pharmacy on the Aether Network."}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-200/80">
                      <Link
                        href={`/p/${p.slug}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f172a] py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        <span>Visit Storefront</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>

                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#0f172a] hover:bg-slate-100"
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
