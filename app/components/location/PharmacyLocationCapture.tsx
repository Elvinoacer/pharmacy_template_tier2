"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, CheckCircle2 } from "lucide-react";
import {
  saveOnboardingPharmacyLocationAction,
  type GeolocationActionState,
} from "@/app/actions/geolocation";

const initial: GeolocationActionState = {};

type Props = {
  pharmacyId: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onCoordinatesChange?: (latitude: number | null, longitude: number | null) => void;
};

export default function PharmacyLocationCapture({ pharmacyId, initialLatitude = null, initialLongitude = null, onCoordinatesChange }: Props) {
  const [latitude, setLatitude] = useState(initialLatitude != null ? String(initialLatitude) : "");
  const [longitude, setLongitude] = useState(initialLongitude != null ? String(initialLongitude) : "");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, saveAction, pending] = useActionState(saveOnboardingPharmacyLocationAction, initial);

  const notifyCoordinates = (lat: string, lng: string) => {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    onCoordinatesChange?.(Number.isFinite(parsedLat) ? parsedLat : null, Number.isFinite(parsedLng) ? parsedLng : null);
  };

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
        notifyCoordinates(String(lat), String(lng));
        setBusy(false);

        requestAnimationFrame(() => {
          const form = formRef.current;
          if (!form) return;
          const data = new FormData(form);
          data.set("pharmacyId", pharmacyId);
          data.set("latitude", lat.toString());
          data.set("longitude", lng.toString());
          data.set("accuracyMeters", String(accuracyMeters));
          startTransition(() => saveAction(data));
        });
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

  const hasCoordinates = Boolean(latitude && longitude);
  const message = state.error || geoError;

  return (
    <section
      className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4 text-[var(--foreground)] transition-colors duration-300 sm:p-5"
      aria-labelledby="pharmacy-location-title"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--brand-soft)] text-[var(--brand)]">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pharmacy-location-title" className="text-sm font-semibold text-[var(--foreground)]">
            Map pin
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Capture your location while at the pharmacy. Your reviewer checks this pin against the premises.
          </p>
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2.5 text-xs leading-5 text-rose-700 dark:text-rose-200" role="alert">
          {message}
        </p>
      )}
      {state.success && !message && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2.5 text-xs leading-5 text-emerald-700 dark:text-emerald-200" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.success}</span>
        </p>
      )}

      <form ref={formRef} action={saveAction} className="mt-4 space-y-3">
        <input type="hidden" name="pharmacyId" value={pharmacyId} />
        <input type="hidden" name="latitude" value={latitude} />
        <input type="hidden" name="longitude" value={longitude} />
        <input type="hidden" name="accuracyMeters" value={accuracy ?? ""} />

        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={busy || pending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {busy || pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
            {busy ? "Finding your location…" : pending ? "Saving location…" : hasCoordinates ? "Refresh my location" : "Use my current location"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0 text-xs font-semibold text-[var(--muted)]">
            Latitude
            <input
              name="latitudeManual"
              value={latitude}
              onChange={(event) => { setLatitude(event.target.value); notifyCoordinates(event.target.value, longitude); }}
              placeholder="e.g. -1.286389"
              inputMode="decimal"
              className="input-admin mt-1.5 w-full"
              aria-label="Pharmacy latitude"
            />
          </label>
          <label className="block min-w-0 text-xs font-semibold text-[var(--muted)]">
            Longitude
            <input
              name="longitudeManual"
              value={longitude}
              onChange={(event) => { setLongitude(event.target.value); notifyCoordinates(latitude, event.target.value); }}
              placeholder="e.g. 36.817223"
              inputMode="decimal"
              className="input-admin mt-1.5 w-full"
              aria-label="Pharmacy longitude"
            />
          </label>
        </div>

        {hasCoordinates && (
          <p className="break-words text-xs leading-5 text-[var(--muted)]">
            Map pin: <span className="font-medium text-[var(--foreground)]">{latitude}, {longitude}</span>
            {accuracy != null && <> · GPS accuracy about <span className="font-medium text-[var(--foreground)]">{Math.round(accuracy)} m</span></>}
          </p>
        )}
      </form>
    </section>
  );
}
