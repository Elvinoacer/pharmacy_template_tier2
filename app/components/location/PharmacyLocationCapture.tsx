"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Crosshair, Loader2, MapPin } from "lucide-react";
import {
  saveOnboardingPharmacyLocationAction,
  type GeolocationActionState,
} from "@/app/actions/geolocation";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

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
  const watchIdRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const [state, saveAction, pending] = useActionState(saveOnboardingPharmacyLocationAction, initial);

  const parsedLatitude = latitude ? Number(latitude) : null;
  const parsedLongitude = longitude ? Number(longitude) : null;
  const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
  const hasArea = Boolean(city && county);
  const message = geoError || (!busy ? state.error : undefined);

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

    onLocationChange?.({
      latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : null,
      longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : null,
      city: nextCity || null,
      county: nextCounty || null,
      country: nextCountry,
    });
  }, [state.success, state.city, state.county, state.country, parsedLatitude, parsedLongitude, onLocationChange]);

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

  const useCurrentLocation = () => {
    stopActiveCapture();
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser. Open this application on a phone with location enabled.");
      return;
    }

    // Do not keep showing a previously-derived locality while a new capture is
    // in progress. The parent wizard also becomes non-ready until the new
    // precise position has been reverse-geocoded successfully.
    setBusy(true);
    setAccuracy(null);
    setLatitude("");
    setLongitude("");
    setCity("");
    setCounty("");
    onLocationChange?.({
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
          `Your device only found a broad location (about ±${Math.round(accuracyMeters || 0)} m). Turn on precise location/GPS or use a phone at the pharmacy, then try again.`,
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
      onLocationChange?.({
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
        failCapture("We could not get a fresh device location. Enable location services and try again, preferably from a phone at the pharmacy premises.");
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

        // A strong GPS/Wi-Fi fix can be accepted immediately. Otherwise keep
        // listening briefly because browsers often improve from a coarse first
        // reading to a much better second/third reading.
        if (readingAccuracy <= TARGET_ACCURACY_METERS) {
          saveBestPosition(position);
        }
      },
      (error) => {
        if (finished) return;
        if (error.code === error.PERMISSION_DENIED) {
          failCapture("Location permission was denied. Allow precise location access while you are at the pharmacy, then try again.");
          return;
        }
        if (error.code === error.POSITION_UNAVAILABLE && !bestPosition) {
          failCapture("Your device could not determine a location. Turn on GPS/location services or try from a phone at the pharmacy.");
          return;
        }
        if (error.code === error.TIMEOUT) finishWithBestAvailable();
      },
      { enableHighAccuracy: true, timeout: 16_000, maximumAge: 0 },
    );

    settleTimerRef.current = window.setTimeout(finishWithBestAvailable, LOCATION_SETTLE_MS);
  };

  return (
    <section className={polish.locationCard} aria-labelledby="pharmacy-location-title">
      <div className={polish.locationTop}>
        <span className={polish.locationIcon}>
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pharmacy-location-title" className={polish.locationTitle}>Pharmacy premises</h2>
          <p className={polish.locationCopy}>
            No coordinates to type. We wait briefly for a precise device fix, then derive the city and Kenyan county automatically.
          </p>
        </div>
      </div>

      {message ? (
        <p className={polish.locationAlert} role="alert">{message}</p>
      ) : null}

      {state.success && !message && !busy && hasArea ? (
        <div className={polish.locationSaved} role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.success}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={busy || pending}
        className={polish.locationAction}
      >
        {busy || pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Locking a precise location…" : pending ? "Identifying city & county…" : hasCoordinates ? "Refresh current location" : "Use my current location"}
      </button>

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
            The area is derived from the accepted high-accuracy device position. Broad IP/network locations are rejected rather than saved.
          </p>
        </div>
      ) : !busy ? (
        <p className={polish.locationNote}>Use the button while physically at the pharmacy. A phone with precise location enabled gives the best result.</p>
      ) : null}
    </section>
  );
}
