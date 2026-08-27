"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag } from "lucide-react";

const OTC_CATEGORIES = [
  {
    title: "Cold & Flu",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/cold-flu.webp",
    href: "/medicines?category=cold-flu",
  },
  {
    title: "Pain Relief",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/pain-relief.webp",
    href: "/medicines?category=pain-relief",
  },
  {
    title: "Vitamins",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/vitamins-supplements.webp",
    href: "/medicines?category=vitamins",
  },
  {
    title: "Baby Care",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/baby-care.webp",
    href: "/medicines?category=baby-care",
  },
  {
    title: "Diabetes",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/diabetes-management.webp",
    href: "/medicines?category=diabetes",
  },
  {
    title: "Dermatology",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/skin-care.webp",
    href: "/medicines?category=skin-care",
  },
  {
    title: "First Aid",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/first-aid.webp",
    href: "/medicines?category=first-aid",
  },
  {
    title: "Women's Health",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/otc/womens-health.webp",
    href: "/medicines?category=womens-health",
  },
];

export default function LandingOtcSpotlight() {
  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-20 bg-[#f8fafc] border-t border-slate-200/80">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f172a]">
              OTC Essentials
            </p>
            <h2
              className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a] sm:text-3xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Everyday Healthcare
            </h2>
          </div>
          <Link href="/medicines" className="text-xs font-semibold text-[#0f172a] hover:underline">
            View all →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {OTC_CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md text-center"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                  sizes="160px"
                />
              </div>
              <div className="p-2.5">
                <p className="font-semibold text-xs text-[#0f172a] truncate">{cat.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
