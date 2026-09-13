import Link from "next/link";
import { ArrowRight, Bell, Package } from "lucide-react";
import CareIntentNavigator from "@/app/components/care/CareIntentNavigator";

export default function PortalNextSteps({ readyForPickup }: { readyForPickup: number }) {
  return (
    <section aria-label="Your next step" className="mb-6">
      <CareIntentNavigator
        signedIn
        compact
        title="What do you need today?"
        description="Start with the task, not a pharmacy. We’ll connect availability and the right provider as you continue."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={readyForPickup ? "/portal/refills" : "/portal/orders"}
          className="group flex items-center gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Package className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold text-[var(--foreground)]">
              {readyForPickup ? `${readyForPickup} ready for collection` : "Track my requests"}
            </strong>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Orders, refill progress and payment updates.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
        </Link>

        <Link
          href="/portal/messages"
          className="group flex items-center gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 transition hover:border-[var(--brand)]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Bell className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold text-[var(--foreground)]">Messages & updates</strong>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Continue conversations about care already in progress.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
