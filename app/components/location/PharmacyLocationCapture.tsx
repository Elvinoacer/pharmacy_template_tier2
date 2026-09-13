"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Crosshair, Loader2, MapPin } from "lucide-react";
import {
  saveOnboardingPharmacyLocationAction,
  type GeolocationActionState,
} from "@/app/actions/geolocation";

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
  const formRef = useRef<HTMLFormElement>(null);
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
  }, [state.success, state.city, state.county, state.country, latitude, longitude, onLocationChange, parsedLatitude, parsedLongitude]);

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

  const placeLabel = [city, county].filter(Boolean).join(", ");

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
            Pharmacy location
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Nothing to type here. Share the location while you are at the pharmacy and we will fill the city and county automatically.
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

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={busy || pending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {busy || pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
          {busy ? "Finding your location…" : pending ? "Identifying city & county…" : hasCoordinates ? "Refresh current location" : "Use my current location"}
        </button>

        {hasCoordinates ? (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/55 p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Detected premises area</p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {hasArea ? placeLabel : pending ? "Identifying your area…" : "Location saved"}
                </p>
                {country ? <p className="mt-0.5 text-xs text-[var(--muted)]">{country}</p> : null}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Device captured
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              City and county are derived from this captured location and cannot be typed manually.
              {accuracy != null ? ` GPS accuracy is about ${Math.round(accuracy)} m.` : ""}
            </p>
          </div>
        ) : (
          <p className="text-xs leading-5 text-[var(--muted)]">
            Use the button above while physically at the pharmacy premises.
          </p>
        )}
      </form>
    </section>
  );
}
