"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Pill,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

type DemoId = "refill" | "scan" | "symptoms";

const DEMOS = [
  { id: "refill" as const, label: "Refill a prescription", href: "/refill", action: "Try a refill", icon: Pill },
  { id: "scan" as const, label: "Scan a medicine pack", href: "/medicines?photo=1", action: "Open photo search", icon: Camera },
  { id: "symptoms" as const, label: "Check how you feel", href: "/how-do-you-feel", action: "Start symptom check", icon: Sparkles },
];

const PROOF = [
  { value: "PPB", label: "licensed pharmacies", icon: ShieldCheck },
  { value: "< 45m", label: "local delivery", icon: Clock3 },
  { value: "M-Pesa", label: "ready checkout", icon: CheckCircle2 },
];

export default function LandingCareDemo() {
  const [active, setActive] = useState<DemoId>("refill");
  const selected = DEMOS.find((demo) => demo.id === active) ?? DEMOS[0];

  return (
    <section id="demo" className="relative overflow-hidden bg-[#f4f1e8] px-4 py-16 sm:px-6 sm:py-24">
      <div className="absolute -right-32 top-16 h-80 w-80 rounded-full bg-[#d7e8df] blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0d6e5a]">See it in action</p>
            <h2 className="mt-3 max-w-md text-3xl font-medium leading-tight tracking-tight text-slate-950 sm:text-5xl" style={{ fontFamily: "var(--font-display), serif" }}>
              Less waiting.<br />More getting better.
            </h2>

            <div className="mt-8 space-y-2" role="tablist" aria-label="Choose a care demonstration">
              {DEMOS.map((demo, index) => {
                const Icon = demo.icon;
                const isActive = active === demo.id;
                return (
                  <button
                    key={demo.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="care-demo-panel"
                    onClick={() => setActive(demo.id)}
                    className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all ${isActive ? "border-slate-900 bg-slate-950 text-white shadow-xl" : "border-black/10 bg-white/55 text-slate-700 hover:border-black/20 hover:bg-white"}`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-[#e8c547] text-slate-950" : "bg-white text-[#0d6e5a] shadow-sm"}`}><Icon className="h-5 w-5" /></span>
                    <span className="flex-1 text-sm font-semibold">{demo.label}</span>
                    <span className={`text-xs font-mono ${isActive ? "text-white/45" : "text-slate-400"}`}>0{index + 1}</span>
                  </button>
                );
              })}
            </div>

            <Link href={selected.href} className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-950 underline decoration-[#e8c547] decoration-2 underline-offset-4">
              {selected.action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div id="care-demo-panel" role="tabpanel" className="relative mx-auto w-full max-w-2xl">
            <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-[#0d6e5a]/20 via-transparent to-[#e8c547]/25 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#09120f] p-3 shadow-[0_30px_80px_rgba(15,23,42,0.25)] sm:rounded-[2.6rem] sm:p-5">
              <div className="flex items-center justify-between px-3 pb-4 pt-2 text-white/55"><span className="text-[10px] font-semibold tracking-wide">AETHER CARE</span><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /><span className="text-[10px]">Online</span></div></div>
              <div className="min-h-[430px] overflow-hidden rounded-[1.45rem] bg-[#f8faf8] sm:min-h-[470px] sm:rounded-[2rem]">
                {active === "refill" && <RefillDemo />}
                {active === "scan" && <ScanDemo />}
                {active === "symptoms" && <SymptomsDemo />}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-2xl border border-black/10 bg-white/60 sm:grid-cols-3">
          {PROOF.map(({ value, label, icon: Icon }) => (
            <div key={value} className="flex items-center gap-3 border-b border-black/10 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <Icon className="h-5 w-5 text-[#0d6e5a]" /><div><p className="text-sm font-bold text-slate-950">{value}</p><p className="text-[11px] text-slate-500">{label}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0d6e5a]">{eyebrow}</p><h3 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">{title}</h3></div>;
}

function RefillDemo() {
  return (
    <div><DemoHeader eyebrow="Prescription refill" title="Your repeat medicine, in three taps" /><div className="p-5 sm:p-7">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50"><Pill className="h-5 w-5 text-[#0d6e5a]" /></div><div className="flex-1"><p className="text-sm font-bold text-slate-900">Amlodipine 5mg</p><p className="text-[11px] text-slate-500">28 tablets · Repeat available</p></div><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div></div>
      <div className="my-4 flex items-start justify-between text-center">{["Select", "Pay", "Delivered"].map((step, index) => <div key={step} className="flex flex-1 items-start"><div className="flex-1"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#0d6e5a] text-white"><Check className="h-3.5 w-3.5" /></span><p className="mt-1 text-[10px] font-semibold text-slate-600">{step}</p></div>{index < 2 && <span className="mt-3.5 h-px w-4 bg-emerald-300 sm:w-10" />}</div>)}</div>
      <div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="flex items-center justify-between"><span className="text-xs text-white/60">M-Pesa</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-300">Payment confirmed</span></div><p className="mt-4 font-mono text-lg">KSh 480</p></div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#e8c547]/20 p-4"><Truck className="h-5 w-5 text-slate-900" /><div><p className="text-xs font-bold text-slate-900">Courier is 12 minutes away</p><p className="text-[10px] text-slate-600">Live updates by SMS & WhatsApp</p></div></div>
    </div></div>
  );
}

function ScanDemo() {
  return (
    <div><DemoHeader eyebrow="Photo medicine search" title="Point. Scan. Find nearby." /><div className="p-5 sm:p-7">
      <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950"><div className="absolute inset-6 rounded-2xl border border-dashed border-white/30" /><div className="h-28 w-20 rotate-[-6deg] rounded-lg bg-white p-2 shadow-2xl"><div className="h-4 rounded bg-[#0d6e5a]" /><p className="mt-3 text-[8px] font-bold text-slate-800">CETIRIZINE</p><p className="text-[6px] text-slate-400">10mg · 10 tablets</p><div className="mt-3 h-8 rounded bg-emerald-50" /></div><span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] text-white backdrop-blur"><Camera className="mr-1 inline h-3 w-3" /> Pack detected</span></div>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div><p className="text-xs font-bold text-emerald-950">Match found: Cetirizine 10mg</p><p className="mt-0.5 text-[10px] text-emerald-700">Available at 4 nearby pharmacies</p></div><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><MapPin className="h-5 w-5 text-[#0d6e5a]" /><div className="flex-1"><p className="text-xs font-bold text-slate-900">Westlands · 1.2 km</p><p className="text-[10px] text-slate-500">In stock · Delivery available</p></div><ArrowRight className="h-4 w-4 text-slate-400" /></div>
    </div></div>
  );
}

function SymptomsDemo() {
  return (
    <div><DemoHeader eyebrow="Guided symptom check" title="Tell us what feels wrong" /><div className="p-5 sm:p-7">
      <div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-white"><Sparkles className="h-4 w-4" /></div><div className="max-w-sm rounded-2xl rounded-tl-sm bg-white p-4 text-xs leading-5 text-slate-700 shadow-sm">Hi Amina — where are you feeling discomfort?</div></div>
      <div className="mt-4 flex flex-wrap gap-2 pl-12">{["Head", "Chest", "Stomach", "Skin", "Other"].map((item, index) => <span key={item} className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${index === 2 ? "border-[#0d6e5a] bg-[#0d6e5a] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{item}</span>)}</div>
      <div className="mt-5 flex justify-end"><div className="rounded-2xl rounded-tr-sm bg-[#e8c547] px-4 py-3 text-xs font-semibold text-slate-950">Stomach · since this morning</div></div>
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700" /><p className="text-xs font-bold text-emerald-950">No emergency signs detected</p></div><div className="mt-3 flex items-center justify-between border-t border-emerald-200 pt-3"><span className="text-[10px] text-emerald-800">Next: pharmacist guidance</span><MessageCircle className="h-4 w-4 text-emerald-700" /></div></div>
      <p className="mt-3 text-center text-[9px] text-slate-400">Not a diagnosis. Emergency symptoms are escalated immediately.</p>
    </div></div>
  );
}