"use client";

import Link from "next/link";
import Image from "next/image";
import Reveal from "./Reveal";
import { useTenantHref } from "./TenantLink";

export default function CtaBanner({
  eyebrow = "Get in touch",
  title = "Ready to visit or need a refill?",
  description = "Call us, message on WhatsApp, or use a quick online form — we are here to help.",
  primaryHref = "/contact",
  primaryLabel = "Contact us",
  secondaryHref = "/refill",
  secondaryLabel = "Request a refill",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const primary = useTenantHref(primaryHref);
  const secondary = useTenantHref(secondaryHref);

  return (
    <section className="px-3 py-12 sm:px-6 sm:py-16 lg:py-20">
      <Reveal>
        <div className="group/banner relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/30 shadow-[0_24px_64px_rgba(8,40,32,0.20)] sm:rounded-[2rem]">
          <div className="absolute inset-0 transition-transform duration-[2s] ease-out group-hover/banner:scale-[1.02]">
            <Image
              src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/home-care-support.webp"
              alt="Calm modern wellness space"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1152px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#041510]/94 via-[#084c3f]/88 to-[#0d6e5a]/78" />
          </div>

          <div className="relative px-5 py-9 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-200/90 sm:text-xs sm:tracking-[0.2em]">
              {eyebrow}
            </p>
            <h2
              className="mt-2 max-w-lg text-2xl font-semibold leading-tight tracking-tight text-white sm:mt-3 sm:text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {title}
            </h2>
            <p className="mt-3 max-w-md text-[13px] leading-6 text-teal-50/85 sm:mt-4 sm:text-sm sm:leading-relaxed lg:text-base">
              {description}
            </p>

            <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:mt-8 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
              <Link
                href={primary}
                className="button-sparkle-overlay inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#084c3f] shadow-lg transition hover:shadow-xl sm:w-auto sm:px-6"
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondary}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 sm:w-auto sm:px-6"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
