import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { platform } from "@/app/lib/data";
import CareFirstHero from "./components/landing/CareFirstHero";
export const metadata = {
  title: `${platform.name} — Your care, connected`,
  description: platform.description,
};
export default function MarketplacePage() {
  return (
    <>
      <CareFirstHero />
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-2 md:items-center md:gap-16 md:py-20">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
          <Image
            src="/images/care/medicine-still-life.png"
            alt="Illustrative medicine supplies in morning light"
            fill
            sizes="(max-width: 760px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[.18em] text-[var(--brand)]">
            LESS SEARCHING. MORE LIVING.
          </p>
          <h2
            className="mt-5 text-4xl leading-[1.1] tracking-tight"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your next step,
            <br />
            <em className="text-[var(--brand)]">made a little simpler.</em>
          </h2>
          <div className="mt-8 space-y-6">
            {[
              [
                "01",
                "Start with your need",
                "Search a medicine, upload a prescription, or explore a service.",
              ],
              [
                "02",
                "See what’s available",
                "Review real listings, prices, and the details that matter.",
              ],
              [
                "03",
                "Continue with confidence",
                "Request your medicine or book a service. Explore the pharmacy’s profile whenever you need to.",
              ],
            ].map(([n, title, text]) => (
              <div key={n} className="flex gap-4">
                <span className="text-xs text-[var(--brand)] pt-1">{n}</span>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/medicines"
            className="mt-8 inline-flex items-center gap-4 text-sm font-semibold text-[var(--brand)]"
          >
            Find your next step <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
