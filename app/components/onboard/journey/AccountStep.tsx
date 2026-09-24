"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, Sparkles, UserRound, Volume2, VolumeX } from "lucide-react";
import { createPharmacyDraftAction, type OnboardState } from "@/app/actions/onboard";
import { slugifyPharmacyName } from "@/app/lib/slug";
import PasswordField from "@/app/components/PasswordField";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import { cinematicAudio } from "@/app/components/onboard/cinema/CinematicAudio";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`${styles.field} ${polish.formField} ${className || ""}`}>
      <span className={`${styles.fieldLabel} ${polish.fieldLabel}`}>{label}</span>
      {children}
      {hint ? <span className={`${styles.fieldHint} ${polish.fieldHint}`}>{hint}</span> : null}
      {error ? (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function PanelHeader({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className={polish.panelHeader}>
      <span className={polish.panelHeaderIcon}>{icon}</span>
      <div className={polish.panelHeaderText}>
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
    </div>
  );
}

export function AccountStep({ snapshot }: { snapshot: PharmacyOnboardingSnapshot }) {
  const router = useRouter();
  const user = snapshot.user;
  const existingPharmacy = snapshot.pharmacy;

  const [name, setName] = useState(existingPharmacy?.name || "");
  const [slug, setSlug] = useState(existingPharmacy?.slug || "");
  const [legalName, setLegalName] = useState(existingPharmacy?.legalName || "");

  const [state, formAction, pending] = useActionState(createPharmacyDraftAction, {} as OnboardState);
  const liveSlug = useMemo(() => slug || slugifyPharmacyName(name), [slug, name]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("afyvia-onboard-sync", {
          detail: {
            name: name || undefined,
            slug: liveSlug || undefined,
          },
        }),
      );
    }
  }, [name, liveSlug]);

  useEffect(() => {
    if (state.pharmacyId || state.success) {
      router.refresh();
    }
  }, [state.pharmacyId, state.success, router]);

  const [customizingSlug, setCustomizingSlug] = useState(false);
  const [soundActive, setSoundActive] = useState(() => cinematicAudio.getActive());

  function toggleSound() {
    const next = cinematicAudio.toggle();
    setSoundActive(next);
  }

  const SUFFIX_CHIPS = ["Pharmacy", "Chemist", "Healthcare", "Pharmaceuticals", "Clinic Chemist"];

  function handleSuffixClick(suffix: string) {
    cinematicAudio.playClick();
    if (!name.trim()) {
      setName(suffix);
      if (!existingPharmacy) setSlug(slugifyPharmacyName(suffix));
    } else if (!name.toLowerCase().includes(suffix.toLowerCase())) {
      const newName = `${name.trim()} ${suffix}`;
      setName(newName);
      if (!existingPharmacy) setSlug(slugifyPharmacyName(newName));
    }
  }

  // Dynamic encouragement calculation
  const hasOwner = Boolean(user);
  const nameFilled = Boolean(name.trim());
  const percentDone = hasOwner ? (nameFilled ? 100 : 50) : (nameFilled ? 75 : 25);

  let encouragement = "👋 Welcome to Afyvia! Let's get your pharmacy onto Kenya's trusted network.";
  if (hasOwner && !nameFilled) {
    encouragement = "✨ Signed in as owner! Now give your pharmacy its trading name.";
  } else if (nameFilled) {
    encouragement = `🚀 "${name}" is looking sharp! Live 3D simulation updated.`;
  }

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <div className="flex items-center gap-2">
          <span className={polish.stepPill}>Step 1 · Account & Pharmacy</span>
          <button
            type="button"
            onClick={toggleSound}
            className={`${polish.soundToggleBtn} ${soundActive ? polish.soundToggleBtnActive : ""}`}
            title="Toggle 3D cinema sound feedback"
          >
            {soundActive ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>{soundActive ? "Sound On" : "Muted"}</span>
          </button>
        </div>
        {existingPharmacy ? (
          <span className={polish.savedPill}>
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Draft started
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Fast-Track Setup
          </span>
        )}
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Start your pharmacy journey</h2>
        <p>
          Register your owner credentials and choose your pharmacy storefront name.
        </p>
      </header>

      {/* Energetic Milestone Encouragement Banner */}
      <div className={polish.energeticBanner} role="status">
        <span className={polish.energeticIcon}>
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <span className={polish.energeticText}>{encouragement}</span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            {percentDone}% ready
          </span>
        </div>
      </div>

      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      <form action={formAction}>
        <div className={polish.contentStack}>
          {!user ? (
            <section className={polish.panel}>
              <PanelHeader
                icon={<UserRound className="h-5 w-5" aria-hidden />}
                title="1. Owner account credentials"
                copy="Secure administrator access for managing your pharmacy inventory and orders."
              />
              <div className={polish.fieldsGrid}>
                <Field label="Your full name" error={state.field === "general" ? state.error : undefined}>
                  <input
                    name="fullName"
                    autoComplete="name"
                    enterKeyHint="next"
                    required
                    className="input-admin"
                    placeholder="e.g. Dr. Jane Mwangi"
                  />
                </Field>
                <Field label="Work email" hint="Used for verification and ownership recovery.">
                  <input
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    enterKeyHint="next"
                    required
                    className="input-admin"
                    placeholder="owner@yourpharmacy.co.ke"
                  />
                </Field>
              </div>
              <div className={`mt-3 ${polish.formField}`}>
                <PasswordField label="Password" name="password" autoComplete="new-password" required />
              </div>
            </section>
          ) : (
            <section className={polish.panel}>
              <div className="flex items-center justify-between gap-3">
                <PanelHeader
                  icon={<UserRound className="h-5 w-5" aria-hidden />}
                  title="Signed in as verified owner"
                  copy={user.email}
                />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                Creating this pharmacy under <strong>{user.fullName || user.email}</strong>.
              </p>
            </section>
          )}

          <section className={polish.panel}>
            <PanelHeader
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title="2. Pharmacy storefront brand"
              copy="The public name patients and doctors will recognise on the Afyvia app."
            />

            <Field
              label="Pharmacy trading name"
              hint="Tap a quick suffix below or type your full storefront name."
              error={state.field === "name" ? state.error : undefined}
            >
              <input
                name="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!existingPharmacy) setSlug(slugifyPharmacyName(e.target.value));
                }}
                className="input-admin text-base font-semibold"
                placeholder="e.g. Coast Care Pharmacy"
                autoComplete="organization"
                enterKeyHint="done"
                aria-invalid={state.field === "name"}
              />
            </Field>

            {/* Quick Suffix Chip Selectors */}
            <div className="mt-2">
              <span className="text-[11px] font-semibold text-[var(--muted)]">Quick add suffix:</span>
              <div className={polish.chipGroup}>
                {SUFFIX_CHIPS.map((suffix) => (
                  <button
                    key={suffix}
                    type="button"
                    onClick={() => handleSuffixClick(suffix)}
                    className={polish.chipBtn}
                  >
                    + {suffix}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Slug Preview & Customization */}
            <div className="mt-4 p-3 rounded-xl bg-[var(--card)] border border-[color-mix(in_srgb,var(--foreground)_15%,var(--card-elev))] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-mono text-[var(--muted)]">afyvia.com/p/</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {slug || liveSlug || "your-pharmacy"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  cinematicAudio.playClick();
                  setCustomizingSlug(!customizingSlug);
                }}
                className={polish.prefillBtn}
              >
                {customizingSlug ? "Hide custom URL" : "Customize URL"}
              </button>
            </div>

            {customizingSlug ? (
              <div className="mt-3 p-3 rounded-xl bg-[var(--card-elev)] border border-[color-mix(in_srgb,var(--foreground)_20%,var(--card-elev))]">
                <Field
                  label="Custom public URL handle"
                  hint="Lowercase letters, numbers, and hyphens only."
                  error={state.field === "slug" ? state.error : undefined}
                >
                  <div className={styles.slug}>
                    <span>/p/</span>
                    <input
                      name="slug"
                      value={slug || liveSlug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      className="input-admin font-mono text-sm"
                      aria-invalid={state.field === "slug"}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </Field>
              </div>
            ) : (
              <input type="hidden" name="slug" value={slug || liveSlug} />
            )}

            <details className={`${styles.optional} ${polish.optionalPanel} mt-4`}>
              <summary>
                Registered legal entity name <span>Optional (if different from trading name)</span>
              </summary>
              <div className={polish.optionalBody}>
                <Field label="Registered legal business name" hint="Appears on official BRS documents or tax invoices.">
                  <input
                    name="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="input-admin"
                    autoComplete="organization"
                    placeholder="e.g. Coast Care Pharmaceuticals Ltd"
                  />
                </Field>
              </div>
            </details>
          </section>
        </div>

        <div className={`${styles.actions} ${polish.actionsBar} mt-5`}>
          <button
            className={`btn-primary justify-center ${polish.primaryAction}`}
            type="submit"
            disabled={pending}
          >
            {pending ? "Creating pharmacy draft…" : "Create pharmacy & continue"}
            {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </button>
        </div>

        {!user ? (
          <p className={styles.signIn}>
            Already registered on Afyvia? <Link href="/login?next=/onboard">Sign in</Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
