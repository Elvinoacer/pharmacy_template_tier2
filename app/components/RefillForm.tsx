"use client";

import { useState, type FormEvent } from "react";
import TenantLink from "./TenantLink";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, MapPin, Pill, ShieldCheck, UserRound } from "lucide-react";
import { FormSuccess, TextArea, TextInput } from "./FormField";

export default function RefillForm({ pharmacyName }: { pharmacyName: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <FormSuccess
        title="Refill request sent"
        message={`Your request was sent securely to ${pharmacyName}. Their team will review it and contact you about availability.`}
        actions={
          <>
            <TenantLink href="/" className="btn-primary btn-primary-sm">Back to pharmacy home</TenantLink>      <TenantLink href="/delivery" className="btn-ghost btn-ghost-sm">Ask about delivery</TenantLink>    </>
        }
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-[#dceee9] bg-[#f3faf8] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d6e5a] text-white">
          <Pill className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-bold text-[#0c1a14]">Requesting from {pharmacyName}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-3 w-3" /> Selected pharmacy
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#5a6b62]">Your request will go directly to this pharmacy.</p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5f1] text-[#0d6e5a]"><UserRound className="h-4 w-4" /></div>
          <div><h3 className="text-sm font-bold text-[#0c1a14]">Your details</h3><p className="text-xs text-[#718078]">How the pharmacy can reach you.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Full name" id="fullName" required autoComplete="name" placeholder="Your full name" />
          <TextInput label="Phone number" id="phone" type="tel" required autoComplete="tel" placeholder="07XX XXX XXX" />
        </div>
        <div className="mt-4">
          <TextInput label="Email" id="email" type="email" autoComplete="email" placeholder="you@example.com (optional)" />
        </div>
      </section>

      <section className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5f1] text-[#0d6e5a]"><FileText className="h-4 w-4" /></div>
          <div><h3 className="text-sm font-bold text-[#0c1a14]">Medication</h3><p className="text-xs text-[#718078]">Tell us what you need refilled.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Medicine name" id="medicine" required placeholder="e.g. Lisinopril 10mg" />
          <TextInput label="Prescription number" id="rxNumber" placeholder="Optional" />
        </div>
      </section>

      <section className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5f1] text-[#0d6e5a]"><MapPin className="h-4 w-4" /></div>
          <div><h3 className="text-sm font-bold text-[#0c1a14]">Collection</h3><p className="text-xs text-[#718078]">When would you like to collect it?</p></div>
        </div>
        <TextInput label="Preferred pickup date" id="pickupDate" type="date" required />
        <div className="mt-4">
          <TextArea label="Notes" id="notes" rows={3} placeholder="Anything the pharmacy should know? (optional)" />
        </div>
      </section>

      <div className="absolute left-[-9999px]" aria-hidden><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>

      {status === "error" && <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">Something went wrong. Please try again or contact the pharmacy directly.</p>}

      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
          <p className="text-xs leading-5 text-[#5a6b62]">Your details are sent to <span className="font-semibold text-[#31423a]">{pharmacyName}</span> for refill processing. This request is not a prescription or clinical approval.</p>
        </div>
      </div>

      <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0d6e5a] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(13,110,90,0.18)] transition hover:bg-[#0b5f50] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" disabled={status === "submitting"}>
        {status === "submitting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending request…</> : "Send refill request"}
      </button>
      <p className="text-center text-[11px] text-[#7a8781]">You can change your selected pharmacy before submitting.</p>
    </form>
  );
}
