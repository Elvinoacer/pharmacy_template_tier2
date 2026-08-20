import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../components/PageHero";
import RefillForm from "../components/RefillForm";
import { pharmacy } from "../lib/data";

export const metadata: Metadata = {
  title: "Request a Refill",
  description: `Request a prescription refill from ${pharmacy.name}. Online request form with live tracking and pharmacist review.`,
  alternates: { canonical: "/refill" },
};

export default function RefillPage() {
  return (
    <div>
      <PageHero
        eyebrow="Prescription Services"
        title="Request a medication refill"
        description="Submit your refill request online for rapid pharmacist review, FEFO batch allocation, and convenient branch pickup or refrigerated home delivery."
        crumbs={[{ label: "Request a refill" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Main Form Box */}
          <div className="space-y-6">
            {/* Fast-track Portal Banner */}
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                  Already have a prescription on file?
                </h3>
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80">
                  Log in to your patient portal to view remaining refills, track next due dates, and 1-click re-order.
                </p>
              </div>
              <Link href="/portal/refills" className="btn-primary !py-2 !px-4 text-xs shrink-0">
                Open Patient Portal →
              </Link>
            </div>

            {/* Direct Guest / Quick Refill Form */}
            <div className="rounded-3xl border border-white/70 bg-white/95 p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                  Quick Refill Request Form
                </h2>
                <p className="mt-1 text-xs text-[#5a6b62]">
                  Fill in your details and medicine name. Our pharmacy team will verify your prescription and notify you via SMS/WhatsApp.
                </p>
              </div>

              <RefillForm />
            </div>
          </div>

          {/* Aside Information */}
          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2
                className="text-lg font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                How refill dispensing works
              </h2>
              <ol className="mt-4 space-y-3 text-sm text-[#5a6b62]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    1
                  </span>
                  <span><strong>Clinical Review:</strong> A licensed pharmacist verifies dose, interactions, and remaining refills.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    2
                  </span>
                  <span><strong>FEFO Preparation:</strong> Fresh stock from inspected batches is safely packaged with clear usage labels.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    3
                  </span>
                  <span><strong>Pickup or Delivery:</strong> Receive an instant SMS notification with ready status or live courier tracking.</span>
                </li>
              </ol>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
                Need urgent assistance?
              </h2>
              <p className="mt-2 text-sm text-[#5a6b62]">
                Speak directly with on-duty pharmacists at{" "}
                <a href={pharmacy.phoneHref} className="font-semibold text-emerald-800 hover:underline">
                  {pharmacy.phone}
                </a>{" "}
                or chat via{" "}
                <a href={pharmacy.whatsappHref} className="font-semibold text-emerald-800 hover:underline">
                  WhatsApp
                </a>
                .
              </p>
            </div>

            <div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-5 text-xs text-amber-950 space-y-1">
              <p className="font-bold">Controlled Substance Notice:</p>
              <p>Schedule II and III medications require physical prescription presentation and valid identification prior to dispensing.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
