"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Crosshair,
  Loader2,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import styles from "./PhoneLocationHandoff.module.css";

const TARGET_ACCURACY_METERS = 100;
const MAX_PHONE_ACCURACY_METERS = 300;
const LOCATION_SETTLE_MS = 20_000;

type HandoffResult = {
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
  accuracyMeters?: number | null;
};

type Props = { token: string };

type Phase = "checking" | "ready" | "capturing" | "sending" | "success" | "error";

export default function PhoneLocationHandoffClient({ token }: Props) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [pharmacyName, setPharmacyName] = useState("Your pharmacy");
  const [error, setError] = useState<string | null>(null);
  const [bestAccuracy, setBestAccuracy] = useState<number | null>(null);
  const [result, setResult] = useState<HandoffResult | null>(null);
  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopCapture = () => {
    if (watchRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    let alive = true;

    async function validate() {
      if (!token) {
        if (!alive) return;
        setError("This QR link is incomplete. Scan a new code from the computer.");
        setPhase("error");
        return;
      }

      try {
        const response = await fetch(`/api/onboard/location-handoff?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          status?: string;
          pharmacyName?: string;
          message?: string;
          latitude?: number | null;
          longitude?: number | null;
          city?: string | null;
          county?: string | null;
          country?: string | null;
          accuracyMeters?: number | null;
        };
        if (!alive) return;
        if (!response.ok) throw new Error(payload.message || "This handoff is no longer available.");

        setPharmacyName(payload.pharmacyName || "Your pharmacy");
        if (payload.status === "completed") {
          setResult(payload);
          setPhase("success");
          return;
        }
        if (payload.status !== "waiting") {
          throw new Error("This QR code is no longer active. Return to the computer and generate a new one.");
        }
        setPhase("ready");
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "This handoff could not be opened.");
        setPhase("error");
      }
    }

    void validate();
    return () => {
      alive = false;
      stopCapture();
    };
    // token identifies the complete handoff session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitPosition(position: GeolocationPosition) {
    stopCapture();
    const { latitude, longitude, accuracy } = position.coords;
    setBestAccuracy(accuracy);
    setPhase("sending");
    setError(null);

    try {
      const response = await fetch("/api/onboard/location-handoff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, latitude, longitude, accuracyMeters: accuracy }),
      });
      const payload = (await response.json().catch(() => ({}))) as HandoffResult & { message?: string };
      if (!response.ok) throw new Error(payload.message || "Could not send this location to the computer.");
      setResult(payload);
      setPhase("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this location to the computer.");
      setPhase("ready");
    }
  }

  function capturePreciseLocation() {
    setError(null);
    setBestAccuracy(null);

    if (!navigator.geolocation) {
      setError("Location services are not available in this browser. Open the QR link in your phone's normal browser and try again.");
      setPhase("error");
      return;
    }

    setPhase("capturing");
    let bestPosition: GeolocationPosition | null = null;
    let finished = false;

    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      stopCapture();
      setError(message);
      setPhase("ready");
    };

    const accept = (position: GeolocationPosition) => {
      if (finished) return;
      const accuracy = position.coords.accuracy;
      if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > MAX_PHONE_ACCURACY_METERS) {
        fail(
          `The best phone reading was still too broad${Number.isFinite(accuracy) ? ` (about ±${Math.round(accuracy)} m)` : ""}. Turn on Precise Location/GPS, move near a window or outside the pharmacy, then try again.`,
        );
        return;
      }
      finished = true;
      void submitPosition(position);
    };

    const finishWithBest = () => {
      if (finished) return;
      if (!bestPosition) {
        fail("We could not get a fresh GPS position. Make sure Location and Precise Location are enabled, then try again.");
        return;
      }
      accept(bestPosition);
    };

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (finished) return;
        const accuracy = position.coords.accuracy;
        if (!Number.isFinite(accuracy) || accuracy <= 0) return;
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
          setBestAccuracy(accuracy);
        }
        if (accuracy <= TARGET_ACCURACY_METERS) accept(position);
      },
      (geoError) => {
        if (finished) return;
        if (geoError.code === geoError.PERMISSION_DENIED) {
          fail("Location permission is off. Allow Precise Location for this browser, then tap the button again.");
          return;
        }
        if (geoError.code === geoError.POSITION_UNAVAILABLE && !bestPosition) {
          fail("Your phone cannot determine its position yet. Turn on GPS/Location services and try again.");
          return;
        }
        if (geoError.code === geoError.TIMEOUT) finishWithBest();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 18_000 },
    );

    timerRef.current = window.setTimeout(finishWithBest, LOCATION_SETTLE_MS);
  }

  const busy = phase === "checking" || phase === "capturing" || phase === "sending";

  return (
    <main className={styles.mobilePage}>
      <div className={styles.mobileShell}>
        <div className={styles.mobileBrand}>
          <div className={styles.mobileBrandMark}>
            <span className={styles.mobileBrandIcon}><MapPin className="h-4 w-4" aria-hidden /></span>
            Afyvia pharmacy onboarding
          </div>
          <span className={styles.secureBadge}><LockKeyhole className="h-3 w-3" aria-hidden /> One-time link</span>
        </div>

        <section className={styles.mobileHero}>
          <span className={styles.mobileEyebrow}><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Secure location handoff</span>
          <h1>Pin the pharmacy from your phone.</h1>
          <p>
            Your computer is waiting. This page only sends a precise premises location back to that onboarding session—nothing else from your phone.
          </p>
        </section>

        <section className={styles.mobileCard} aria-busy={busy}>
          <div className={styles.mobilePharmacy}>
            <span className={styles.mobilePharmacyIcon}><Building2 className="h-5 w-5" aria-hidden /></span>
            <div className="min-w-0">
              <span>Location for</span>
              <strong>{pharmacyName}</strong>
            </div>
          </div>

          {phase === "success" ? (
            <div className={styles.mobileSuccess}>
              <span className={styles.mobileSuccessIcon}><CheckCircle2 className="h-9 w-9" aria-hidden /></span>
              <h2>Location sent</h2>
              <p>Your computer will update automatically. You can close this page and continue onboarding there.</p>
              <div className={styles.mobileResultGrid}>
                <div className={styles.mobileResultItem}><span>City / town</span><strong>{result?.city || "Captured"}</strong></div>
                <div className={styles.mobileResultItem}><span>County</span><strong>{result?.county || "Captured"}</strong></div>
                <div className={styles.mobileResultItem}><span>Country</span><strong>{result?.country || "Kenya"}</strong></div>
                <div className={styles.mobileResultItem}><span>Accuracy</span><strong>{result?.accuracyMeters != null ? `±${Math.round(result.accuracyMeters)} m` : "Precise"}</strong></div>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.precisionBox}>
                <span className={styles.precisionIcon}>{phase === "capturing" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Crosshair className="h-5 w-5" aria-hidden />}</span>
                <div>
                  <strong>{phase === "capturing" ? "Locking the best GPS reading…" : "Precise location required"}</strong>
                  <span>
                    {bestAccuracy != null
                      ? `Best reading so far: ±${Math.round(bestAccuracy)} m`
                      : "For the best result, stand at the pharmacy with Precise Location enabled."}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={styles.mobileButton}
                onClick={capturePreciseLocation}
                disabled={busy || phase === "error"}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Crosshair className="h-4 w-4" aria-hidden />}
                {phase === "checking"
                  ? "Checking secure link…"
                  : phase === "capturing"
                    ? "Finding precise location…"
                    : phase === "sending"
                      ? "Sending to computer…"
                      : "Use this phone's precise location"}
              </button>

              {phase === "capturing" ? (
                <p className={styles.mobileStatus}>Keep this page open for a few seconds while the phone improves its GPS reading.</p>
              ) : null}
              {error ? <p className={styles.mobileError} role="alert">{error}</p> : null}
            </>
          )}
        </section>

        <footer className={styles.mobileFooter}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          The handoff expires automatically and cannot open your account.
        </footer>
      </div>
    </main>
  );
}
