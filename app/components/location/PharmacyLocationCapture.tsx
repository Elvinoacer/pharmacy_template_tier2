"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  Crosshair,
  Loader2,
  MapPin,
  Smartphone,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  saveOnboardingPharmacyLocationAction,
  type GeolocationActionState,
} from "@/app/actions/geolocation";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";
import handoffStyles from "./PhoneLocationHandoff.module.css";

const initial: GeolocationActionState = {};
const TARGET_ACCURACY_METERS = 120;
const MAX_ACCEPTABLE_ACCURACY_METERS = 400;
const LOCATION_SETTLE_MS = 18_000;

type LocationSnapshot = {
  latitude: number | null;
  longitude: number | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
};

type Props = {
  pharmacyId: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialCity?: string | null;
  initialCounty?: string | null;
  initialCountry?: string | null;
  onLocationChange?: (location: LocationSnapshot) => void;
};

type HandoffSession = {
  handoffId: string;
  mobileUrl: string;
  expiresAt: string;
  status: "waiting" | "completed";
};

type HandoffStatusPayload = {
  ok?: boolean;
  status?: string;
  message?: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
  accuracyMeters?: number | null;
};

export default function PharmacyLocationCapture({
  pharmacyId,
  initialLatitude = null,
  initialLongitude = null,
  initialCity = null,
  initialCounty = null,
  initialCountry = null,
  onLocationChange,
}: Props) {
  const [latitude, setLatitude] = useState(initialLatitude != null ? String(initialLatitude) : "");
  const [longitude, setLongitude] = useState(initialLongitude != null ? String(initialLongitude) : "");
  const [city, setCity] = useState(initialCity || "");
  const [county, setCounty] = useState(initialCounty || "");
  const [country, setCountry] = useState(initialCountry || "Kenya");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffSession | null>(null);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffSeconds, setHandoffSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [state, saveAction, pending] = useActionState(saveOnboardingPharmacyLocationAction, initial);

  const parsedLatitude = latitude ? Number(latitude) : null;
  const parsedLongitude = longitude ? Number(longitude) : null;
  const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
  const hasArea = Boolean(city && county);
  const message = handoffError || geoError || (!busy && !handoff && state.error ? state.error : undefined);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!state.success) return;

    const nextCity = state.city || "";
    const nextCounty = state.county || "";
    const nextCountry = state.country || "Kenya";
    setCity(nextCity);
    setCounty(nextCounty);
    setCountry(nextCountry);
    setPhoneSuccess(null);

    onLocationChangeRef.current?.({
      latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : null,
      longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : null,
      city: nextCity || null,
      county: nextCounty || null,
      country: nextCountry,
    });
  }, [state.success, state.city, state.county, state.country, parsedLatitude, parsedLongitude]);

  useEffect(() => {
    if (!handoff || handoff.status !== "waiting") return;

    const expiresAt = new Date(handoff.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setHandoffSeconds(remaining);
      if (remaining === 0) {
        setHandoffError("The QR code expired. Generate a fresh code to continue from your phone.");
        setHandoff(null);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [handoff]);

  useEffect(() => {
    if (!handoff || handoff.status !== "waiting") return;

    let active = true;
    const handoffId = handoff.handoffId;

    const poll = async () => {
      try {
        const params = new URLSearchParams({ pharmacyId, handoffId });
        const response = await fetch(`/api/onboard/location-handoff?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as HandoffStatusPayload;
        if (!active) return;
        if (!response.ok) throw new Error(payload.message || "Could not check the phone handoff.");

        if (payload.status === "completed") {
          const lat = typeof payload.latitude === "number" ? payload.latitude : null;
          const lng = typeof payload.longitude === "number" ? payload.longitude : null;
          const nextCity = payload.city || "";
          const nextCounty = payload.county || "";
          const nextCountry = payload.country || "Kenya";

          setLatitude(lat != null ? String(lat) : "");
          setLongitude(lng != null ? String(lng) : "");
          setCity(nextCity);
          setCounty(nextCounty);
          setCountry(nextCountry);
          setAccuracy(typeof payload.accuracyMeters === "number" ? payload.accuracyMeters : null);
          setHandoff((current) => current ? { ...current, status: "completed" } : current);
          setHandoffError(null);
          setPhoneSuccess(`Phone location received${nextCity && nextCounty ? ` · ${nextCity}, ${nextCounty}` : ""}.`);
          onLocationChangeRef.current?.({
            latitude: lat,
            longitude: lng,
            city: nextCity || null,
            county: nextCounty || null,
            country: nextCountry,
          });
          return;
        }

        if (["expired", "cancelled", "superseded", "missing"].includes(payload.status || "")) {
          setHandoffError("That QR code is no longer active. Generate a new one to continue from your phone.");
          setHandoff(null);
        }
      } catch (err) {
        if (!active) return;
        setHandoffError(err instanceof Error ? err.message : "Could not check the phone handoff.");
      }
    };

    void poll();
    const timer = window.setInterval(poll, 1800);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [handoff, pharmacyId]);

  const stopActiveCapture = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  };

  const invalidatePhoneHandoff = async (session = handoff) => {
    if (!session || session.status !== "waiting") return;
    try {
      await fetch("/api/onboard/location-handoff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId, handoffId: session.handoffId }),
      });
    } catch {
      // It is safe for the short-lived signed token to expire server-side.
    }
  };

  const startPhoneHandoff = async () => {
    stopActiveCapture();
    setHandoffBusy(true);
    setHandoffError(null);
    setGeoError(null);
    setPhoneSuccess(null);
    setCopied(false);

    try {
      if (handoff?.status === "waiting") await invalidatePhoneHandoff(handoff);
      const response = await fetch("/api/onboard/location-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        handoffId?: string;
        mobileUrl?: string;
        expiresAt?: string;
        message?: string;
      };
      if (!response.ok || !payload.handoffId || !payload.mobileUrl || !payload.expiresAt) {
        throw new Error(payload.message || "Could not create the secure phone handoff.");
      }

      setLatitude("");
      setLongitude("");
      setCity("");
      setCounty("");
      setAccuracy(null);
      onLocationChangeRef.current?.({
        latitude: null,
        longitude: null,
        city: null,
        county: null,
        country: country || "Kenya",
      });
      setHandoff({
        handoffId: payload.handoffId,
        mobileUrl: payload.mobileUrl,
        expiresAt: payload.expiresAt,
        status: "waiting",
      });
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : "Could not create the secure phone handoff.");
    } finally {
      setHandoffBusy(false);
    }
  };

  const cancelPhoneHandoff = async () => {
    const current = handoff;
    setHandoff(null);
    setHandoffError(null);
    setCopied(false);
    await invalidatePhoneHandoff(current);
  };

  const copyPhoneLink = async () => {
    if (!handoff?.mobileUrl) return;
    try {
      await navigator.clipboard.writeText(handoff.mobileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setHandoffError("Could not copy the link. Scan the QR code with your phone camera instead.");
    }
  };

  const useCurrentLocation = () => {
    if (handoff?.status === "waiting") {
      void invalidatePhoneHandoff(handoff);
      setHandoff(null);
    }
    stopActiveCapture();
    setGeoError(null);
    setHandoffError(null);
    setPhoneSuccess(null);

    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser. Use the phone QR option instead.");
      return;
    }

    setBusy(true);
    setAccuracy(null);
    setLatitude("");
    setLongitude("");
    setCity("");
    setCounty("");
    onLocationChangeRef.current?.({
      latitude: null,
      longitude: null,
      city: null,
      county: null,
      country: country || "Kenya",
    });

    let bestPosition: GeolocationPosition | null = null;
    let finished = false;

    const failCapture = (text: string) => {
      if (finished) return;
      finished = true;
      stopActiveCapture();
      setBusy(false);
      setGeoError(text);
    };

    const saveBestPosition = (position: GeolocationPosition) => {
      if (finished) return;
      const { latitude: lat, longitude: lng, accuracy: accuracyMeters } = position.coords;
      if (!Number.isFinite(accuracyMeters) || accuracyMeters > MAX_ACCEPTABLE_ACCURACY_METERS) {
        failCapture(
          `This device only found a broad location (about ±${Math.round(accuracyMeters || 0)} m). Use the phone QR option for a more reliable premises location.`,
        );
        return;
      }

      finished = true;
      stopActiveCapture();
      setLatitude(lat.toFixed(7));
      setLongitude(lng.toFixed(7));
      setAccuracy(accuracyMeters);
      setBusy(false);
      setGeoError(null);
      onLocationChangeRef.current?.({
        latitude: lat,
        longitude: lng,
        city: null,
        county: null,
        country: country || "Kenya",
      });

      const data = new FormData();
      data.set("pharmacyId", pharmacyId);
      data.set("latitude", lat.toString());
      data.set("longitude", lng.toString());
      data.set("accuracyMeters", String(accuracyMeters));
      startTransition(() => saveAction(data));
    };

    const finishWithBestAvailable = () => {
      if (finished) return;
      if (!bestPosition) {
        failCapture("This device could not get a fresh precise position. Use the phone QR option instead.");
        return;
      }
      saveBestPosition(bestPosition);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (finished) return;
        const readingAccuracy = position.coords.accuracy;
        if (!Number.isFinite(readingAccuracy) || readingAccuracy <= 0) return;

        if (!bestPosition || readingAccuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
          setAccuracy(readingAccuracy);
        }
        if (readingAccuracy <= TARGET_ACCURACY_METERS) saveBestPosition(position);
      },
      (error) => {
        if (finished) return;
        if (error.code === error.PERMISSION_DENIED) {
          failCapture("Location permission was denied. Allow precise location or use the phone QR option.");
          return;
        }
        if (error.code === error.POSITION_UNAVAILABLE && !bestPosition) {
          failCapture("This device cannot determine a precise location. Use the phone QR option instead.");
          return;
        }
        if (error.code === error.TIMEOUT) finishWithBestAvailable();
      },
      { enableHighAccuracy: true, timeout: 16_000, maximumAge: 0 },
    );

    settleTimerRef.current = window.setTimeout(finishWithBestAvailable, LOCATION_SETTLE_MS);
  };

  const minutes = Math.floor(handoffSeconds / 60);
  const seconds = String(handoffSeconds % 60).padStart(2, "0");

  return (
    <section className={polish.locationCard} aria-labelledby="pharmacy-location-title">
      <div className={polish.locationTop}>
        <span className={polish.locationIcon}>
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pharmacy-location-title" className={polish.locationTitle}>Pharmacy premises</h2>
          <p className={polish.locationCopy}>
            Capture the premises from a phone for the best accuracy. The location returns to this form automatically.
          </p>
        </div>
      </div>

      {message ? <p className={handoffStyles.handoffError} role="alert">{message}</p> : null}
      {phoneSuccess ? (
        <div className={handoffStyles.phoneReceived} role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{phoneSuccess} You can continue on this computer.</span>
        </div>
      ) : null}
      {state.success && !message && !phoneSuccess && !busy && hasArea ? (
        <div className={polish.locationSaved} role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.success}</span>
        </div>
      ) : null}

      {handoff?.status === "waiting" ? (
        <div className={handoffStyles.handoffPanel}>
          <div className={handoffStyles.handoffHeader}>
            <div>
              <strong>Scan with your phone</strong>
              <p>Open the camera, scan the code, then share the pharmacy’s precise location.</p>
            </div>
            <span className={handoffStyles.expiryPill}>{minutes}:{seconds}</span>
          </div>

          <div className={handoffStyles.handoffBody}>
            <div className={handoffStyles.qrFrame} aria-label="QR code for secure phone location handoff">
              <QRCodeSVG
                value={handoff.mobileUrl}
                size={210}
                level="M"
                bgColor="#ffffff"
                fgColor="#062b24"
              />
            </div>
            <div>
              <div className={handoffStyles.handoffInstructions}>
                <div className={handoffStyles.handoffStep}><b>1</b><span>Scan this QR with the phone you have at the pharmacy.</span></div>
                <div className={handoffStyles.handoffStep}><b>2</b><span>Tap “Use this phone’s precise location” and allow Precise Location.</span></div>
                <div className={handoffStyles.handoffStep}><b>3</b><span>Leave this computer page open. It updates automatically—no typing or refresh.</span></div>
              </div>
              <div className={handoffStyles.waitingRow}><span className={handoffStyles.waitingDot} /> Waiting securely for your phone…</div>
              <div className={handoffStyles.handoffActions}>
                <button type="button" className={handoffStyles.handoffQuietButton} onClick={copyPhoneLink}>
                  <Clipboard className="h-3.5 w-3.5" aria-hidden /> {copied ? "Copied" : "Copy secure link"}
                </button>
                <button type="button" className={handoffStyles.handoffQuietButton} onClick={() => void cancelPhoneHandoff()}>
                  <X className="h-3.5 w-3.5" aria-hidden /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={handoffStyles.captureChoices}>
          <button
            type="button"
            onClick={() => void startPhoneHandoff()}
            disabled={handoffBusy || busy || pending}
            className={`${handoffStyles.captureChoice} ${handoffStyles.captureChoiceRecommended}`}
          >
            <span className={handoffStyles.captureChoiceIcon}>
              {handoffBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Smartphone className="h-5 w-5" aria-hidden />}
            </span>
            <span className={handoffStyles.captureChoiceCopy}>
              <strong>Use your phone <em className={handoffStyles.recommendedBadge}>Recommended</em></strong>
              <span>Scan a QR. Your phone captures GPS and sends the result back here automatically.</span>
            </span>
          </button>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={busy || pending || handoffBusy}
            className={handoffStyles.captureChoice}
          >
            <span className={handoffStyles.captureChoiceIcon}>
              {busy || pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Crosshair className="h-5 w-5" aria-hidden />}
            </span>
            <span className={handoffStyles.captureChoiceCopy}>
              <strong>{hasCoordinates ? "Refresh on this device" : "Use this device"}</strong>
              <span>Useful on phones and GPS-capable devices. Laptops may return a broad network location.</span>
            </span>
          </button>
        </div>
      )}

      {busy ? (
        <p className={polish.locationNote} role="status">
          Checking several fresh readings instead of trusting the first network estimate
          {accuracy != null ? ` · best accuracy so far ±${Math.round(accuracy)} m` : "…"}
        </p>
      ) : null}

      {hasCoordinates ? (
        <div className={polish.locationResult}>
          <div className={polish.locationResultTop}>
            <span className={polish.locationSuccess}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {hasArea ? "Premises area detected" : pending ? "Identifying area…" : "Precise position captured"}
            </span>
            {accuracy != null ? <span className={polish.locationAccuracy}>Accuracy ≈ ±{Math.round(accuracy)} m</span> : null}
          </div>

          <div className={polish.locationChips}>
            <div className={polish.locationChip}>
              <span>City / town</span>
              <strong>{city || "Detecting…"}</strong>
            </div>
            <div className={polish.locationChip}>
              <span>County</span>
              <strong>{county || "Detecting…"}</strong>
            </div>
            <div className={polish.locationChip}>
              <span>Country</span>
              <strong>{country || "Kenya"}</strong>
            </div>
          </div>

          <p className={polish.locationNote}>
            The area is derived from the accepted high-accuracy device position. Broad IP/network locations are never used as a fallback.
          </p>
        </div>
      ) : !busy && !handoff ? (
        <p className={polish.locationNote}>For laptops, the phone QR option is the recommended way to confirm the pharmacy premises.</p>
      ) : null}
    </section>
  );
}
