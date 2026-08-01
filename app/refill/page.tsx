import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../components/PageHero";
import RefillForm from "../components/RefillForm";
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
        description="Submit a simple request and our team will prepare your medication when possible. You will receive confirmation of the request — clinical fulfilment is handled by pharmacy staff."
        crumbs={[{ label: "Request a refill" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.85fr]">
          <div className="relative rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8">
            <RefillForm />
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2
                className="text-lg font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                What happens next?
              </h2>
              <ol className="mt-4 space-y-3 text-sm text-[#5a6b62]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    1
                  </span>
                  We receive your request and check the prescription on file.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    2
                  </span>
                  If refills remain, we prepare it. If not, we may contact your prescriber.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    3
                  </span>
                  We notify you when it is ready for pickup or delivery.
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
              <Link href="/delivery" className="mt-4 inline-block text-sm font-semibold text-teal-800 hover:underline">
                Need delivery instead? →
              </Link>
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
