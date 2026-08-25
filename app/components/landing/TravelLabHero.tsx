"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import SplitTextWave from "./SplitTextWave";

interface TravelLabHeroProps {
  pharmacyCount?: number;
  initialQuery?: string;
}

const HERO_IMAGE =
  "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp";

export default function TravelLabHero(_props: TravelLabHeroProps) {
  return (
    <section className="travel-lab-hero relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[#070b10] text-white">
      {/* Full-bleed visual plane */}
      <div className="absolute inset-0 z-0">
        <Image
          src={HERO_IMAGE}
          alt="Welcoming Aether pharmacy floor"
          fill
          priority
          sizes="100vw"
          className="travel-lab-hero-image object-cover object-[center_35%]"
        />
        {/* Legibility veils — keep the photo present, not ghosted */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#070b10] via-[#070b10]/55 to-[#070b10]/25"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#070b10]/85 via-[#070b10]/35 to-transparent"
          aria-hidden
        />
        <div className="landing-grain opacity-[0.12]" aria-hidden />
      </div>

      {/* Composition: brand → headline → line → CTAs */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-40 lg:px-8 lg:pb-24">
        <p className="travel-lab-hero-brand font-display text-[clamp(3.5rem,16vw,8.5rem)] font-medium leading-[0.9] tracking-[-0.04em] text-white">
          <SplitTextWave
            as="span"
            text="Aether"
            delay={60}
            stagger={35}
            className="font-display"
            style={{ fontFamily: "var(--font-display), serif" }}
          />
        </p>

        <h1
          className="travel-lab-hero-headline mt-5 max-w-2xl text-[clamp(1.5rem,4.2vw,2.35rem)] font-medium leading-[1.15] tracking-tight text-white/95 sm:mt-7"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          <SplitTextWave
            as="span"
            delay={280}
            stagger={22}
            lines={[
              { text: "Rewriting the story of", className: "block text-white" },
              {
                text: "pharmacy care in Africa.",
                className: "mt-1 block italic text-[#f5e6a8]",
              },
            ]}
          />
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
      </div>
    </section>
  );
}
