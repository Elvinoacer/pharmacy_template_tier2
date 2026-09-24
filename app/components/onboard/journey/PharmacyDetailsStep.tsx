"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  MapPin,
  Phone,
  Sparkles,
  Store,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { updatePharmacyDraftAction, type OnboardState } from "@/app/actions/onboard";
import PharmacyLocationCapture from "@/app/components/location/PharmacyLocationCapture";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import { cinematicAudio } from "@/app/components/onboard/cinema/CinematicAudio";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

const KENYA_HUBS = [
  { city: "Nairobi", county: "Nairobi", lat: -1.286389, lng: 36.817223 },
  { city: "Mombasa", county: "Mombasa", lat: -4.043477, lng: 39.668206 },
  { city: "Kisumu", county: "Kisumu", lat: -0.091702, lng: 34.767956 },
  { city: "Nakuru", county: "Nakuru", lat: -0.303099, lng: 36.080025 },
  { city: "Eldoret", county: "Uasin Gishu", lat: 0.514277, lng: 35.26978 },
  { city: "Kilifi", county: "Kilifi", lat: -3.6305, lng: 39.8499 },
  { city: "Kiambu", county: "Kiambu", lat: -1.171389, lng: 36.835556 },
  { city: "Machakos", county: "Machakos", lat: -1.517684, lng: 37.263415 },
];

