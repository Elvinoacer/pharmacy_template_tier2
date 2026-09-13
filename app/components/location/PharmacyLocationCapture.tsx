"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { CheckCircle2, Crosshair, Loader2, MapPin } from "lucide-react";
import {
  saveOnboardingPharmacyLocationAction,
  type GeolocationActionState,
} from "@/app/actions/geolocation";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

const initial: GeolocationActionState = {};

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
  const [state, saveAction, pending] = useActionState(saveOnboardingPharmacyLocationAction, initial);

  const parsedLatitude = latitude ? Number(latitude) : null;
  const parsedLongitude = longitude ? Number(longitude) : null;
  const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
  const hasArea = Boolean(city || county);
  const message = state.error || geoError;

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

  const useCurrentLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser. Open this application on a phone with location enabled.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy: accuracyMeters } = position.coords;
        setLatitude(lat.toFixed(7));
        setLongitude(lng.toFixed(7));
        setAccuracy(Number.isFinite(accuracyMeters) ? accuracyMeters : null);
        onLocationChange?.({ latitude: lat, longitude: lng });
        setBusy(false);

        const data = new FormData();
        data.set("pharmacyId", pharmacyId);
        data.set("latitude", lat.toString());
        data.set("longitude", lng.toString());
        data.set("accuracyMeters", String(accuracyMeters));
        startTransition(() => saveAction(data));
      },
      (error) => {
        setBusy(false);
        setGeoError(error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Allow location access while at the pharmacy."
          : error.code === error.TIMEOUT
            ? "Location lookup timed out. Try again with GPS enabled, from the pharmacy premises."
            : "Could not read your location. Try again from the pharmacy premises.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
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
            No coordinates to type. Use the device at the pharmacy and we’ll identify the area for you.
          </p>
        </div>
      </div>

      {message ? (
        <p className={polish.locationAlert} role="alert">{message}</p>
      ) : null}

      {state.success && !message ? (
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
        {busy ? "Finding your location…" : pending ? "Identifying your area…" : hasCoordinates ? "Refresh current location" : "Use my current location"}
      </button>

      {hasCoordinates ? (
        <div className={polish.locationResult}>
          <div className={polish.locationResultTop}>
            <span className={polish.locationSuccess}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {hasArea ? "Premises area detected" : pending ? "Identifying area…" : "Location captured"}
            </span>
            {accuracy != null ? <span className={polish.locationAccuracy}>GPS accuracy ≈ {Math.round(accuracy)} m</span> : null}
          </div>

          <div className={polish.locationChips}>
            <div className={polish.locationChip}>
              <span>City</span>
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
            These details come from the captured premises location and cannot be manually overridden during onboarding.
          </p>
        </div>
      ) : (
        <p className={polish.locationNote}>Use the button above while physically at the pharmacy premises.</p>
      )}
    </section>
  );
}
