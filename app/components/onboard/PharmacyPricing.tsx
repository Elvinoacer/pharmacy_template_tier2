"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, ShieldCheck, Store } from "lucide-react";
import OnboardingValueStory from "./OnboardingValueStory";

export default function PharmacyPricing() {
  const pathname = usePathname();

  if (pathname === "/onboard") {
    return <OnboardingValueStory />;
  }

  return (
    <section aria-label="Pharmacy pricing" className="my-6 overflow-hidden rounded-3xl border border-teal-700/20 bg-[var(--surface)] shadow-sm">
      <div className="bg-teal-950 px-6 py-7 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">Simple pharmacy pricing</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Verification first. Platform service when you activate.</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        <div>
          <ShieldCheck className="mb-3 h-6 w-6 text-teal-600" />
          <h3 className="font-semibold">Know Your Pharmacy</h3>
          <p className="my-2 text-3xl font-bold">KES 100 <span className="text-sm font-normal text-[var(--muted)]">once</span></p>
          <p className="text-sm leading-6 text-[var(--muted)]">Independent review of the pharmacy evidence submitted for verification. Payment does not guarantee approval.</p>
        </div>
        <div>
          <Store className="mb-3 h-6 w-6 text-teal-600" />
          <h3 className="font-semibold">Platform service</h3>
          <p className="my-2 text-3xl font-bold">KES 500 <span className="text-sm font-normal text-[var(--muted)]">/ month</span></p>
          <p className="text-sm leading-6 text-[var(--muted)]">Starts after verification, profile setup and activation. A new invoice is issued each calendar month.</p>
        </div>
      </div>
      <ul className="grid gap-3 px-6 pb-6 text-sm sm:grid-cols-2 sm:px-8">
        {["Branded pharmacy storefront", "Medicine catalogue & stock management", "Patient orders & pharmacy services", "Patient conversations & follow-ups"].map((item) => (
          <li key={item} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />{item}</li>
        ))}
      </ul>
      <div className="border-t border-[var(--border)] px-6 py-5 text-sm sm:px-8">
        <p className="text-[var(--muted)]">Promotional waivers, where allocated, appear in billing before payment. M-Pesa provider charges, if any, are separate.</p>
        <Link className="mt-3 inline-block font-semibold text-[var(--brand)] underline" href="/for-pharmacies/walkthrough">Explore the guided walkthrough →</Link>
      </div>
    </section>
  );
}
