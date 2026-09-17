"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleAlert, Phone } from "lucide-react";
import { updatePharmacyDraftAction, type OnboardState } from "@/app/actions/onboard";
import PharmacyLocationCapture from "@/app/components/location/PharmacyLocationCapture";
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

export function PharmacyDetailsStep({
  snapshot,
  isReviewEdit = false,
}: {
  snapshot: PharmacyOnboardingSnapshot;
  isReviewEdit?: boolean;
}) {
  const router = useRouter();
  const pharmacy = snapshot.pharmacy;

  const [phone, setPhone] = useState(pharmacy?.phone || "");
  const [whatsapp, setWhatsapp] = useState(pharmacy?.whatsapp || "");
  const [publicEmail, setPublicEmail] = useState(pharmacy?.email || "");
  const [tagline, setTagline] = useState(pharmacy?.tagline || "");
  const [description, setDescription] = useState(pharmacy?.description || "");
  const [latitude, setLatitude] = useState<number | null>(pharmacy?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(pharmacy?.longitude ?? null);
  const [city, setCity] = useState(pharmacy?.city || "");
  const [county, setCounty] = useState(pharmacy?.county || "");

  const [state, formAction, pending] = useActionState(updatePharmacyDraftAction, {} as OnboardState);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && city) {
      window.dispatchEvent(
        new CustomEvent("aether-onboard-sync", {
          detail: { city },
        }),
      );
    }
  }, [city]);

  useEffect(() => {
    if (state.success && !hasSavedRef.current) {
      hasSavedRef.current = true;
      if (isReviewEdit) {
        router.push(`/onboard?stage=review&pharmacyId=${pharmacy?.id}`);
      } else {
        router.refresh();
      }
    }
  }, [state.success, isReviewEdit, router, pharmacy?.id]);

  if (!pharmacy) return null;

  const locationReady = Boolean(city && latitude != null && longitude != null);
  const canContinue = locationReady && Boolean(phone.trim());

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 3 · Premises & Contact</span>
        <span className={polish.savedPill}>
          {locationReady ? "Premises mapped" : "Map pin required"}
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Help patients and regulators find you</h2>
        <p>
          Capture your physical pharmacy premises location once and provide the primary patient contact numbers.
        </p>
      </header>

      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="name" value={pharmacy.name} />
        <input type="hidden" name="slug" value={pharmacy.slug} />
        <input type="hidden" name="legalName" value={pharmacy.legalName || ""} />
        <input type="hidden" name="city" value={city} />
        <input type="hidden" name="county" value={county} />
        <input type="hidden" name="country" value={pharmacy.country || "Kenya"} />
        <input type="hidden" name="latitude" value={latitude ?? ""} />
        <input type="hidden" name="longitude" value={longitude ?? ""} />

        <div className={polish.contentStack}>
          {/* Location Capture with GPS & QR handoff */}
          <PharmacyLocationCapture
            pharmacyId={pharmacy.id}
            initialLatitude={latitude}
            initialLongitude={longitude}
            initialCity={city}
            initialCounty={county}
            initialCountry={pharmacy.country || "Kenya"}
            onLocationChange={(loc) => {
              setLatitude(loc.latitude);
              setLongitude(loc.longitude);
              if (loc.city !== undefined) setCity(loc.city || "");
              if (loc.county !== undefined) setCounty(loc.county || "");
            }}
          />

          {/* Contact Details */}
          <section className={polish.panel}>
            <PanelHeader
              icon={<Phone className="h-5 w-5" aria-hidden />}
              title="Patient contact details"
              copy="How patients can reach this pharmacy after launch."
            />
            <div className={polish.fieldsGrid}>
              <Field
                label="Public phone"
                hint="Main pharmacy line displayed on profile."
                error={state.field === "phone" ? state.error : undefined}
              >
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="input-admin"
                  autoComplete="tel"
                  placeholder="+254 7xx xxx xxx"
                />
              </Field>
              <Field label="WhatsApp number" hint="Optional — recommended for direct customer chat.">
                <input
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="input-admin"
                  autoComplete="tel"
                  placeholder="+254 7xx xxx xxx"
                />
              </Field>
            </div>
          </section>

          {/* Optional Profile details */}
          <details className={`${styles.optional} ${polish.optionalPanel}`}>
            <summary>
              Tagline & description <span>Optional now</span>
            </summary>
            <div className={polish.optionalBody}>
              <Field label="Public pharmacy email" hint="Shown on profile for general inquiries.">
                <input
                  name="publicEmail"
                  type="email"
                  inputMode="email"
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  className="input-admin"
                  autoComplete="email"
                  placeholder="hello@yourpharmacy.co.ke"
                />
              </Field>
              <Field label="Short tagline" hint="e.g. Caring for Kilifi families since 2018.">
                <input
                  name="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="input-admin"
                  placeholder="Care close to home"
                />
              </Field>
              <Field label="Short description" hint="A brief introduction to your pharmacy.">
                <textarea
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-admin"
                  placeholder="Briefly introduce your pharmacy, specialist care, or the community you serve."
                />
              </Field>
            </div>
          </details>
        </div>

        {!locationReady ? (
          <div className={`${polish.statusStrip} mt-4`} role="status">
            <CircleAlert className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />
            <span>
              Capture your premises location above. Precise coordinates and town will be saved before you continue.
            </span>
          </div>
        ) : null}

        <div className={`${styles.actions} ${polish.actionsBar} mt-5`}>
          {isReviewEdit ? (
            <button
              type="button"
              onClick={() => router.push(`/onboard?stage=review&pharmacyId=${pharmacy.id}`)}
              className={`btn-ghost justify-center ${polish.secondaryAction}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Cancel
            </button>
          ) : null}

          <button
            className={`btn-primary justify-center ${polish.primaryAction}`}
            type="submit"
            disabled={pending || !canContinue}
          >
            {pending ? "Saving details…" : isReviewEdit ? "Save & return to review" : "Save & continue"}
            {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </button>
        </div>
      </form>
    </div>
  );
}
