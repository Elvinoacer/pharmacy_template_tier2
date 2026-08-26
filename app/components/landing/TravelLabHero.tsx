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

/**
 * Living background scenes — alternating between all 4 authentic high-res
 * hero pharmacy atmospheres with cinematic cross-dissolve motion.
 */
const SCENES = [
  {
    src: "/images/landing/hero_image_0.png",
    alt: "Aether pharmacy apothecary with natural supplements and care counter",
    motion: "drift-east",
  },
  {
    src: "/images/landing/hero_imag_1_1.png",
    alt: "Modern accredited pharmacy interior with herbal wellness care and medical cross",
    motion: "drift-in",
  },
  {
    src: "/images/landing/hero_bgimg1.png",
    alt: "Warm ambient dispensary and curated wellness shelves",
    motion: "drift-west",
  },
  {
    src: "/images/landing/hero_bg_img2.png",
    alt: "Luminous clinical pharmacy counter with herbal mortar and pestle",
    motion: "drift-east",
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

const HOLD_MS = 6000;
const FADE_MS = 1800;

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
    <section className="travel-lab-hero relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-[#030907] text-white">
      {/* Living background stills — crossfade + gentle drift pan */}
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
                className={`travel-lab-hero-frame object-cover !filter-none travel-lab-hero-frame--${scene.motion} ${
                  isRunning ? "is-running" : ""
                }`}
              />
            </div>
          );
        })}

        {/* Cinematic gradient overlays — perfectly preserves background visuals while ensuring crisp copy contrast */}
        <div className="pointer-events-none absolute inset-0 z-[3]">
          <div className="absolute inset-0 bg-gradient-to-t from-[#030907]/95 via-transparent to-[#030907]/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030907]/80 via-transparent to-[#030907]/30" />
          <div className="absolute -left-24 top-1/4 h-[35rem] w-[35rem] rounded-full bg-emerald-600/10 blur-[150px]" />
          <div className="absolute right-0 top-1/3 h-[40rem] w-[40rem] rounded-full bg-emerald-500/10 blur-[160px]" />
          <div className="landing-grain opacity-[0.06]" />
        </div>
      </div>

      <span className="sr-only">
        Background scenes cycle through pharmacy care moments:{" "}
        {SCENES.map((s) => s.alt).join("; ")}.
      </span>

      {/* Main Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-36 lg:px-8 lg:pb-16 lg:pt-36">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8 xl:gap-14">
          
          {/* Left Column: Kicker, Display Headline, Subtitle, Search, CTA, Social Proof */}
          <div className="lg:col-span-7 xl:col-span-7">
            {/* Kicker Pill Badge */}
            <div className="travel-lab-hero-kicker inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                Kenya Pharmacy Network
              </span>
            </div>

            {/* Main Headline */}
            <h1
              className="travel-lab-hero-headline mt-6 text-[3rem] font-normal leading-[1.02] tracking-[-0.03em] text-white sm:text-[4rem] md:text-[5rem] lg:text-[5.5rem] xl:text-[6rem]"
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
              <span className="block italic text-[#8ce394] drop-shadow-[0_2px_18px_rgba(140,227,148,0.4)]">
                local.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="travel-lab-hero-sub mt-5 max-w-lg text-base leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
              Find trusted pharmacies near you. Refill prescriptions, get health advice, and access the care you deserve.
            </p>

            {/* Search Input Bar */}
            <form
              action="/pharmacies"
              method="GET"
              className="travel-lab-hero-cta relative z-20 mt-8 flex !visible !opacity-100 !translate-y-0 w-full max-w-lg items-center rounded-full border border-white/15 bg-black/40 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all focus-within:border-emerald-400/80 focus-within:ring-2 focus-within:ring-emerald-400/20 sm:p-2"
            >
              <div className="flex min-w-0 flex-1 items-center pl-3 sm:pl-4">
                <MapPin className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type="text"
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a pharmacy or service..."
                  className="w-full !bg-transparent !text-white !opacity-100 pl-3 pr-2 text-sm placeholder:!text-slate-400 outline-none sm:text-base"
                />
              </div>
              <button
                type="submit"
                aria-label="Search pharmacies"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d825c] text-white shadow-md shadow-emerald-950/40 transition-all hover:bg-[#10a374] hover:scale-105 active:scale-95 sm:h-11 sm:w-11"
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
                className="group inline-flex items-center gap-2.5 text-sm font-medium text-white transition-colors hover:text-[#8ce394] sm:text-base"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 transition-colors group-hover:border-[#8ce394]">
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
                    className="inline-block h-9 w-9 rounded-full border-2 border-black/80 object-cover sm:h-10 sm:w-10"
                  />
                ))}
              </div>
              <div className="text-xs sm:text-sm">
                <p className="font-semibold text-white">Trusted by 10,000+ Kenyans</p>
                <p className="text-slate-300">
                  across{" "}
                  <span className="font-semibold text-[#34d399]">
                    200+ pharmacies
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: 100% Glassmorphic Floating Feature Card */}
          <div className="lg:col-span-5 xl:col-span-5">
            <div className="relative rounded-[2rem] border border-emerald-400/25 bg-black/25 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1),0_0_40px_rgba(16,185,129,0.1)] backdrop-blur-2xl sm:p-7">
              {/* Inner ambient green backlight */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-emerald-500/15 blur-2xl" />
              
              <div className="relative">
                <h2 className="text-lg font-medium text-white sm:text-xl">
                  Everything you need,
                </h2>
                <p
                  className="mt-0.5 text-lg font-normal italic text-[#a3e635] sm:text-xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  all in one place
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {/* Item 1: Find Pharmacies */}
                <Link
                  href="/pharmacies"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.08] bg-black/30 p-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/50"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
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
                      <p className="text-xs text-slate-300">Locate trusted pharmacies near you in seconds.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>

                {/* Item 2: Refill Prescriptions */}
                <Link
                  href="/refill"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.08] bg-black/30 p-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/50"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Refill Prescriptions</h3>
                      <p className="text-xs text-slate-300">Easily refill and manage your prescriptions online.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>

                {/* Item 3: Health Advice */}
                <Link
                  href="/how-do-you-feel"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.08] bg-black/30 p-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/50"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Health Advice</h3>
                      <p className="text-xs text-slate-300">Get professional guidance from qualified pharmacists.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>

                {/* Item 4: Quality Assured */}
                <Link
                  href="/health/self-care-guide"
                  className="group flex items-center justify-between gap-3.5 rounded-2xl border border-white/[0.08] bg-black/30 p-3.5 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/50"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Quality Assured</h3>
                      <p className="text-xs text-slate-300">Verified pharmacies. Genuine medicines. Your safety first.</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Metrics Bar: 100% Glassmorphic Capsule */}
        <div className="mt-12 w-full rounded-[2rem] border border-emerald-400/25 bg-black/30 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1),0_0_40px_rgba(16,185,129,0.08)] backdrop-blur-2xl sm:mt-16 sm:p-6 lg:p-7">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-4 lg:divide-x lg:divide-white/10">
            {/* Metric 1 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-700/80 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] sm:h-14 sm:w-14">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  200+
                </p>
                <p className="text-xs font-medium text-slate-300 sm:text-sm">
                  Trusted Pharmacies
                </p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-700/80 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] sm:h-14 sm:w-14">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  10,000+
                </p>
                <p className="text-xs font-medium text-slate-300 sm:text-sm">
                  Happy Customers
                </p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-700/80 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] sm:h-14 sm:w-14">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  100%
                </p>
                <p className="text-xs font-medium text-slate-300 sm:text-sm">
                  Genuine Medicines
                </p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-3.5 lg:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-700/80 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] sm:h-14 sm:w-14">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  24/7
                </p>
                <p className="text-xs font-medium text-slate-300 sm:text-sm">
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
