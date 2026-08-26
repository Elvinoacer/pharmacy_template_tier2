"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Layers,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Store,
  Zap,
} from "lucide-react";
import type { DirectoryPharmacy } from "@/app/lib/services/pharmacy-directory";
import SmartSearchAssist from "../assist/SmartSearchAssist";

interface TravelLabNetworkProps {
  pharmacies: DirectoryPharmacy[];
}

const R2 = "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev";

const FALLBACK_PHARMACIES: DirectoryPharmacy[] = [
  {
    id: "aether-central",
    slug: "aether",
    name: "Aether Pharmacy",
    tagline: "Your neighbourhood pharmacy, built on trust",
    description: "Dispensing excellence and personalised care in central Nairobi.",
    featured: true,
    city: "Nairobi",
    county: "Nairobi",
    country: "Kenya",
    latitude: -1.286389,
    longitude: 36.817223,
    logoUrl: null,
    coverImageUrl: `${R2}/images/gallery/welcoming_retail_floor.webp`,
    whatsapp: "+254790670542",
    phone: "+254790670542",
    stockCount: 1420,
    otcCount: 0,
    topCategories: ["Prescription", "Wellness", "Vitamins"],
    services: ["Prescriptions", "Refills", "Counselling"],
    hasDelivery: true,
    hasSearchedMedicine: false,
    searchedMedicineCount: 0,
  },
  {
    id: "aether-westlands",
    slug: "aether-westlands",
    name: "Aether Westlands Care",
    tagline: "Modern healthcare & chronic refill management",
    description: "Serving the Westlands community with speedy doorstep delivery.",
    featured: true,
    city: "Westlands",
    county: "Nairobi",
    country: "Kenya",
    latitude: -1.2658,
    longitude: 36.8044,
    logoUrl: null,
    coverImageUrl: `${R2}/images/gallery/curated_wellness_aisle.webp`,
    whatsapp: "+254790670542",
    phone: "+254790670542",
    stockCount: 1180,
    otcCount: 0,
    topCategories: ["Diabetes", "Heart Health", "Self Care"],
    services: ["Refills", "Vaccinations", "Screenings"],
    hasDelivery: true,
    hasSearchedMedicine: false,
    searchedMedicineCount: 0,
  },
  {
    id: "aether-kilimani",
    slug: "aether-kilimani",
    name: "Aether Kilimani Pharmacy",
    tagline: "Family pharmacy and preventive clinic",
    description: "Your local destination for verified genuine pharmaceuticals.",
    featured: true,
    city: "Kilimani",
    county: "Nairobi",
    country: "Kenya",
    latitude: -1.2954,
    longitude: 36.7869,
    logoUrl: null,
    coverImageUrl: `${R2}/images/gallery/careful_dispensing.webp`,
    whatsapp: "+254790670542",
    phone: "+254790670542",
    stockCount: 960,
    otcCount: 0,
    topCategories: ["Maternal Care", "Paediatrics", "Pain Relief"],
    services: ["Consultations", "Cold Chain", "Delivery"],
    hasDelivery: true,
    hasSearchedMedicine: false,
    searchedMedicineCount: 0,
  },
];

