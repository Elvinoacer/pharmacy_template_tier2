import Link from "next/link";
import { CheckCircle2, ShieldCheck, Store } from "lucide-react";
export default function PharmacyPricing() {
  return <section aria-label="Pharmacy pricing" className="my-6 overflow-hidden rounded-3xl border border-teal-700/20 bg-[var(--surface)] shadow-sm">
    <div className="bg-teal-950 px-6 py-7 text-white sm:px-8"><p className="text-xs font-semibold uppercase tracking-widest text-teal-200">Your pharmacy. More accessible.</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">A clear price for your next chapter.</h2><p className="mt-2 text-sm leading-6 text-teal-100">Give patients a place to find your medicines, discover your services and contact your team.</p></div>
    <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
      <div><ShieldCheck className="mb-3 h-6 w-6 text-teal-600"/><h3 className="font-semibold">Know Your Pharmacy</h3><p className="my-2 text-3xl font-bold">KES 100 <span className="text-sm font-normal text-[var(--muted)]">once</span></p><p className="text-sm leading-6 text-[var(--muted)]">Pay before submitting for independent review. Covers review of your premises, professional and business evidence. Payment does not guarantee approval.</p></div>
      <div><Store className="mb-3 h-6 w-6 text-teal-600"/><h3 className="font-semibold">Your platform service</h3><p className="my-2 text-3xl font-bold">KES 500 <span className="text-sm font-normal text-[var(--muted)]">/ month</span></p><p className="text-sm leading-6 text-[var(--muted)]">Starts when you activate service after verification and profile setup. A new invoice is issued each calendar month. Approve each M-Pesa payment on your phone.</p></div>
    </div>
    <ul className="grid gap-3 px-6 pb-6 text-sm sm:grid-cols-2 sm:px-8">{["Branded pharmacy storefront", "Medicine catalogue & stock management", "Patient orders & pharmacy services", "Patient conversations & follow-ups"].map(x => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600"/>{x}</li>)}</ul>
    <div className="border-t border-[var(--border)] px-6 py-5 text-sm sm:px-8"><p className="text-[var(--muted)]">Promotional places are limited. Allocated waivers and their duration appear in your billing screen before payment. M-Pesa provider charges, if any, are separate.</p><Link className="mt-3 inline-block font-semibold text-[var(--brand)] underline" href="/for-pharmacies/walkthrough">Explore the guided walkthrough →</Link></div>
  </section>;
}
