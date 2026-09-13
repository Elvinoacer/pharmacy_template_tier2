"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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
import polish from "./OnboardFormPolish.module.css";

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
      <div className={`${styles.form} ${styles.status} ${polish.wizardShell}`}>
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
      <div className={`${styles.form} ${styles.status} ${polish.wizardShell}`}>
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
      <div className={`${styles.form} ${styles.status} ${polish.wizardShell}`}>
        <p className={styles.kicker}>Not approved</p>
        <h2>This application was not approved</h2>
        <p>{existing?.rejectionReason || "Check the email on this account for the reviewer’s decision."}</p>
      </div>
    );
  }

  const titles =
    step === 0
      ? { title: "Build your pharmacy profile", sub: "Start with the identity patients and reviewers will recognise." }
      : step === 2
        ? { title: "Help patients find you", sub: "Capture the premises location once, then add the best contact details." }
        : { title: "Review before you send", sub: "A quick final check before your pharmacy enters independent verification." };

  const stepLabel = step === 0 ? "Step 1 of 4" : step === 2 ? "Step 3 of 4" : "Step 4 of 4";

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={createPending || updatePending || submitPending} onInvalidCapture={(event) => {
      const target = event.target as HTMLInputElement;
      const details = target.closest("details");
      if (details && !details.open) details.open = true;
    }}>
      <OnboardStepper current={step === 0 ? 0 : step === 2 ? 2 : 3} />

      <div className={polish.topline}>
        <span className={polish.stepPill}>{stepLabel}</span>
        {pharmacyId ? (
          <span className={polish.savedPill}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Draft saved</span>
        ) : null}
      </div>

      <header key={step} className={`${styles.formHead} ${styles.routeEnter} ${polish.heading}`} tabIndex={-1}>
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
          <div className={polish.contentStack}>
            {!signedIn && !pharmacyId ? (
              <section className={polish.panel}>
                <PanelHeader
                  icon={<UserRound className="h-5 w-5" aria-hidden />}
                  title="Your owner account"
                  copy="Used for verification updates and secure access to this pharmacy."
                />
                <div className={polish.fieldsGrid}>
                  <Field label="Your name">
                    <input name="fullName" autoComplete="name" required className="input-admin" placeholder="Your full name" />
                  </Field>
                  <Field label="Work email">
                    <input name="email" type="email" inputMode="email" autoComplete="email" required className="input-admin" placeholder="you@pharmacy.co.ke" />
                  </Field>
                </div>
                <div className={`mt-3 ${polish.formField}`}>
                  <PasswordField label="Password" name="password" autoComplete="new-password" required />
                </div>
              </section>
            ) : null}

            <section className={polish.panel}>
              <PanelHeader
                icon={<Building2 className="h-5 w-5" aria-hidden />}
                title="Pharmacy identity"
                copy="Keep this close to the name customers already know."
              />

              <Field label="Pharmacy name" hint="This becomes the primary public name after approval." error={state.field === "name" ? state.error : undefined}>
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!pharmacyId) setSlug(slugifyPharmacyName(e.target.value));
                  }}
                  className="input-admin"
                  placeholder="e.g. Coast Care Pharmacy"
                  autoComplete="organization"
                  aria-invalid={state.field === "name"}
                />
              </Field>

              <details className={`${styles.optional} ${polish.optionalPanel} mt-3`} open={state.field === "slug" || undefined}>
                <summary>Public URL & registered name <span>Optional now</span></summary>
                <div className={polish.optionalBody}>
                  <Field
                    label="Public pharmacy URL"
                    hint="You can change this before the pharmacy goes live."
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

                  <Field label="Registered business name" hint="Only if it differs from the trading name.">
                    <input
                      name="legalName"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      className="input-admin"
                      autoComplete="organization"
                      placeholder="Registered legal name"
                    />
                  </Field>
                </div>
              </details>
            </section>
          </div>

          <div className={`${styles.actions} ${polish.actionsBar}`}>
            <button className={`btn-primary justify-center ${polish.primaryAction}`} type="submit" disabled={createPending || updatePending}>
              {createPending || updatePending ? "Saving…" : pharmacyId ? "Save & continue" : "Create & continue"}
              {!createPending && !updatePending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
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

          <div className={polish.contentStack}>
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

            <section className={polish.panel}>
              <PanelHeader
                icon={<Phone className="h-5 w-5" aria-hidden />}
                title="Patient contact"
                copy="Add the numbers patients should use after your pharmacy is approved."
              />
              <div className={polish.fieldsGrid}>
                <Field label="Public phone" hint="Shown on your pharmacy profile." error={state.field === "phone" ? state.error : undefined}>
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
                <Field label="WhatsApp" hint="Optional — useful for quick patient enquiries.">
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

            <details className={`${styles.optional} ${polish.optionalPanel}`}>
              <summary>Profile details <span>Optional now</span></summary>
              <div className={polish.optionalBody}>
                <Field label="Public email" hint="Shown only if you choose to use it for patients.">
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
                <Field label="Tagline" hint="A short line that makes the pharmacy memorable.">
                  <input
                    name="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="input-admin"
                    placeholder="Care close to home"
                  />
                </Field>
                <Field label="Short description">
                  <textarea
                    name="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-admin"
                    placeholder="Briefly describe your pharmacy and the patients you serve."
                  />
                </Field>
              </div>
            </details>
          </div>

          {!locationReady ? (
            <div className={polish.statusStrip} role="status">
              <CircleAlert className="h-4 w-4" aria-hidden />
              <span>Capture the premises location above. City and county will be detected automatically before you continue.</span>
            </div>
          ) : null}

          <div className={`${styles.actions} ${polish.actionsBar}`}>
            <button type="button" className={`btn-ghost justify-center ${polish.secondaryAction}`} onClick={() => setStep(0)}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            <button className={`btn-primary justify-center ${polish.primaryAction}`} type="submit" disabled={updatePending || !locationReady}>
              {updatePending ? "Saving…" : "Continue to review"}
              {!updatePending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 && pharmacyId ? (
        <form action={submitAction}>
          <input type="hidden" name="pharmacyId" value={pharmacyId} />

          <div className={polish.reviewHero}>
            <div className={polish.reviewHeroTop}>
              <div>
                <p className={polish.reviewName}>{name}</p>
                <p className={polish.reviewSlug}>/p/{slug || liveSlug}</p>
              </div>
              <span className={polish.reviewBadge}><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Ready for final check</span>
            </div>

            <div className={polish.reviewGrid}>
              <div className={polish.reviewItem}>
                <span>Licence</span>
                <strong>{licenseNumber || "On file"}</strong>
              </div>
              <div className={polish.reviewItem}>
                <span>Premises area</span>
                <strong>{city ? `${city}${county ? `, ${county}` : ""}` : "Captured from device"}</strong>
              </div>
              <div className={polish.reviewItem}>
                <span>Location</span>
                <strong>{latitude != null && longitude != null ? "Securely captured" : "Not captured yet"}</strong>
              </div>
              <div className={polish.reviewItem}>
                <span>Patient phone</span>
                <strong>{phone || "—"}</strong>
              </div>
            </div>
          </div>

          {!verificationFeePaid ? (
            <div className={polish.feeNote}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
              <span>KES 100 once before review. Any allocated waiver is applied automatically on the payment page.</span>
            </div>
          ) : null}

          {submitState.error ? (
            <div className={`${styles.alert} ${styles.alertError} mt-4`} role="alert">
              {submitState.error}
            </div>
          ) : null}

          <div className={`${styles.actions} ${polish.actionsBar}`}>
            <button type="button" className={`btn-ghost justify-center ${polish.secondaryAction}`} onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            {verificationFeePaid ? (
              <button className={`btn-primary justify-center ${polish.primaryAction}`} type="submit" disabled={submitPending}>
                {submitPending ? "Submitting…" : "Submit for review"}
                {!submitPending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
              </button>
            ) : (
              <Link href="/onboard/billing" className={`btn-primary justify-center ${polish.primaryAction}`}>
                Pay verification fee <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </form>
      ) : null}
    </div>
  );
}
