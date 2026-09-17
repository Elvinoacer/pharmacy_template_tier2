"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2, UserRound } from "lucide-react";
import { createPharmacyDraftAction, type OnboardState } from "@/app/actions/onboard";
import { slugifyPharmacyName } from "@/app/lib/slug";
import PasswordField from "@/app/components/PasswordField";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
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
        new CustomEvent("aether-onboard-sync", {
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

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 1 · Account & Pharmacy</span>
        {existingPharmacy ? (
          <span className={polish.savedPill}>
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Draft started
          </span>
        ) : null}
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Start your pharmacy journey</h2>
        <p>
          Create your owner account and register your pharmacy trading name. Verification links and network updates will be sent to your work email.
        </p>
      </header>

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
                title="Owner account"
                copy="Secure administrator access for your pharmacy."
              />
              <div className={polish.fieldsGrid}>
                <Field label="Your full name" error={state.field === "general" ? state.error : undefined}>
                  <input
                    name="fullName"
                    autoComplete="name"
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
              <PanelHeader
                icon={<UserRound className="h-5 w-5" aria-hidden />}
                title="Signed in as owner"
                copy={user.email}
              />
              <p className="text-xs text-[var(--muted)]">
                Creating this pharmacy under account <strong>{user.fullName || user.email}</strong>.
              </p>
            </section>
          )}

          <section className={polish.panel}>
            <PanelHeader
              icon={<Building2 className="h-5 w-5" aria-hidden />}
              title="Pharmacy identity"
              copy="The name patients and regulators will recognise."
            />

            <Field
              label="Pharmacy trading name"
              hint="This is the primary public storefront name."
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
                className="input-admin"
                placeholder="e.g. Coast Care Pharmacy"
                autoComplete="organization"
                aria-invalid={state.field === "name"}
              />
            </Field>

            <details className={`${styles.optional} ${polish.optionalPanel} mt-3`}>
              <summary>
                Public URL & registered legal name <span>Optional now</span>
              </summary>
              <div className={polish.optionalBody}>
                <Field
                  label="Public pharmacy URL"
                  hint="Can be modified before your pharmacy publishes live."
                  error={state.field === "slug" ? state.error : undefined}
                >
                  <div className={styles.slug}>
                    <span>/p/</span>
                    <input
                      name="slug"
                      value={slug || liveSlug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      className="input-admin"
                      aria-invalid={state.field === "slug"}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </Field>

                <Field label="Registered legal business name" hint="Only if different from trading name.">
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

        <div className={`${styles.actions} ${polish.actionsBar}`}>
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
            Already registered on Aether? <Link href="/login?next=/onboard">Sign in</Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}
