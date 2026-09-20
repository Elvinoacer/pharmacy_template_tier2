import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import HowDoYouFeelStableClient from "../components/feel/HowDoYouFeelStableClient";
import { platform } from "../lib/data";
import { getTenant, listMarketplacePharmacies } from "../lib/tenant";
import "./feel.css";

export const metadata: Metadata = {
  title: "How do you feel?",
  description: `Guided symptom check-in at ${platform.name}. AI helps structure mild everyday concerns, then pharmacists can take over when needed.`,
  alternates: { canonical: "/how-do-you-feel" },
};

export default async function HowDoYouFeelPage(props?: {
  searchParams?: Promise<{ pharmacy?: string }>;
}) {
  const searchParams = props?.searchParams ? await props.searchParams : undefined;
  const tenant = await getTenant();
  const initialSlug = searchParams?.pharmacy?.trim() || tenant.slug || null;
  const rawPharmacies = await listMarketplacePharmacies();
  const pharmacies = rawPharmacies.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    address: p.city ? `${p.city}, ${p.county || ""}` : undefined,
  }));

  return (
    <main className="feel-page min-h-screen overflow-hidden bg-transparent text-[var(--foreground)] transition-colors">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[36rem] overflow-hidden"
        aria-hidden="true"
      >
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
            <div className="liquid-glass care-glass rounded-[1.75rem] border border-[var(--feel-border)] bg-[var(--feel-panel)] p-2 shadow-xl backdrop-blur-xl sm:rounded-[2rem] sm:p-3">
              <HowDoYouFeelStableClient
                mode="public"
                pharmacySlug={initialSlug}
                pharmacies={pharmacies}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
