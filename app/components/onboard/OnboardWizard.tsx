"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPharmacyDraftAction,
  submitPharmacyApplicationAction,
  updatePharmacyDraftAction,
  type OnboardState,
} from "@/app/actions/onboard";
import { slugifyPharmacyName } from "@/app/lib/slug";
import PharmacyLocationCapture from "@/app/components/location/PharmacyLocationCapture";
import PasswordField from "@/app/components/PasswordField";
import OnboardStepper from "./OnboardStepper";
import styles from "./OnboardSurface.module.css";

type Existing = {
  verificationNotes?: string | null;
  rejectionReason?: string | null;
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  tagline: string | null;
  description: string | null;
  licenseNumber: string | null;
  ppbPremisesNumber: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
} | null;

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
    <label className={`${styles.field} ${className || ""}`}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
      {error ? (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export default function OnboardWizard({ signedIn, existing, verificationFeePaid = false }: { signedIn: boolean; existing: Existing; verificationFeePaid?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(existing ? existing.city && existing.phone && existing.latitude != null && existing.longitude != null ? 3 : 2 : 0);
  const [name, setName] = useState(existing?.name || "");
  const [slug, setSlug] = useState(existing?.slug || "");
  const [legalName, setLegalName] = useState(existing?.legalName || "");
  const licenseNumber = existing?.licenseNumber || "";
  const pharmacyId = existing?.id || "";
  const [city, setCity] = useState(existing?.city || "");
  const [county, setCounty] = useState(existing?.county || "");
  const [phone, setPhone] = useState(existing?.phone || "");
  const [whatsapp, setWhatsapp] = useState(existing?.whatsapp || "");
  const [publicEmail, setPublicEmail] = useState(existing?.email || "");
  const [tagline, setTagline] = useState(existing?.tagline || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [latitude, setLatitude] = useState<number | null>(existing?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(existing?.longitude ?? null);

  const [createState, createAction, createPending] = useActionState(createPharmacyDraftAction, {} as OnboardState);
  const [updateState, updateAction, updatePending] = useActionState(updatePharmacyDraftAction, {} as OnboardState);
  const [submitState, submitAction, submitPending] = useActionState(submitPharmacyApplicationAction, {} as OnboardState);
  const nextStepAfterUpdate = useRef<number | null>(null);

  const state = createState.error ? createState : updateState.error ? updateState : submitState.error ? submitState : {};
  const liveSlug = useMemo(() => slug || slugifyPharmacyName(name), [slug, name]);
  const isIdentityError = ["name", "slug"].includes(state.field || "");
  const isContactError = ["phone", "location"].includes(state.field || "");
  const status = submitState.success ? "submitted" : existing?.status || "draft";
  const locationReady = Boolean(city && latitude != null && longitude != null);

  useEffect(() => {
    if (createState.pharmacyId) router.refresh();
  }, [createState.pharmacyId, router]);

  useEffect(() => {
    if (updateState.success && nextStepAfterUpdate.current !== null) {
      const target = nextStepAfterUpdate.current;
      nextStepAfterUpdate.current = null;
      setStep(target);
    } else if (updateState.error) {
      nextStepAfterUpdate.current = null;
    }
  }, [updateState]);

  if (status === "submitted" || status === "under_review") {
    return (
      <div className={`${styles.form} ${styles.status}`}>
        <p className={styles.kicker}>In review</p>
        <h2>{name || "Your pharmacy"} is with the network team</h2>
        <p>We’ll email you after the review. Your listing stays private.</p>
        <div className={styles.statusPath}><span>✓ Submitted</span><strong>In review</strong><span>Setup next</span></div>
        <Link href="/onboard/billing" className="btn-primary mt-6 inline-flex justify-center">Check verification payment</Link>
        <p className={styles.fieldHint} style={{ marginTop: "1.25rem" }}>
          Application {pharmacyId.slice(0, 8)}
        </p>
      </div>
    );
  }

  if (status === "approved" || status === "active") {
    return (
      <div className={`${styles.form} ${styles.status}`}>
        <p className={styles.kicker}>Verified</p>
        <h2>{name || "Your pharmacy"} is approved</h2>
        <p>Finish setup, activate monthly service, then publish.</p>
        <Link href="/admin/setup" className="btn-primary mt-6 inline-flex justify-center">
          Continue to setup
        </Link>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className={`${styles.form} ${styles.status}`}>
        <p className={styles.kicker}>Not approved</p>
        <h2>This application was not approved</h2>
        <p>{existing?.rejectionReason || "Check the email on this account for the reviewer’s decision."}</p>
      </div>
    );
  }

  const titles =
    step === 0
      ? { title: "Create your pharmacy", sub: "Start with the essentials. Your licence comes next." }
      : step === 2
        ? { title: "Where patients find you", sub: "Share the pharmacy premises location and your public contact details." }
        : { title: "Ready to submit", sub: "Patients won’t see you until you’re verified." };

  return (
    <div className={styles.form} aria-busy={createPending || updatePending || submitPending} onInvalidCapture={(event) => {
      const target = event.target as HTMLInputElement;
      const details = target.closest("details");
      if (details && !details.open) details.open = true;
    }}>
      <OnboardStepper current={step === 0 ? 0 : step === 2 ? 2 : 3} />

      <header key={step} className={`${styles.formHead} ${styles.routeEnter}`} tabIndex={-1}>
        <h2>{titles.title}</h2>
        <p>{titles.sub}</p>
      </header>

      {state.error && !((step === 0 && isIdentityError) || (step === 2 && isContactError)) ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      {step === 0 ? (
        <form
          action={(fd) => {
            if (pharmacyId) {
              fd.set("pharmacyId", pharmacyId);
              nextStepAfterUpdate.current = 2;
              updateAction(fd);
            } else {
              createAction(fd);
            }
          }}
        >
          <input type="hidden" name="pharmacyId" value={pharmacyId} />
          <div className={styles.fields}>
            {!signedIn && !pharmacyId ? (
              <>
                <div className={styles.fieldsTwo}>
                  <Field label="Your name">
                    <input name="fullName" autoComplete="name" required className="input-admin" />
                  </Field>
                  <Field label="Work email">
                    <input name="email" type="email" inputMode="email" autoComplete="email" required className="input-admin" />
                  </Field>
                </div>
                <PasswordField label="Password" name="password" autoComplete="new-password" required />
              </>
            ) : null}

            <Field label="Pharmacy name" error={state.field === "name" ? state.error : undefined}>
              <input
                name="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!pharmacyId) setSlug(slugifyPharmacyName(e.target.value));
                }}
                className="input-admin"
                placeholder="Coast Care Pharmacy"
                autoComplete="organization"
                aria-invalid={state.field === "name"}
              />
            </Field>

            <details className={styles.optional} open={state.field === "slug" || undefined}>
              <summary>Customise address & registered name <span>Optional</span></summary>
            <Field
              label="Public address"
              hint="Hidden until you go live."
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

            <Field label="Registered name" hint="Only if it differs from the trading name.">
              <input
                name="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="input-admin"
                autoComplete="organization"
              />
            </Field>
            </details>
          </div>

          <div className={styles.actions}>
            <button className="btn-primary justify-center" type="submit" disabled={createPending || updatePending}>
              {createPending || updatePending ? "Saving…" : pharmacyId ? "Save & continue" : "Create & continue"}
            </button>
          </div>

          {!signedIn && !pharmacyId ? (
            <p className={styles.signIn}>
              Already registered? <Link href="/login?next=/onboard">Sign in</Link>
            </p>
          ) : null}
        </form>
      ) : null}

      {step === 2 && pharmacyId ? (
        <form
          action={(fd) => {
            fd.set("pharmacyId", pharmacyId);
            nextStepAfterUpdate.current = 3;
            updateAction(fd);
          }}
        >
          <input type="hidden" name="pharmacyId" value={pharmacyId} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="slug" value={slug || liveSlug} />
          <input type="hidden" name="legalName" value={legalName} />
          <input type="hidden" name="licenseNumber" value={licenseNumber} />

          <div className={styles.fields}>
            <PharmacyLocationCapture
              pharmacyId={pharmacyId}
              initialLatitude={latitude}
              initialLongitude={longitude}
              initialCity={city}
              initialCounty={county}
              initialCountry="Kenya"
              onLocationChange={(location) => {
                setLatitude(location.latitude);
                setLongitude(location.longitude);
                if (location.city !== undefined) setCity(location.city || "");
                if (location.county !== undefined) setCounty(location.county || "");
              }}
            />

            <div className={styles.fieldsTwo}>
              <Field label="Public phone" error={state.field === "phone" ? state.error : undefined}>
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="input-admin"
                  autoComplete="tel"
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="input-admin"
                  autoComplete="tel"
                />
              </Field>
            </div>

            <details className={styles.optional}>
              <summary>More contact & profile details <span>Optional now</span></summary>
            <Field label="Public email">
              <input
                name="publicEmail"
                type="email"
                inputMode="email"
                value={publicEmail}
                onChange={(e) => setPublicEmail(e.target.value)}
                className="input-admin"
                autoComplete="email"
              />
            </Field>
            <Field label="Tagline">
              <input
                name="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="input-admin"
                placeholder="Your neighbourhood pharmacy"
              />
            </Field>
            <Field label="Short description">
              <textarea name="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input-admin" />
            </Field>
            </details>
          </div>

          {!locationReady ? (
            <p className={`${styles.alert} ${styles.alertWarn}`} role="status">
              Capture the pharmacy’s current location above. City and county will be derived automatically.
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className="btn-ghost justify-center" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn-primary justify-center" type="submit" disabled={updatePending || !locationReady}>
              {updatePending ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 && pharmacyId ? (
        <form action={submitAction}>
          <input type="hidden" name="pharmacyId" value={pharmacyId} />
          <div className={styles.summary}>
            <p>{name}</p>
            <p className={styles.fieldHint}>/p/{slug || liveSlug}</p>
            <dl>
              <div>
                <dt>Licence</dt>
                <dd>{licenseNumber || "On file"}</dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{city ? `${city}${county ? `, ${county}` : ""}` : "Captured from premises location"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{latitude != null && longitude != null ? "Captured from device" : "Not captured yet"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{phone || "—"}</dd>
              </div>
            </dl>
          </div>
          {!verificationFeePaid ? <p className={styles.fieldHint}>KES 100 once, before review. Any allocated waiver applies on the payment page.</p> : null}
          {submitState.error ? (
            <div className={`${styles.alert} ${styles.alertError} mt-4`} role="alert">
              {submitState.error}
            </div>
          ) : null}
          <div className={styles.actions}>
            <button type="button" className="btn-ghost justify-center" onClick={() => setStep(2)}>
              Back
            </button>
            {verificationFeePaid ? <button className="btn-primary justify-center" type="submit" disabled={submitPending}>
              {submitPending ? "Submitting…" : "Submit for review"}
            </button> : <Link href="/onboard/billing" className="btn-primary justify-center">Pay verification fee & continue</Link>}
          </div>
        </form>
      ) : null}
    </div>
  );
}
