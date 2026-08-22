"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  Lock,
  ThermometerSnowflake,
} from "lucide-react";

export default function LandingBentoGrid() {
  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl">
        {/* Minimal Section Heading */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f172a]">
            Platform Infrastructure
          </p>
          <h2
            className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a] sm:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Why Aether
          </h2>
        </div>

        {/* 4 Clean Visual Bento Tiles */}
        <div className="mt-8 grid gap-5 md:grid-cols-12">
          {/* Tile 1: Universal Patient Card (7 cols) */}
          <div className="group relative md:col-span-7 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-[#0c131a] p-6 text-white sm:p-8">
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/gallery/careful_dispensing.webp"
                alt="Pharmacist checking profile"
                fill
                className="object-cover opacity-20"
                sizes="(max-width: 1024px) 100vw, 700px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060a0e] via-[#0c131a]/90 to-transparent" />
            </div>

            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
                <Lock className="h-3 w-3" />
                Universal Patient ID
              </span>

              <h3
                className="mt-4 text-xl font-medium text-white sm:text-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                One record. Every accredited counter.
              </h3>
              <p className="mt-2 text-xs text-slate-300 max-w-md">
                Allergies and chronic refills sync securely across all network pharmacies.
              </p>

              {/* Minimal Mockup Card */}
              <div className="mt-6 rounded-xl border border-white/15 bg-black/50 p-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-black font-bold text-xs">
                      AK
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Amina Kiprono</p>
                      <p className="text-[10px] text-slate-400">ID: #KE-84920</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-amber-300 font-semibold">● Active Refill</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3 border-t border-white/10">
              <Link href="/register" className="text-xs font-bold text-amber-300 hover:underline">
                Create patient account →
              </Link>
            </div>
          </div>

          {/* Tile 2: WhatsApp & M-Pesa (5 cols) */}
          <div className="relative md:col-span-5 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-[#0f1722] p-6 text-white sm:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                <Smartphone className="h-3 w-3" />
                Channels
              </span>

              <h3
                className="mt-4 text-xl font-medium text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                WhatsApp & M-Pesa Native
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                Order over WhatsApp chat. Instant Lipa na M-Pesa STK push.
              </p>

              {/* Minimal Chat Bubble */}
              <div className="mt-6 space-y-2 text-xs">
                <div className="rounded-lg bg-slate-800 p-2 text-slate-200 text-[11px] max-w-[85%]">
                  "Refill my prescription slip please."
                </div>
                <div className="rounded-lg bg-slate-700 p-2 text-white text-[11px] max-w-[85%] ml-auto">
                  "Verified! Sending M-Pesa prompt. Delivery in 35m."
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/10 text-xs text-amber-200 font-semibold">
              ✓ Zero platform surcharges
            </div>
          </div>

          {/* Tile 3: Cold Chain (6 cols) */}
          <div className="relative md:col-span-6 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-300">
                  <ThermometerSnowflake className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                  4.2°C · Monitored
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-base text-[#0f172a]">
                Cold-Chain Certified
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                2°C–8°C digital temperature tracking for vaccines and insulins.
              </p>
            </div>
          </div>

          {/* Tile 4: Caregiver Circle (6 cols) */}
          <div className="relative md:col-span-6 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <Link href="/caregiver" className="text-xs font-bold text-[#0f172a] hover:underline">
                  Open portal →
                </Link>
              </div>
              <h3 className="mt-4 font-semibold text-base text-[#0f172a]">
                Caregiver & Family Circles
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Manage medications for elderly parents or children with auto-refills.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
