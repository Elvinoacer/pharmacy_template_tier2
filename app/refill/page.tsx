import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../components/PageHero";
import RefillForm from "../components/RefillForm";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";

export const metadata: Metadata = {
  title: "Request a Refill",
  description: `Request a prescription refill from ${platform.name}.`,
  alternates: { canonical: "/refill" },
};

export default async function RefillPage({
  searchParams,
}: {
  searchParams?: Promise<{ changePharmacy?: string }>;
}) {
  const params = await searchParams;
  const pharmacy = await loadStorefront();

  // A refill must always belong to one pharmacy tenant. Never accept an
  // ambiguous request when the user has no active pharmacy context.
  if (!pharmacy || params?.changePharmacy === "1") {
    return <ChoosePharmacy next="/refill" />;
  }

  return (
    <div>
      <PageHero
        eyebrow="Refills"
        title="Request a refill"
        description={`Send a refill request to ${pharmacy.name}.`}
        crumbs={[{ label: "Request a refill" }]}
      />

      <section className="px-4 pb-28 pt-2 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-teal-900/10 bg-white/75 px-4 py-3 shadow-sm sm:mb-7 sm:px-5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0d6e5a]">Requesting from</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[#0c1a14]">{pharmacy.name}</p>
            </div>
            <Link href="/refill?changePharmacy=1" className="shrink-0 text-xs font-semibold text-[#0b5f50] hover:underline">
              Change pharmacy
            </Link>
          </div>

          <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-teal-900/10 bg-white/75 shadow-sm sm:mb-7">
            {[
              ["1", "Send request"],
              ["2", "Pharmacy reviews"],
              ["3", "You’re updated"],
            ].map(([step, label], index) => (
              <div key={step} className={`flex min-w-0 items-center gap-2 px-3 py-3 sm:px-5 ${index < 2 ? "border-r border-teal-900/10" : ""}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d6e5a] text-xs font-bold text-white">{step}</span>
                <span className="text-xs font-semibold text-[#31423a] sm:text-sm">{label}</span>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/95 p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4 border-b border-teal-900/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                  Refill details
                </h2>
                <p className="mt-1 text-sm text-[#5a6b62]">Tell {pharmacy.name} what you need.</p>
              </div>
              <Link href="/portal/refills" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-900/10 px-4 text-sm font-semibold text-[#0b5f50] transition hover:bg-teal-50 active:scale-[0.98]">
                Patient portal →
              </Link>
            </div>

            <RefillForm pharmacyName={pharmacy.name} />
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-teal-900/10 bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-sm font-semibold text-[#0c1a14]">Need help now?</p>
              <p className="mt-0.5 text-xs text-[#5a6b62]">Contact {pharmacy.name} directly.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={pharmacy.phoneHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-900/10 px-4 text-sm font-semibold text-[#0b5f50] hover:bg-teal-50">
                Call
              </a>
              <a href={pharmacy.whatsappHref} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0d6e5a] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0b5f50]">
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
