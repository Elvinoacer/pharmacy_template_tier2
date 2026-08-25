"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  MessageCircle,
  Play,
  Search,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import SplitTextWave from "./SplitTextWave";

interface TravelLabHeroProps {
  pharmacyCount?: number;
  initialQuery?: string;
}

const R2 = "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev";

/**
 * Living background scenes — includes the high-res pharmacy designs
 * and authentic cinematic care moments with continuous smooth panning.
 */
const SCENES = [
  {
    src: "/images/landing/hero_bgimg1.png",
    alt: "Bright pharmacy retail floor and consultation counter",
    motion: "drift-east",
  },
  {
    src: "/images/landing/hero_bg_img2.png",
    alt: "Modern community pharmacy interior with natural wellness care",
    motion: "drift-in",
  },
  {
    src: `${R2}/images/gallery/welcoming_retail_floor.webp`,
    alt: "Bright pharmacy retail floor",
    motion: "drift-west",
  },
  {
    src: `${R2}/images/gallery/careful_dispensing.webp`,
    alt: "Pharmacist reviewing medications",
    motion: "drift-up",
  },
  {
    src: `${R2}/images/services/medication-counselling.webp`,
    alt: "Private medication counselling",
    motion: "drift-out",
  },
  {
    src: `${R2}/images/gallery/curated_wellness_aisle.webp`,
    alt: "Curated wellness aisle",
    motion: "drift-south",
  },
] as const;

const AVATARS = [
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/priya-nair.webp",
    alt: "Kenyan customer",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/marcus-chen.webp",
    alt: "Kenyan customer",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/sofia-alvarez.webp",
    alt: "Kenyan customer",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/david-kim.webp",
    alt: "Kenyan customer",
  },
];

const HOLD_MS = 5200;
const FADE_MS = 1600;

