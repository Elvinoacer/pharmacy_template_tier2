"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag, Sparkles, Truck } from "lucide-react";

const OTC_CATEGORIES = [
  {
    title: "Cold, Flu & Cough",
    desc: "Decongestants, saline sprays, soothing lozenges, and syrups.",
    image: "/images/otc/cold-flu.webp",
    href: "/medicines?category=cold-flu",
    tag: "Fast Relief",
  },
  {
    title: "Pain Relief & Fever",
    desc: "Paracetamol, ibuprofen, topical pain rubs, and joint care.",
    image: "/images/otc/pain-relief.webp",
    href: "/medicines?category=pain-relief",
    tag: "Daily Essential",
  },
  {
    title: "Vitamins & Immunity",
    desc: "Vitamin C, Zinc, Multivitamins, and immune boosters.",
    image: "/images/otc/vitamins-supplements.webp",
    href: "/medicines?category=vitamins",
    tag: "Wellness",
  },
  {
    title: "Baby & Child Health",
    desc: "Pediatric drops, teething gels, gripe water, and thermometers.",
    image: "/images/otc/baby-care.webp",
    href: "/medicines?category=baby-care",
    tag: "Pediatric",
  },
  {
    title: "Diabetes Care & Monitoring",
    desc: "Glucose test strips, sterile lancets, and monitoring kits.",
    image: "/images/otc/diabetes-management.webp",
    href: "/medicines?category=diabetes",
    tag: "Chronic Care",
  },
  {
    title: "Skin & Dermatology",
    desc: "Eczema ointments, antifungal creams, and barrier lotions.",
    image: "/images/otc/skin-care.webp",
    href: "/medicines?category=skin-care",
    tag: "Dermatological",
  },
  {
    title: "First Aid & Trauma",
    desc: "Sterile gauze, antiseptics, adhesive strips, and burn gels.",
    image: "/images/otc/first-aid.webp",
    href: "/medicines?category=first-aid",
    tag: "Home Safety",
  },
  {
    title: "Women's Health",
    desc: "Prenatal folic acid, iron supplements, and cycle support.",
    image: "/images/otc/womens-health.webp",
    href: "/medicines?category=womens-health",
    tag: "Women's Care",
  },
];

export default function LandingOtcSpotlight() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#f4f7f4] border-t border-teal-900/5">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#0d6e5a]">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Over-The-Counter Essentials</span>
            </div>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Everyday Healthcare,{" "}
              <span className="italic text-[#0d6e5a]">Delivered to Your Door.</span>
            </h2>
            <p className="mt-2 text-sm text-[#5a6b62] sm:text-base">
              Non-prescription essentials from verified neighbourhood chemists. Same-day delivery in 35–45 minutes.
            </p>
          </div>

          <Link
            href="/medicines"
            className="inline-flex items-center gap-2 rounded-full bg-[#0d6e5a] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#084c3f]"
          >
            <span>Browse Full OTC Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 8-Grid OTC Showcase Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {OTC_CATEGORIES.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-teal-900/8 bg-white shadow-[0_8px_30px_rgba(8,40,32,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[#0d6e5a]/30 hover:shadow-[0_20px_50px_rgba(8,40,32,0.12)]"
            >
              {/* Product Category Photo */}
              <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#084c3f] shadow-sm backdrop-blur">
                  {cat.tag}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3
                    className="text-base font-semibold text-[#0c1a14] group-hover:text-[#0d6e5a] transition"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {cat.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#5a6b62]">
                    {cat.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-medium text-[#8a9a92] flex items-center gap-1">
                    <Truck className="h-3 w-3 text-[#0d6e5a]" />
                    In stock
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0d6e5a] group-hover:translate-x-0.5 transition">
                    <span>Shop</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
