import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import HowDoYouFeelClient from "../components/feel/HowDoYouFeelClient";
import { pharmacy } from "../lib/data";

export const metadata: Metadata = {
  title: "How do you feel?",
  description: `Guided symptom check-in at ${pharmacy.name}. AI helps structure mild everyday concerns, then pharmacists can take over when needed.`,
  alternates: { canonical: "/how-do-you-feel" },
};

export default function HowDoYouFeelPage() {
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