export default function TravelLabHero({
  pharmacyCount = 200,
  initialQuery = "",
}: TravelLabHeroProps) {
  const [active, setActive] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const activeRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      const current = activeRef.current;
      const next = (current + 1) % SCENES.length;
      setOutgoing(current);
      activeRef.current = next;
      setActive(next);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  // Drop outgoing layer after the dissolve finishes
  useEffect(() => {
    if (outgoing === null) return;
    const id = window.setTimeout(() => setOutgoing(null), FADE_MS + 80);
    return () => window.clearTimeout(id);
  }, [outgoing]);

  const handleWatchDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById("demo");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="travel-lab-hero relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-[#040c09] text-white">
      {/* Living stills reel — crossfade + pan reads as continuous footage */}
      <div className="absolute inset-0 z-0" aria-hidden>
        {SCENES.map((scene, index) => {
          const isActive = reducedMotion ? index === 0 : index === active;
          const isFadingOut = !reducedMotion && index === outgoing;
          const isRunning = isActive || isFadingOut;
          return (
            <div
              key={scene.src}
              className={`travel-lab-hero-slide ${isActive ? "is-active" : ""} ${
                isFadingOut ? "is-outgoing" : ""
              }`}
              style={{ transitionDuration: `${FADE_MS}ms` }}
            >
              <Image
                src={scene.src}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className={`travel-lab-hero-frame object-cover travel-lab-hero-frame--${scene.motion} ${
                  isRunning ? "is-running" : ""
                }`}
              />
            </div>
          );
        })}

        {/* Deep emerald atmospheric veils & radial glows */}
        <div className="pointer-events-none absolute inset-0 z-[3]">
          <div className="absolute inset-0 bg-[#040d09]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040c09] via-[#040c09]/55 to-[#040c09]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#040c09]/95 via-[#040c09]/65 to-[#040c09]/35" />
          <div className="absolute -left-20 top-1/4 h-[35rem] w-[35rem] rounded-full bg-emerald-600/15 blur-[140px]" />
          <div className="absolute right-0 top-1/3 h-[40rem] w-[40rem] rounded-full bg-emerald-500/10 blur-[160px]" />
          <div className="landing-grain opacity-[0.10]" />
        </div>
      </div>

      <span className="sr-only">
        Background scenes cycle through pharmacy care moments:{" "}
        {SCENES.map((s) => s.alt).join("; ")}.
      </span>

      {/* Main Content Area */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-36 lg:px-8 lg:pb-20 lg:pt-40">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8 xl:gap-14">
          
          {/* Left Column: Headline, Search, CTAs & Social Proof */}
          <div className="lg:col-span-7 xl:col-span-7">
            {/* Kicker Badge */}
            <div className="travel-lab-hero-kicker inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-[#0b2118]/75 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d1fae5]">
                Kenya Pharmacy Network
              </span>
            </div>

            {/* Main Headline */}
            <h1
              className="travel-lab-hero-headline mt-6 text-[2.75rem] font-normal leading-[1.04] tracking-[-0.02em] text-white sm:text-[3.75rem] md:text-[4.5rem] lg:text-[5rem] xl:text-[5.5rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              <SplitTextWave
                as="span"
                delay={100}
                stagger={18}
                className="block text-white"
                text="Care that"
              />
              <SplitTextWave
                as="span"
                delay={180}
                stagger={18}
                className="block text-white"
                text="still feels"
              />
              <span className="block italic text-[#84d47d] drop-shadow-[0_2px_14px_rgba(132,212,125,0.35)]">
                local.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="travel-lab-hero-sub mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
              Find trusted pharmacies near you. Refill prescriptions, get health advice, and access the care you deserve.
            </p>

            {/* Search Input Bar */}
            <form
              action="/pharmacies"
              method="GET"
              className="travel-lab-hero-cta mt-8 flex w-full max-w-xl items-center rounded-full border border-emerald-500/30 bg-[#06150f]/80 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 sm:p-2"
            >
              <div className="flex flex-1 items-center pl-3 sm:pl-4">
                <MapPin className="h-5 w-5 shrink-0 text-emerald-400/80" />
                <input
                  type="text"
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a pharmacy or service..."
                  className="w-full bg-transparent pl-3 pr-2 text-sm text-white placeholder:text-slate-400 outline-none sm:text-base"
                />
              </div>
              <button
                type="submit"
                aria-label="Search pharmacies"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d825c] text-white shadow-md shadow-emerald-950/40 transition-all hover:bg-[#10a374] hover:scale-105 active:scale-95 sm:h-12 sm:w-12"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </form>

            {/* Action Buttons */}
            <div className="travel-lab-hero-cta mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#22c55e] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(34,197,94,0.35)] transition-all hover:bg-[#16a34a] hover:shadow-[0_6px_30px_rgba(34,197,94,0.45)] hover:scale-[1.02] active:scale-[0.98] sm:text-base"
              >
                <span>See how it works</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={handleWatchDemo}
                className="group inline-flex items-center gap-2.5 text-sm font-medium text-white transition-colors hover:text-[#84d47d] sm:text-base"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 transition-colors group-hover:border-[#84d47d]">
                  <Play className="ml-0.5 h-3 w-3 fill-current" />
                </span>
                <span>Watch demo</span>
              </button>
            </div>

            {/* Social Proof Stack */}
            <div className="travel-lab-hero-cta mt-8 flex items-center gap-3.5 sm:mt-10">
              <div className="flex -space-x-2.5 overflow-hidden">
                {AVATARS.map((avatar, i) => (
                  <Image
                    key={i}
                    src={avatar.src}
                    alt={avatar.alt}
                    width={40}
                    height={40}
                    className="inline-block h-9 w-9 rounded-full border-2 border-[#06140e] object-cover sm:h-10 sm:w-10"
                  />
                ))}
              </div>
              <div className="text-xs sm:text-sm">
                <p className="font-semibold text-white">Trusted by 10,000+ Kenyans</p>
                <p className="text-slate-300">
                  across{" "}
                  <span className="font-semibold text-[#34d399]">
                    {pharmacyCount > 0 ? `${pharmacyCount}+` : "200+"} pharmacies
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: "Everything you need, all in one place" Glass Card */}
          <div className="lg:col-span-5 xl:col-span-5">
            <div className="relative rounded-[2rem] border border-emerald-500/25 bg-[#071911]/55 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-7">
              {/* Inner ambient glow */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl" />
              
              <div className="relative">
                <h2 className="text-lg font-medium text-white sm:text-xl">
                  Everything you need,
                </h2>
                <p
                  className="mt-0.5 text-lg font-normal italic text-[#84d47d] sm:text-xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  all in one place
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {/* Item 1: Find Pharmacies */}
                <Link
                  href="/pharmacies"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all duration-200 hover:border-emerald-500/35 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M10.5 4.5h3v6h6v3h-6v6h-3v-6h-6v-3h6v-6z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Find Pharmacies</h3>
                      <p className="text-xs text-slate-300/80">Locate trusted pharmacies near you in seconds.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>

                {/* Item 2: Refill Prescriptions */}
                <Link
                  href="/refill"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all duration-200 hover:border-emerald-500/35 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Refill Prescriptions</h3>
                      <p className="text-xs text-slate-300/80">Easily refill and manage your prescriptions online.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>

                {/* Item 3: Health Advice */}
                <Link
                  href="/how-do-you-feel"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all duration-200 hover:border-emerald-500/35 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Health Advice</h3>
                      <p className="text-xs text-slate-300/80">Get professional guidance from qualified pharmacists.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>

                {/* Item 4: Quality Assured */}
                <Link
                  href="/health/self-care-guide"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all duration-200 hover:border-emerald-500/35 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Quality Assured</h3>
                      <p className="text-xs text-slate-300/80">Verified pharmacies. Genuine medicines. Your safety first.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-12 w-full rounded-[2rem] border border-emerald-500/20 bg-[#06150f]/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:mt-16 sm:p-6 lg:p-7">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-4 lg:divide-x lg:divide-white/10">
            {/* Metric 1 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm sm:h-14 sm:w-14">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {pharmacyCount > 0 ? `${pharmacyCount}+` : "200+"}
                </p>
                <p className="text-xs font-medium text-slate-300/90 sm:text-sm">
                  Trusted Pharmacies
                </p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm sm:h-14 sm:w-14">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  10,000+
                </p>
                <p className="text-xs font-medium text-slate-300/90 sm:text-sm">
                  Happy Customers
                </p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm sm:h-14 sm:w-14">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  100%
                </p>
                <p className="text-xs font-medium text-slate-300/90 sm:text-sm">
                  Genuine Medicines
                </p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-[#0e3a2c]/85 text-[#34d399] shadow-sm sm:h-14 sm:w-14">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  24/7
                </p>
                <p className="text-xs font-medium text-slate-300/90 sm:text-sm">
                  Care & Support
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reel Progress Ticks */}
        {!reducedMotion && (
          <div
            className="travel-lab-hero-reel mx-auto mt-8 flex max-w-xs items-center gap-1.5 opacity-60 transition-opacity hover:opacity-100 sm:mt-10"
            aria-hidden
          >
            {SCENES.map((scene, index) => (
              <span
                key={scene.src}
                className={`travel-lab-hero-reel-tick h-[2px] flex-1 rounded-full transition-all duration-700 ${
                  index === active
                    ? "bg-[#22c55e] travel-lab-hero-reel-tick--live"
                    : index < active
                      ? "bg-white/35"
                      : "bg-white/15"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
