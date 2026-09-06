import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import HowDoYouFeelClient from "../components/feel/HowDoYouFeelClient";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";
import "./feel.css";

export const metadata: Metadata = {
  title: "How do you feel?",
  description: `Guided symptom check-in at ${platform.name}. AI helps structure mild everyday concerns, then pharmacists can take over when needed.`,
  alternates: { canonical: "/how-do-you-feel" },
};

export default async function HowDoYouFeelPage() {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/how-do-you-feel" />;

  return (
    <main className="feel-page min-h-screen overflow-hidden bg-gradient-to-b from-emerald-50/45 via-white to-slate-50/70 text-slate-950 transition-colors dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[36rem] overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-32 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl dark:bg-emerald-400/10" />
        <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl dark:bg-cyan-400/10" />
      </div>

      <div className="relative z-10">
        <PageHero
          eyebrow="Care check-in"
          title="How do you feel?"
          description="Answer a few guided questions about mild everyday symptoms. Get general next steps, check in over time, and connect with a pharmacist when you want human advice."
          crumbs={[{ label: "How do you feel?" }]}
        />

        <section className="px-3 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/55 p-2 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:rounded-[2rem] sm:p-3 dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_24px_80px_-42px_rgba(0,0,0,0.8)]">
              <HowDoYouFeelClient mode="public" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
