"use client";

import Link from "next/link";
import ImageUploadField from "@/app/components/admin/ImageUploadField";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Pill,
  ShieldCheck,
  Stethoscope,
  Store,
} from "lucide-react";
import {
  deferSetupMedicinesAction,
  saveSetupHoursAction,
  saveSetupProfileAction,
  saveSetupServiceAction,
} from "@/app/actions/pharmacy-setup";
import { SetupMedicineSearch } from "@/app/admin/setup/SetupMedicineSearch";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

type Props = {
  snapshot: PharmacyOnboardingSnapshot;
  initialStep?: "hours" | "medicines" | "services" | "profile";
};

export function PharmacySetupStep({ snapshot, initialStep }: Props) {
  const pharmacy = snapshot.pharmacy;
  const setup = snapshot.setup;
  if (!pharmacy) return null;

  // Determine current active sub-step based on completion
  const hoursOk = setup?.hoursOk ?? false;
  const medicinesOk = setup?.medicinesOk ?? false;
  const servicesOk = setup?.servicesOk ?? false;
  const profileOk = setup?.profileOk ?? false;

  const defaultStep = !hoursOk
    ? "hours"
    : !medicinesOk
      ? "medicines"
      : !servicesOk
        ? "services"
        : "profile";

  const activeSubStep = initialStep || defaultStep;

  return (
    <div className={`${styles.form} ${polish.wizardShell}`}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 8 · Storefront Setup</span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20">
          <ShieldCheck className="h-3.5 w-3.5" /> Pharmacy Verified
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Prepare your digital storefront</h2>
        <p>
          Your verification is approved. Prepare your opening hours, catalogue, and services for patients.
        </p>
      </header>

      {/* Sub-step indicator bar */}
      <div className="mb-5 grid grid-cols-4 gap-1.5 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-1.5 text-center text-xs">
        <Link
          href="/onboard?stage=setup&setupStep=hours"
          className={`p-2 rounded-xl transition-all ${
            activeSubStep === "hours"
              ? "bg-[var(--brand-soft)] text-[var(--brand)] font-bold shadow-xs"
              : hoursOk
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-[var(--muted)] opacity-70"
          }`}
        >
          <Clock3 className="h-4 w-4 mx-auto mb-1" />
          <span>Hours</span>
        </Link>
        <Link
          href="/onboard?stage=setup&setupStep=medicines"
          className={`p-2 rounded-xl transition-all ${
            activeSubStep === "medicines"
              ? "bg-[var(--brand-soft)] text-[var(--brand)] font-bold shadow-xs"
              : medicinesOk
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-[var(--muted)] opacity-70"
          }`}
        >
          <Pill className="h-4 w-4 mx-auto mb-1" />
          <span>Medicines</span>
        </Link>
        <Link
          href="/onboard?stage=setup&setupStep=services"
          className={`p-2 rounded-xl transition-all ${
            activeSubStep === "services"
              ? "bg-[var(--brand-soft)] text-[var(--brand)] font-bold shadow-xs"
              : servicesOk
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-[var(--muted)] opacity-70"
          }`}
        >
          <Stethoscope className="h-4 w-4 mx-auto mb-1" />
          <span>Services</span>
        </Link>
        <Link
          href="/onboard?stage=setup&setupStep=profile"
          className={`p-2 rounded-xl transition-all ${
            activeSubStep === "profile"
              ? "bg-[var(--brand-soft)] text-[var(--brand)] font-bold shadow-xs"
              : profileOk
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-[var(--muted)] opacity-70"
          }`}
        >
          <Store className="h-4 w-4 mx-auto mb-1" />
          <span>Profile</span>
        </Link>
      </div>

      {/* 1. Hours Sub-Step */}
      {activeSubStep === "hours" ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
            <Clock3 className="h-4 w-4" />
            <span>Storefront Hours</span>
          </div>

          <form action={saveSetupHoursAction} className="space-y-3">
            <input type="hidden" name="source" value="onboard" />
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />

            {[
              ["Monday – Friday", "weekday", "08:00", "20:00"],
              ["Saturday", "saturday", "09:00", "18:00"],
              ["Sunday", "sunday", "", ""],
            ].map(([label, key, defaultOpen, defaultClose]) => (
              <div
                key={key}
                className="grid gap-2 rounded-2xl bg-slate-50 dark:bg-white/[0.04] p-3 sm:grid-cols-[1fr_8rem_8rem] sm:items-center"
              >
                <span className="text-xs font-bold text-[var(--foreground)]">{label}</span>
                <label className="text-[10px] font-semibold text-[var(--muted)]">
                  Open
                  <input
                    type="time"
                    name={`${key}Open`}
                    defaultValue={defaultOpen}
                    className="mt-1 min-h-10 w-full rounded-xl border border-[var(--line-2)] bg-white dark:bg-black/30 px-2 text-xs"
                  />
                </label>
                <label className="text-[10px] font-semibold text-[var(--muted)]">
                  Close
                  <input
                    type="time"
                    name={`${key}Close`}
                    defaultValue={defaultClose}
                    className="mt-1 min-h-10 w-full rounded-xl border border-[var(--line-2)] bg-white dark:bg-black/30 px-2 text-xs"
                  />
                </label>
              </div>
            ))}

            <p className="text-[11px] text-[var(--muted)]">
              Leave weekend times blank if the pharmacy is closed on those days.
            </p>

            <div className={`${styles.actions} ${polish.actionsBar} mt-4`}>
              <button
                type="submit"
                className={`btn-primary justify-center ${polish.primaryAction}`}
              >
                Save & continue to medicines <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* 2. Medicines Sub-Step */}
      {activeSubStep === "medicines" ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
              <Pill className="h-4 w-4" />
              <span>Medicine Catalogue (Optional now)</span>
            </div>
            {setup && setup.counts.medicines > 0 ? (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {setup.counts.medicines} medicine{setup.counts.medicines === 1 ? "" : "s"} added
              </span>
            ) : null}
          </div>

          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Add medicines you already stock from the shared library — photos from the library come with them — or add them after launch. The free plan includes 5 public listings.
          </p>

          {setup && setup.counts.medicines > 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5" /> {setup.counts.medicines} medicine(s) ready on your public storefront
              </p>
              <div className="mt-3">
                <Link
                  href="/onboard?stage=setup&setupStep=services"
                  className="btn-primary inline-flex items-center gap-2 text-xs px-4"
                >
                  Continue to services <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
            <SetupMedicineSearch />
          </div>

          <div className="pt-3 border-t border-[var(--line-2)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[var(--muted)]">No medicines to add right now?</span>
            <form action={deferSetupMedicinesAction}>
              <input type="hidden" name="source" value="onboard" />
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />
              <button
                type="submit"
                className="btn-ghost text-xs border border-[var(--line-2)] px-4 min-h-10 inline-flex items-center gap-1.5"
              >
                I’ll add medicines later <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {/* 3. Services Sub-Step */}
      {activeSubStep === "services" ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
            <Stethoscope className="h-4 w-4" />
            <span>Care & Services</span>
          </div>

          <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Add one service to get started
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Keep it simple: name the service, explain what the patient gets, and choose whether it can be booked online. You can add more details later from the pharmacy workspace.
            </p>
          </div>

          <form action={saveSetupServiceAction} className="space-y-4">
            <input type="hidden" name="source" value="onboard" />
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />

            <section className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Service details</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  This is what patients will read before they decide to book.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="setup-service-title">
                  Service name
                  <input
                    id="setup-service-title"
                    name="title"
                    required
                    maxLength={100}
                    placeholder="e.g. Blood pressure check"
                    className="input-admin mt-1 min-h-11"
                  />
                </label>

                <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="setup-service-description">
                  What does the patient get?
                  <textarea
                    id="setup-service-description"
                    name="description"
                    required
                    minLength={12}
                    maxLength={600}
                    rows={4}
                    placeholder="e.g. A quick blood pressure check followed by guidance from the pharmacy team."
                    className="input-admin mt-1 min-h-[7rem] resize-y"
                  />
                </label>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Booking & price</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    You can leave the price blank when the service is free or priced after assessment.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="setup-service-price">
                    Price (KES) · Optional
                    <input
                      id="setup-service-price"
                      name="price"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      placeholder="e.g. 200"
                      className="input-admin mt-1 min-h-11"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="setup-service-payment">
                    Booking payment
                    <select
                      id="setup-service-payment"
                      name="paymentTiming"
                      defaultValue="auto"
                      className="input-admin mt-1 min-h-11"
                    >
                      <option value="auto">Online when available, otherwise pay at visit</option>
                      <option value="after">Reserve now and pay at visit</option>
                      <option value="before">Require online payment</option>
                    </select>
                  </label>

                  <p className="rounded-xl bg-[var(--brand-soft)]/50 px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
                    Online payment becomes available when your pharmacy’s M-Pesa connection is configured. Patients can still reserve when you choose pay-at-visit.
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Service image</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Optional, but recommended for a stronger storefront.
                  </p>
                </div>
                <ImageUploadField
                  name="imageUrl"
                  label="Image · Optional"
                  folder="services"
                  hint="Upload a clear service image or paste a public image URL."
                />
              </section>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-900 dark:text-emerald-100">
              The free plan includes up to 2 active services. You can edit pricing, images, descriptions and booking settings later from <strong>Clinical → Services</strong>.
            </div>

            <div className={`${styles.actions} ${polish.actionsBar} mt-4`}>
              <button
                type="submit"
                className={`btn-primary min-h-11 justify-center ${polish.primaryAction}`}
              >
                Save service & continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* 4. Profile Sub-Step */}
      {activeSubStep === "profile" ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
            <Store className="h-4 w-4" />
            <span>Public Profile</span>
          </div>

          <p className="text-xs text-[var(--muted)] leading-relaxed">
            A short description that appears on your verified public profile page.
          </p>

          <form action={saveSetupProfileAction} className="space-y-3">
            <input type="hidden" name="source" value="onboard" />
            <input type="hidden" name="pharmacyId" value={pharmacy.id} />

            <label className="block text-xs font-semibold text-[var(--foreground)]">
              Tagline · Optional
              <input
                name="tagline"
                defaultValue={pharmacy.tagline || ""}
                maxLength={120}
                placeholder="Care close to home"
                className="input-admin mt-1"
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--foreground)]">
              About your pharmacy (At least 50 characters)
              <textarea
                name="about"
                defaultValue={pharmacy.description || ""}
                required
                minLength={50}
                rows={4}
                placeholder="Tell patients about your team, prescription dispensing, patient counseling, or community health support."
                className="input-admin mt-1"
              />
            </label>

            <div className={`${styles.actions} ${polish.actionsBar} mt-4`}>
              <button
                type="submit"
                className={`btn-primary justify-center ${polish.primaryAction}`}
              >
                Save & continue to monthly activation <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
