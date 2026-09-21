"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, CheckCircle2, Rocket } from "lucide-react";
import { goLiveAction } from "@/app/actions/tenant-admin";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

function PublishButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary min-h-12 w-full sm:w-auto px-8 justify-center inline-flex items-center gap-2 text-sm font-semibold shadow-md"
    >
      {pending ? "Publishing pharmacy…" : "Publish pharmacy & open dashboard"}
      {!pending ? <ArrowRight className="h-4 w-4" /> : null}
    </button>
  );
}

export function ReadyToLaunchStep({ snapshot }: { snapshot: PharmacyOnboardingSnapshot }) {
  const pharmacy = snapshot.pharmacy;
  const setup = snapshot.setup;
  if (!pharmacy) return null;

  const medicineLabel =
    setup && setup.counts.medicines > 0
      ? `${setup.counts.medicines} medicine${setup.counts.medicines === 1 ? "" : "s"} listed`
      : "Medicines deferred (add after launch)";

  const serviceLabel =
    setup && setup.counts.services > 0
      ? `${setup.counts.services} care service${setup.counts.services === 1 ? "" : "s"} listed`
      : "Pharmacy service on file";

  return (
    <div className={`${styles.form} ${styles.status} ${polish.wizardShell}`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 mb-3">
        <Rocket className="h-7 w-7" />
      </div>

      <p className={styles.kicker}>Ready for launch</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">
        {pharmacy.name} is ready for patients
      </h2>
      <p className="mt-1 max-w-md mx-auto text-xs text-[var(--muted)] leading-relaxed">
        Verification and storefront setup are complete. Publishing opens your free storefront. Premium is optional later if you need more than 5 public medicines or 2 services.
      </p>

      {/* Checklist grid */}
      <div className="my-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto text-left text-xs">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Verified premises</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Opening hours</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="truncate">{medicineLabel}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="truncate">{serviceLabel}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Public profile</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] p-3 font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Free plan included</span>
        </div>
      </div>

      <form action={goLiveAction}>
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <PublishButton />
      </form>

      <p className="mt-3 text-[11px] text-[var(--muted)]">
        Public storefront will be live at <strong>/p/{pharmacy.slug}</strong>
      </p>
    </div>
  );
}
