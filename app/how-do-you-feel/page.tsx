import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import HowDoYouFeelClient from "../components/feel/HowDoYouFeelClient";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";

export const metadata: Metadata = {
  title: "How do you feel?",
  description: `Guided symptom check-in at ${platform.name}. AI helps structure mild everyday concerns, then pharmacists can take over when needed.`,
  alternates: { canonical: "/how-do-you-feel" },
};

export default async function HowDoYouFeelPage() {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/how-do-you-feel" />;

  return (
    <div>
      <PageHero
        eyebrow="Care check-in"
        title="How do you feel?"
        description="Answer a few guided questions about mild everyday symptoms. Get general next steps, check in over time, and connect with a pharmacist when you want human advice."
        crumbs={[{ label: "How do you feel?" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <HowDoYouFeelClient mode="public" />
        </div>
      </section>
    </div>
  );
}
