"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import SplitTextWave from "./SplitTextWave";

interface TravelLabHeroProps {
  pharmacyCount?: number;
  initialQuery?: string;
}

const R2 = "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev";

/** Cinematic stills — each slide has its own pan so the reel reads like motion picture. */
const SCENES = [
  {
    src: `${R2}/images/gallery/welcoming_retail_floor.webp`,
    alt: "Bright pharmacy retail floor",
    motion: "drift-east",
    beat: "near",
  },
  {
    src: `${R2}/images/gallery/careful_dispensing.webp`,
    alt: "Pharmacist reviewing medications",
    motion: "drift-in",
    beat: "precise",
  },
  {
    src: `${R2}/images/services/medication-counselling.webp`,
    alt: "Private medication counselling",
    motion: "drift-west",
    beat: "human",
  },
  {
    src: `${R2}/images/gallery/modern_care_tools.webp`,
    alt: "Modern care tools in pharmacy",
    motion: "drift-up",
    beat: "ready",
  },
  {
    src: `${R2}/images/gallery/curated_wellness_aisle.webp`,
    alt: "Curated wellness aisle",
    motion: "drift-out",
    beat: "local",
  },
  {
    src: `${R2}/images/services/home-care-support.webp`,
    alt: "Calm care waiting area",
    motion: "drift-south",
    beat: "home",
  },
] as const;

const HOLD_MS = 5200;
const FADE_MS = 1600;

export default function TravelLabHero(_props: TravelLabHeroProps) {
  const [active, setActive] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
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

  const beat = SCENES[active]?.beat ?? SCENES[0].beat;

  return (
    <section className="travel-lab-hero relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[#070b10] text-white">
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

        {/* Soft film wash + legibility veils */}
        <div className="travel-lab-hero-flicker pointer-events-none absolute inset-0 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-[#070b10]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b10] via-[#070b10]/60 to-[#070b10]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b10]/90 via-[#070b10]/50 to-[#070b10]/15" />
        <div className="landing-grain opacity-[0.14]" />
      </div>

      <span className="sr-only">
        Background scenes cycle through pharmacy care moments:{" "}
        {SCENES.map((s) => s.alt).join("; ")}.
      </span>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-40 lg:px-8 lg:pb-24">
        <p className="travel-lab-hero-kicker text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
          Kenya pharmacy network
        </p>

        <h1
          className="travel-lab-hero-headline mt-5 max-w-3xl text-[clamp(2.1rem,7.5vw,4.25rem)] font-medium leading-[1.05] tracking-tight sm:mt-6"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          <SplitTextWave
            as="span"
            delay={120}
            stagger={20}
            className="block text-white"
            text="Care that still feels"
          />
          <span className="mt-1.5 block italic text-[#f5e6a8] sm:mt-2">
            <span key={beat} className="travel-lab-hero-beat inline-block">
              {beat}
            </span>
            <span className="text-white/90">.</span>
          </span>
        </h1>

        <p className="travel-lab-hero-sub mt-5 max-w-md text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg">
          Independent chemists, licensed clinicians, and families — on one
          digital care network across Kenya.
        </p>

        <div className="travel-lab-hero-cta mt-8 flex flex-wrap items-center gap-3 sm:mt-10 sm:gap-4">
          <a
            href="#network"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e8c547] px-7 text-sm font-bold text-[#0a120e] transition duration-300 hover:bg-[#f0d56a] active:scale-[0.98]"
          >
            Explore the network
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#story"
            className="inline-flex min-h-12 items-center justify-center px-2 text-sm font-semibold text-white/85 underline-offset-4 transition hover:text-white hover:underline"
          >
            Our story
          </a>
        </div>

        {!reducedMotion && (
          <div
            className="travel-lab-hero-reel mt-10 flex max-w-xs items-center gap-1.5 sm:mt-12"
            aria-hidden
          >
            {SCENES.map((scene, index) => (
              <span
                key={scene.src}
                className={`travel-lab-hero-reel-tick h-[2px] flex-1 rounded-full transition-all duration-700 ${
                  index === active
                    ? "bg-[#e8c547] travel-lab-hero-reel-tick--live"
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
