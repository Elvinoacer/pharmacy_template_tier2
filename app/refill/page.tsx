import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../components/PageHero";

import { pharmacy } from "../lib/data";

export const metadata: Metadata = {
  title: "Request a Refill",
  description: `Request a prescription refill from ${pharmacy.name}. Online request form with confirmation — no clinical workflow in Tier 1.`,
  alternates: { canonical: "/refill" },
};

export default function RefillPage() {
  return (
    <div>
      <PageHero
        eyebrow="Refills"
        title="Request a prescription refill"
        description="Refills are now managed securely through our Customer Portal. This ensures your medical records remain private and accurate."
        crumbs={[{ label: "Request a refill" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div className="relative rounded-3xl border border-white/70 bg-white/90 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                Log in to request a refill
              </h2>
              <p className="mt-2 text-[#5a6b62]">
                To ensure patient safety and verify your prescription details, all refill requests require a free account.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Link href="/login" className="btn-primary flex-1 sm:flex-none justify-center px-8">
                Log in to portal
              </Link>
              <Link href="/register" className="btn-ghost flex-1 sm:flex-none justify-center px-8 border border-teal-800 text-teal-800 hover:bg-teal-50 rounded-full font-medium py-2.5">
                Create an account
              </Link>
            </div>
            <p className="text-xs text-[#5a6b62] max-w-sm">
              If you have an existing prescription with us but haven't created an online account, setting one up takes less than a minute.
            </p>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2
                className="text-lg font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Why use the portal?
              </h2>
              <ol className="mt-4 space-y-3 text-sm text-[#5a6b62]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    1
                  </span>
                  See all your active prescriptions and remaining refills.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    2
                  </span>
                  Get immediate confirmation on the status of your refill request.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    3
                  </span>
                  Manage home delivery preferences and reminders securely.
                </li>
              </ol>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                Prefer to call?
              </h2>
              <p className="mt-2 text-sm text-[#5a6b62]">
                Speak with the team at{" "}
                <a href={pharmacy.phoneHref} className="font-semibold text-teal-800">
                  {pharmacy.phone}
                </a>{" "}
                or{" "}
                <a href={pharmacy.whatsappHref} className="font-semibold text-teal-800">
                  WhatsApp
                </a>
                .
              </p>
            </div>
            <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-5 text-sm text-amber-950">
              Controlled substances and certain specialty medicines may require additional verification or cannot be
              requested online.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