const TAGLINE_CHIPS = [
  "Care Close to Home",
  "24/7 Community Chemist",
  "Trusted Family Health",
  "Affordable Genuine Medicine",
];

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
  const user = snapshot.user;

  const [phone, setPhone] = useState(pharmacy?.phone || "");
  const [whatsapp, setWhatsapp] = useState(pharmacy?.whatsapp || "");
  const [publicEmail, setPublicEmail] = useState(pharmacy?.email || user?.email || "");
  const [tagline, setTagline] = useState(pharmacy?.tagline || "");
  const [description, setDescription] = useState(pharmacy?.description || "");
  const [latitude, setLatitude] = useState<number | null>(pharmacy?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(pharmacy?.longitude ?? null);
  const [city, setCity] = useState(pharmacy?.city || "");
  const [county, setCounty] = useState(pharmacy?.county || "");
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [soundActive, setSoundActive] = useState(() => cinematicAudio.getActive());

  const locationReady = Boolean(city && latitude != null && longitude != null);
  const [subStep, setSubStep] = useState<1 | 2 | 3>(locationReady ? 2 : 1);

  const [state, formAction, pending] = useActionState(updatePharmacyDraftAction, {} as OnboardState);
  const hasSavedRef = useRef(false);

  function toggleSound() {
    const next = cinematicAudio.toggle();
    setSoundActive(next);
  }

  useEffect(() => {
    if (typeof window !== "undefined" && city) {
      window.dispatchEvent(
        new CustomEvent("afyvia-onboard-sync", {
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

  const phoneReady = Boolean(phone.trim());
  const canContinue = locationReady && phoneReady;

  // Encouragement copy
  let subStepEncouragement = "";
  if (subStep === 1) {
    subStepEncouragement = locationReady
      ? `✨ Great job! Premises pinned in ${city}, ${county}. Ready for contact channels.`
      : "📍 Step 1 of 3: Tap 'Use my current location' or pick a commercial hub below.";
  } else if (subStep === 2) {
    subStepEncouragement = phoneReady
      ? "📞 Phone line saved! Tap WhatsApp 1-click sync if both lines share one handset."
      : "📞 Step 2 of 3: How should patients and doctors reach your dispensary?";
  } else {
    subStepEncouragement = "🏪 Step 3 of 3: Give your storefront some personality! All fields here are optional.";
  }

  function handleHubSelect(hub: typeof KENYA_HUBS[0]) {
    setCity(hub.city);
    setCounty(hub.county);
    setLatitude(hub.lat);
    setLongitude(hub.lng);
    cinematicAudio.playClick();
  }

  function handleSyncWhatsapp() {
    if (phone.trim()) {
      setWhatsapp(phone.trim());
      cinematicAudio.playClick();
    }
  }

  return (
    <div className={`${styles.form} ${polish.wizardShell}`} aria-busy={pending}>
      <div className={polish.topline}>
        <div className="flex items-center gap-2">
          <span className={polish.stepPill}>Step 3 · Premises & Contact</span>
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
        <span className={locationReady ? polish.savedPill : polish.securePill}>
          {locationReady ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden /> Premises mapped
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5 text-amber-500" aria-hidden /> Map pin required
            </>
          )}
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Help patients and regulators find you</h2>
        <p>
          Pin your physical premises coordinates and setup direct patient contact lines.
        </p>
      </header>

      {/* Progressive Sub-Step Interactive Tracker */}
      <div className={polish.subStepTracker}>
        <div className={polish.subStepHeaderRow}>
          <span className={polish.subStepLabel}>
            Part {subStep} of 3 · {subStep === 1 ? "Premises Location" : subStep === 2 ? "Contact Channels" : "Storefront Bio"}
          </span>
          <span className={polish.subStepProgressText}>
            {subStep === 1 ? "33% Complete" : subStep === 2 ? "66% Complete" : "100% Ready"}
          </span>
        </div>
        <div className={polish.subStepProgressBarTrack}>
          <div
            className={polish.subStepProgressBarFill}
            style={{ width: subStep === 1 ? "33%" : subStep === 2 ? "66%" : "100%" }}
          />
        </div>
        <div className={polish.subStepTabs}>
          <button
            type="button"
            onClick={() => {
              cinematicAudio.playClick();
              setSubStep(1);
            }}
            className={`${polish.subStepTab} ${subStep === 1 ? polish.subStepTabActive : locationReady ? polish.subStepTabDone : ""}`}
          >
            <MapPin size={12} />
            <span>1. Location {locationReady ? "✓" : ""}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (locationReady) {
                cinematicAudio.playClick();
                setSubStep(2);
              }
            }}
            disabled={!locationReady}
            className={`${polish.subStepTab} ${subStep === 2 ? polish.subStepTabActive : phoneReady ? polish.subStepTabDone : ""}`}
          >
            <Phone size={12} />
            <span>2. Contact {phoneReady ? "✓" : ""}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (locationReady && phoneReady) {
                cinematicAudio.playClick();
                setSubStep(3);
              }
            }}
            disabled={!locationReady || !phoneReady}
            className={`${polish.subStepTab} ${subStep === 3 ? polish.subStepTabActive : ""}`}
          >
            <Store size={12} />
            <span>3. Bio (Optional)</span>
          </button>
        </div>
      </div>

      {/* Energetic Milestone Encouragement Banner */}
      <div className={polish.energeticBanner} role="status">
        <span className={polish.energeticIcon}>
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <span className={polish.energeticText}>{subStepEncouragement}</span>
      </div>

      {state.error ? (
        <p className={`${styles.alert} ${styles.alertError} mb-4`} role="alert">
          {state.error}
        </p>
      ) : null}

      <form action={formAction}>
        {/* Core hidden values for full form payload regardless of active sub-step */}
        <input type="hidden" name="pharmacyId" value={pharmacy.id} />
        <input type="hidden" name="name" value={pharmacy.name} />
        <input type="hidden" name="slug" value={pharmacy.slug} />
        <input type="hidden" name="legalName" value={pharmacy.legalName || ""} />
        <input type="hidden" name="city" value={city} />
        <input type="hidden" name="county" value={county} />
        <input type="hidden" name="country" value={pharmacy.country || "Kenya"} />
        <input type="hidden" name="latitude" value={latitude ?? ""} />
        <input type="hidden" name="longitude" value={longitude ?? ""} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="whatsapp" value={whatsapp} />
        <input type="hidden" name="publicEmail" value={publicEmail} />
        <input type="hidden" name="tagline" value={tagline} />
        <input type="hidden" name="description" value={description} />

        <div className={polish.contentStack}>
          {/* =========================================================================
              SUB-STEP 1: PREMISES & GEOLOCATION (CLEAN FOCUS)
              ========================================================================= */}
          {subStep === 1 && (
            <div className={polish.subStepCard}>
              {/* Quick Hub Pre-Fill Selector */}
              <div className="mb-3 p-3 rounded-xl bg-[var(--card)] border border-[color-mix(in_srgb,var(--foreground)_15%,var(--card-elev))]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block">
                    ⚡ Quick Pick Kenyan Hub:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowManualLocation(!showManualLocation)}
                    className={polish.prefillBtn}
                  >
                    {showManualLocation ? "Hide custom town" : "Other town / edit"}
                  </button>
                </div>
                <div className={polish.chipGroup}>
                  {KENYA_HUBS.map((hub) => (
                    <button
                      key={hub.city}
                      type="button"
                      onClick={() => handleHubSelect(hub)}
                      className={`${polish.chipBtn} ${city.toLowerCase() === hub.city.toLowerCase() ? polish.chipBtnActive : ""}`}
                    >
                      <MapPin size={10} />
                      {hub.city}
                    </button>
                  ))}
                </div>

                {showManualLocation && (
                  <div className="mt-3 pt-3 border-t border-[color-mix(in_srgb,var(--foreground)_10%,var(--card-elev))] grid gap-3 sm:grid-cols-2">
                    <Field label="City / Town name" hint="Type your premises municipal town.">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="input-admin text-sm font-medium"
                        placeholder="e.g. Thika, Naivasha, Nyeri"
                      />
                    </Field>
                    <Field label="County" hint="e.g. Kiambu, Nakuru, Machakos.">
                      <input
                        type="text"
                        value={county}
                        onChange={(e) => setCounty(e.target.value)}
                        className="input-admin text-sm font-medium"
                        placeholder="e.g. Kiambu"
                      />
                    </Field>
                  </div>
                )}
              </div>

              {/* High-Precision GPS Capture */}
              <PharmacyLocationCapture
                key={`${city}-${latitude ?? "none"}-${longitude ?? "none"}`}
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

              <div className={polish.navigationButtons}>
                <div />
                <button
                  type="button"
                  onClick={() => {
                    cinematicAudio.playClick();
                    setSubStep(2);
                  }}
                  disabled={!locationReady}
                  className={polish.nextBtn}
                >
                  <span>Next: Patient Contact</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-STEP 2: CONTACT CHANNELS (PHONE & WHATSAPP)
              ========================================================================= */}
          {subStep === 2 && (
            <div className={polish.subStepCard}>
              <section className={polish.panel}>
                <PanelHeader
                  icon={<Phone className="h-5 w-5" aria-hidden />}
                  title="Patient direct channels"
                  copy="Primary telephone and messaging lines for prescription consultations and delivery dispatch."
                />
                <div className={polish.fieldsGrid}>
                  <Field
                    label="Public telephone line"
                    hint="Primary telephone number displayed on your storefront."
                    error={state.field === "phone" ? state.error : undefined}
                  >
                    <input
                      name="phoneInput"
                      type="tel"
                      inputMode="tel"
                      enterKeyHint="next"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="input-admin text-base"
                      autoComplete="tel"
                      placeholder="+254 7xx xxx xxx"
                    />
                  </Field>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`${styles.fieldLabel} ${polish.fieldLabel} mb-0`}>
                        WhatsApp business line
                      </span>
                      {phone.trim() && (
                        <button
                          type="button"
                          onClick={handleSyncWhatsapp}
                          className={polish.prefillBtn}
                          title="Copy phone number to WhatsApp"
                        >
                          <Zap size={10} />
                          Same as phone
                        </button>
                      )}
                    </div>
                    <Field
                      label=""
                      hint="Optional — enables 1-tap WhatsApp consultation directly from patient cart."
                    >
                      <input
                        name="whatsappInput"
                        type="tel"
                        inputMode="tel"
                        enterKeyHint="done"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="input-admin text-base"
                        autoComplete="tel"
                        placeholder="+254 7xx xxx xxx"
                      />
                    </Field>
                  </div>
                </div>
              </section>

              <div className={polish.navigationButtons}>
                <button
                  type="button"
                  onClick={() => {
                    cinematicAudio.playClick();
                    setSubStep(1);
                  }}
                  className={polish.backBtn}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Location</span>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      cinematicAudio.playClick();
                      setSubStep(3);
                    }}
                    disabled={!phoneReady}
                    className={polish.backBtn}
                    title="Add optional storefront bio & tagline"
                  >
                    <span>Add Bio (Optional)</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    className={`btn-primary justify-center ${polish.primaryAction}`}
                    type="submit"
                    disabled={pending || !canContinue}
                  >
                    {pending ? "Saving details…" : isReviewEdit ? "Save & return to review" : "Save & continue to verification"}
                    {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SUB-STEP 3: STOREFRONT VIBE & BIO (OPTIONAL)
              ========================================================================= */}
          {subStep === 3 && (
            <div className={polish.subStepCard}>
              <section className={polish.panel}>
                <PanelHeader
                  icon={<Store className="h-5 w-5" aria-hidden />}
                  title="Storefront presence & biography"
                  copy="Introduce your pharmacy personality to patients in your neighborhood. All fields here are optional."
                />

                <div className="grid gap-3">
                  <Field label="Public pharmacy email" hint="Shown on profile for general patient inquiries.">
                    <input
                      name="publicEmailInput"
                      type="email"
                      inputMode="email"
                      value={publicEmail}
                      onChange={(e) => setPublicEmail(e.target.value)}
                      className="input-admin"
                      autoComplete="email"
                      placeholder="hello@yourpharmacy.co.ke"
                    />
                  </Field>

                  <div>
                    <Field label="Storefront tagline" hint="Tap a quick inspiration chip or type your own.">
                      <input
                        name="taglineInput"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        className="input-admin"
                        placeholder="e.g. Care close to home"
                      />
                    </Field>
                    <div className={polish.chipGroup}>
                      {TAGLINE_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setTagline(chip);
                            cinematicAudio.playClick();
                          }}
                          className={`${polish.chipBtn} ${tagline === chip ? polish.chipBtnActive : ""}`}
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Short description" hint="A brief introduction to your pharmacy community roots.">
                    <textarea
                      name="descriptionInput"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input-admin"
                      placeholder="Briefly introduce your pharmacy, specialist care, or the community you serve."
                    />
                  </Field>
                </div>
              </section>

              <div className={polish.navigationButtons}>
                <button
                  type="button"
                  onClick={() => {
                    cinematicAudio.playClick();
                    setSubStep(2);
                  }}
                  className={polish.backBtn}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Contact</span>
                </button>

                <button
                  className={`btn-primary justify-center ${polish.primaryAction}`}
                  type="submit"
                  disabled={pending || !canContinue}
                >
                  {pending ? "Saving details…" : isReviewEdit ? "Save & return to review" : "Save & continue to verification"}
                  {!pending ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
                </button>
              </div>
            </div>
          )}
        </div>

        {!locationReady && subStep !== 1 ? (
          <div className={`${polish.statusStrip} mt-4`} role="status">
            <CircleAlert className="h-4 w-4 text-amber-600 shrink-0" aria-hidden />
            <span>
              Capture your premises location in Part 1 before continuing.
            </span>
          </div>
        ) : null}

        {isReviewEdit && subStep !== 3 ? (
          <div className="mt-4 flex justify-start">
            <button
              type="button"
              onClick={() => router.push(`/onboard?stage=review&pharmacyId=${pharmacy.id}`)}
              className={`btn-ghost justify-center ${polish.secondaryAction}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Cancel
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}