export default function TravelLabNetwork({ pharmacies }: TravelLabNetworkProps) {
  const displayPharmacies =
    pharmacies && pharmacies.length > 0 ? pharmacies : FALLBACK_PHARMACIES;

  const [currentIndex, setCurrentIndex] = useState(0);

  const activePharmacy = displayPharmacies[currentIndex] || displayPharmacies[0];

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? displayPharmacies.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayPharmacies.length);
  };

  const location =
    [activePharmacy.city, activePharmacy.county].filter(Boolean).join(", ") ||
    activePharmacy.country ||
    "Nairobi, Kenya";

  const whatsappHref = activePharmacy.whatsapp
    ? `https://wa.me/${activePharmacy.whatsapp.replace(
        /\D/g,
        ""
      )}?text=${encodeURIComponent(
        `Hello ${activePharmacy.name}, I found you on Aether and would like to ask about a medicine or service.`
      )}`
    : "https://wa.me/254790670542";

  return (
    <section
      id="network"
      className="relative overflow-hidden bg-[#030907] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8"
    >
      {/* Background Graphic: featured_bg_image.png with subtle atmospheric blending */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <Image
          src={`${R2}/images/landing/featured_bg_image.png`}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-60"
        />
        {/* Soft edge gradients and radial vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030907] via-transparent to-[#030907]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030907]/90 via-[#030907]/40 to-transparent" />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-emerald-700/10 blur-[140px]" />
        <div className="absolute right-0 top-1/2 h-[30rem] w-[30rem] -translate-y-1/2 rounded-full bg-teal-600/10 blur-[160px]" />
        <div className="landing-grain opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Top Split Layout: Left Info & Search, Right Featured Showcase Card */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10 xl:gap-16">
          
          {/* Left Column: Heading, Subhead, Search Bar & 3 Feature Chips */}
          <div className="lg:col-span-5 xl:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#2dd4bf]">
              Care Near You
            </p>

            <h2
              className="mt-4 text-4xl font-normal leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Choose a trusted
              <br />
              local <span className="text-[#2dd4bf]">pharmacy.</span>
            </h2>

            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
              Discover verified pharmacies near you.
              <br />
              Quality care, trusted by your community.
            </p>

            {/* Quick Search Form — AI quick assist built in */}
            <SmartSearchAssist
              variant="network"
              placeholder="Search by pharmacy name, area or service…"
            />

            {/* 3 Feature Pills Container */}
            <div className="mt-6 max-w-md rounded-2xl border border-white/[0.08] bg-black/30 p-4 backdrop-blur-md shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:divide-x sm:divide-white/10 sm:gap-2">
                {/* Chip 1: Verified */}
                <div className="flex items-start gap-2.5 sm:px-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Verified & Licensed</h3>
                    <p className="text-[10px] leading-tight text-slate-400 mt-0.5">
                      All pharmacies are verified by our team
                    </p>
                  </div>
                </div>

                {/* Chip 2: OTC Items */}
                <div className="flex items-start gap-2.5 sm:pl-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">0 OTC Items</h3>
                    <p className="text-[10px] leading-tight text-slate-400 mt-0.5">
                      Wide range of OTC medicines in stock
                    </p>
                  </div>
                </div>

                {/* Chip 3: Fast & Reliable */}
                <div className="flex items-start gap-2.5 sm:pl-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Fast & Reliable</h3>
                    <p className="text-[10px] leading-tight text-slate-400 mt-0.5">
                      Quick service and doorstep delivery
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Featured Pharmacy Showcase Card */}
          <div className="relative lg:col-span-7 xl:col-span-7">
            {/* Pharmacy Quick Selector Pills (when multiple featured pharmacies exist) */}
            {displayPharmacies.length > 1 && (
              <div className="mb-3.5 flex items-center justify-between gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-2">
                  {displayPharmacies.map((pharmacy, idx) => (
                    <button
                      key={pharmacy.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        idx === currentIndex
                          ? "border border-emerald-400/50 bg-emerald-950/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                          : "border border-white/10 bg-black/40 text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{pharmacy.name}</span>
                    </button>
                  ))}
                </div>

                {/* Counter & Mobile Controls */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <span>{currentIndex + 1}</span>
                  <span>/</span>
                  <span>{displayPharmacies.length}</span>
                  <div className="flex items-center gap-1 ml-1 lg:hidden">
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label="Previous pharmacy"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="Next pharmacy"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="relative flex items-center">
              {/* Previous Desktop Chevron Button */}
              {displayPharmacies.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous pharmacy"
                  className="absolute -left-5 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md transition-all hover:border-emerald-400 hover:bg-black/90 hover:scale-110 lg:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Primary Showcase Card */}
              <div className="relative w-full overflow-hidden rounded-[2rem] border border-emerald-400/30 bg-black/30 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(16,185,129,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-6">
                
                {/* Pharmacy Cover Image */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-900 sm:aspect-[16/8.5]">
                  <Image
                    src={
                      activePharmacy.coverImageUrl ||
                      `${R2}/images/gallery/welcoming_retail_floor.webp`
                    }
                    alt={activePharmacy.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 680px"
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  {/* Top Left Badge */}
                  <div className="absolute left-4 top-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-3.5 py-1.5 text-xs font-semibold text-amber-300 shadow-lg backdrop-blur-md">
                      <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                      Featured Pharmacy
                    </span>
                  </div>

                  {/* Top Right Dots */}
                  {displayPharmacies.length > 1 && (
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 backdrop-blur-md">
                      {displayPharmacies.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          type="button"
                          onClick={() => setCurrentIndex(dotIdx)}
                          aria-label={`Go to pharmacy ${dotIdx + 1}`}
                          className={`h-2 rounded-full transition-all ${
                            dotIdx === currentIndex
                              ? "w-5 bg-emerald-400 shadow-[0_0_8px_#34d399]"
                              : "w-2 bg-white/30 hover:bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Info Details */}
                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    {/* Pharmacy Icon Badge */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-700/90 text-white shadow-md">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M10.5 4.5h3v6h6v3h-6v6h-3v-6h-6v-3h6v-6z" />
                      </svg>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                        {activePharmacy.name}
                      </h3>
                      <p className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {location}
                      </p>
                    </div>
                  </div>

                  {/* Info Pill Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      Open now • Closes 10:00 PM
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      0 OTC items in stock
                    </span>
                  </div>
                </div>

                {/* Card Actions Row: Rating, WhatsApp, Visit Storefront */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>4.9</span>
                    <span className="text-slate-400 font-normal">(230+ reviews)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* WhatsApp Button */}
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Chat with ${activePharmacy.name} on WhatsApp`}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white shadow-sm transition-all hover:border-emerald-400/50 hover:bg-white/15"
                    >
                      <MessageCircle className="h-5 w-5 text-slate-200" />
                    </a>

                    {/* Visit Storefront Primary CTA */}
                    <Link
                      href={`/p/${activePharmacy.slug}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#0d6e5a] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all hover:bg-[#10856d] hover:scale-105 active:scale-95"
                    >
                      <span>Visit storefront</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Next Desktop Chevron Button */}
              {displayPharmacies.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next pharmacy"
                  className="absolute -right-5 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md transition-all hover:border-emerald-400 hover:bg-black/90 hover:scale-110 lg:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Glass Banner: "Can't find what you're looking for?" */}
        <div className="mt-12 rounded-[2rem] border border-white/10 bg-black/30 p-5 shadow-xl backdrop-blur-xl sm:mt-16 sm:p-6 lg:p-7">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white sm:text-lg">
                  Can&apos;t find what you&apos;re looking for?
                </h3>
                <p className="text-xs text-slate-400 sm:text-sm mt-0.5">
                  Search our complete directory of pharmacies and services.
                </p>
              </div>
            </div>

            <Link
              href="/pharmacies"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-6 py-3 text-xs font-semibold text-white shadow-md transition-all hover:border-white/40 hover:bg-black/70 sm:text-sm"
            >
              <span>Open directory</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Bottom Proof Bar: 4 Pillars */}
        <div className="mt-6 rounded-[2rem] border border-white/10 bg-black/30 p-5 shadow-xl backdrop-blur-xl sm:p-6 lg:p-7">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-4 lg:divide-x lg:divide-white/10">
            {/* Pillar 1 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white sm:text-base">PPB</p>
                <p className="text-xs text-slate-400 mt-0.5">Licensed pharmacies</p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white sm:text-base">&lt; 45m</p>
                <p className="text-xs text-slate-400 mt-0.5">Average delivery time</p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white sm:text-base">M-Pesa</p>
                <p className="text-xs text-slate-400 mt-0.5">Secure payments</p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white sm:text-base">24/7 Support</p>
                <p className="text-xs text-slate-400 mt-0.5">Always here to help</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
