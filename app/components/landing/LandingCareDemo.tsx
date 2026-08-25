"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  HeartPulse,
  Lock,
  MapPin,
  MessageCircle,
  Pill,
  ShieldCheck,
  Sparkles,
  Truck,
  FileText,
  ScanLine,
} from "lucide-react";

type DemoTabId = "refill" | "scan" | "symptoms" | "orders";

interface DemoTab {
  id: DemoTabId;
  num: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}

const TABS: DemoTab[] = [
  {
    id: "refill",
    num: "01",
    title: "Refill a prescription",
    desc: "Quick & easy",
    icon: Pill,
  },
  {
    id: "scan",
    num: "02",
    title: "Scan a medicine pack",
    desc: "Verify your medicine",
    icon: Camera,
  },
  {
    id: "symptoms",
    num: "03",
    title: "Check how you feel",
    desc: "Track your wellness",
    icon: HeartPulse,
  },
  {
    id: "orders",
    num: "04",
    title: "View your orders",
    desc: "Track & manage",
    icon: FileText,
  },
];

export default function LandingCareDemo() {
  const [activeTab, setActiveTab] = useState<DemoTabId>("refill");

  return (
    <section
      id="demo"
      className="relative overflow-hidden bg-[#030907] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8"
    >
      {/* Background Stills: bg_image_see_it_in_action.png */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <Image
          src="/images/landing/bg_image_see_it_in_action.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-70"
        />
        {/* Soft edge gradients and deep emerald vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030907] via-transparent to-[#030907]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030907]/95 via-[#030907]/60 to-transparent" />
        <div className="absolute -left-28 top-1/4 h-[32rem] w-[32rem] rounded-full bg-emerald-600/15 blur-[150px]" />
        <div className="absolute right-10 top-1/3 h-[35rem] w-[35rem] rounded-full bg-emerald-500/10 blur-[160px]" />
        <div className="landing-grain opacity-[0.06]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* 3-Column Split: Left Copy & Trust, Middle Tabs, Right Glass Panel */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-8 xl:gap-12">
          
          {/* Left Column: Headline, Subtitle, 3 Trust Indicators */}
          <div className="lg:col-span-4 xl:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#2dd4bf]">
              Aether Care
            </p>

            <h2
              className="mt-4 text-4xl font-normal leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Less waiting.
              <br />
              More getting
              <br />
              <span className="italic text-[#8ce394] drop-shadow-[0_2px_14px_rgba(140,227,148,0.35)]">
                better.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
              Refill prescriptions, track orders, and get your medicines delivered — all in one secure place.
            </p>

            {/* 3 Trust Feature Rows */}
            <div className="mt-8 space-y-4">
              {/* Row 1 */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Secure & private</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Your health data is protected</p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Save time</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Refill in minutes, pay securely</p>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Fast delivery</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Medicines to your doorstep</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: 4 Interactive Action Tabs */}
          <div className="lg:col-span-3 xl:col-span-3">
            <div className="space-y-3 rounded-[2rem] border border-white/10 bg-black/30 p-3 shadow-2xl backdrop-blur-xl">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex w-full items-center justify-between gap-3.5 rounded-2xl p-3.5 text-left transition-all duration-200 ${
                      isActive
                        ? "border border-emerald-400/40 bg-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        : "border border-transparent bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isActive
                            ? "border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                            : "border border-white/10 bg-white/5 text-slate-300 group-hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold transition-colors ${
                            isActive ? "text-white" : "text-slate-200 group-hover:text-white"
                          }`}
                        >
                          {tab.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {tab.desc}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        isActive ? "text-[#34d399]" : "text-slate-500"
                      }`}
                    >
                      {tab.num}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: 100% Frosted Glass Dynamic Showcase Panel */}
          <div className="lg:col-span-5 xl:col-span-5">
            <div className="relative rounded-[2.5rem] border border-emerald-400/30 bg-black/30 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(16,185,129,0.1),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-7">
              
              {/* Active Tab Showcase Content */}
              {activeTab === "refill" && <RefillTabContent />}
              {activeTab === "scan" && <ScanTabContent />}
              {activeTab === "symptoms" && <SymptomsTabContent />}
              {activeTab === "orders" && <OrdersTabContent />}

            </div>
          </div>

        </div>

        {/* Bottom 3-Pillar Proof Bar */}
        <div className="mt-12 rounded-[2rem] border border-white/10 bg-black/30 p-5 shadow-xl backdrop-blur-xl sm:mt-16 sm:p-6 lg:p-7">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:divide-x sm:divide-white/10 sm:gap-4">
            {/* Pillar 1: PPB */}
            <div className="flex items-center gap-3.5 sm:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-white sm:text-lg">PPB</p>
                <p className="text-xs text-slate-400 mt-0.5">Licensed pharmacies</p>
              </div>
            </div>

            {/* Pillar 2: Delivery */}
            <div className="flex items-center gap-3.5 sm:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-white sm:text-lg">&lt; 45m</p>
                <p className="text-xs text-slate-400 mt-0.5">Local delivery</p>
              </div>
            </div>

            {/* Pillar 3: M-Pesa */}
            <div className="flex items-center gap-3.5 sm:px-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-950/60 text-emerald-400 shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-white sm:text-lg">M-Pesa</p>
                <p className="text-xs text-slate-400 mt-0.5">Ready checkout</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

/**
 * 01: Prescription Refill Showcase (Exact match to see_it_in_action.png)
 */
function RefillTabContent() {
  return (
    <div>
      {/* Top Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
            Prescription Refill
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Online
        </span>
      </div>

      <h3
        className="mt-3 text-2xl font-normal tracking-tight text-white sm:text-3xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Your repeat medicine,
        <br />
        in three simple steps
      </h3>

      {/* Card 1: Medicine Selection */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Amlodipine 5mg</h4>
            <p className="text-xs text-slate-400 mt-0.5">28 tablets • Repeat available</p>
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400 bg-emerald-500/20 text-emerald-400">
          <Check className="h-4 w-4" />
        </div>
      </div>

      {/* 3-Step Progress Tracker */}
      <div className="relative mt-6 px-4 py-2">
        <div className="absolute left-10 right-10 top-5 border-t border-dashed border-emerald-500/30" />
        <div className="relative flex items-center justify-between text-center">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981] text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
            <span className="mt-2 text-xs font-semibold text-white">Select</span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981] text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
            <span className="mt-2 text-xs font-semibold text-white">Pay</span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981] text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
            <span className="mt-2 text-xs font-semibold text-white">Delivered</span>
          </div>
        </div>
      </div>

      {/* Card 2: Payment Confirmation */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4 shadow-sm backdrop-blur-md">
        <div>
          <p className="text-xs text-slate-400">Payment method</p>
          <p className="text-base font-bold text-white mt-0.5">M-Pesa</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-lg font-bold text-white mt-0.5">KSh 480</p>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Payment confirmed
          </span>
        </div>
      </div>

      {/* Card 3: Courier Live Status & Track Button */}
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-sm">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Courier is 12 minutes away</h4>
            <p className="text-xs text-slate-300/80 mt-0.5">Live updates by SMS & WhatsApp</p>
          </div>
        </div>
        <Link
          href="/refill"
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-700/80 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-600 active:scale-95"
        >
          <span>Track order</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * 02: Scan Medicine Pack Showcase
 */
function ScanTabContent() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
            Photo Medicine Scan
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300">
          <ScanLine className="h-3.5 w-3.5" />
          AI Active
        </span>
      </div>

      <h3
        className="mt-3 text-2xl font-normal tracking-tight text-white sm:text-3xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Point. Scan. Match.
        <br />
        Find stock in seconds
      </h3>

      <div className="relative mt-6 flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-black p-4">
        <div className="absolute inset-4 rounded-xl border border-dashed border-emerald-400/40" />
        <div className="h-24 w-20 rotate-[-4deg] rounded-lg bg-white/90 p-2 shadow-2xl">
          <div className="h-3 rounded bg-emerald-700" />
          <p className="mt-2 text-[8px] font-bold text-slate-900">CETIRIZINE</p>
          <p className="text-[6px] text-slate-500">10mg • 10 tabs</p>
          <div className="mt-2 h-6 rounded bg-emerald-100" />
        </div>
        <span className="absolute bottom-3 rounded-full border border-emerald-400/30 bg-black/80 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
          <Camera className="mr-1 inline h-3.5 w-3.5" /> Pack detected & verified
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-4">
        <div>
          <p className="text-xs font-bold text-white">Match found: Cetirizine 10mg</p>
          <p className="text-xs text-emerald-400 mt-0.5">Available at 4 accredited pharmacies nearby</p>
        </div>
        <Link
          href="/medicines?photo=1"
          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
        >
          View stock <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/**
 * 03: Check How You Feel Showcase
 */
function SymptomsTabContent() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
            AI Clinical Triage
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          Live Triage
        </span>
      </div>

      <h3
        className="mt-3 text-2xl font-normal tracking-tight text-white sm:text-3xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Tell us what feels wrong,
        <br />
        get expert guidance
      </h3>

      <div className="mt-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/10 p-3 text-xs text-slate-200">
            Hello — where in your body are you experiencing discomfort?
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pl-11">
          {["Head", "Chest", "Stomach", "Skin", "Fever"].map((area, i) => (
            <span
              key={area}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                i === 2
                  ? "border-emerald-400 bg-emerald-700/80 text-white"
                  : "border-white/10 bg-black/40 text-slate-300"
              }`}
            >
              {area}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-bold text-white">No red-flag emergency detected</p>
            </div>
            <Link
              href="/how-do-you-feel"
              className="text-xs font-bold text-emerald-300 hover:underline"
            >
              Start check →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 04: View Your Orders Showcase
 */
function OrdersTabContent() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2dd4bf]">
            Orders & Care Portal
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300">
          <FileText className="h-3.5 w-3.5" />
          Live Sync
        </span>
      </div>

      <h3
        className="mt-3 text-2xl font-normal tracking-tight text-white sm:text-3xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Track refills, deliveries
        <br />
        and schedules in real-time
      </h3>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700/80 text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Order #AE-9824</p>
              <p className="text-xs text-slate-400 mt-0.5">Out for delivery • Nairobi CBD</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            On the way
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800/60 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Next Refill Reminder</p>
              <p className="text-xs text-slate-400 mt-0.5">Metformin 500mg • In 4 days</p>
            </div>
          </div>
          <Link
            href="/portal"
            className="text-xs font-bold text-emerald-300 hover:underline"
          >
            Manage →
          </Link>
        </div>
      </div>
    </div>
  );
}