"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { CheckCircle2, Crosshair, Loader2, MapPin } from "lucide-react";
import {
  saveCustomerLocationAction,
  type GeolocationActionState,
} from "@/app/actions/geolocation";

const initial: GeolocationActionState = {};

export default function CustomerLocationCapture() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [capturedAt, setCapturedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, saveAction, pending] = useActionState(saveCustomerLocationAction, initial);

  const useCurrentLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser. You can skip this or try another browser.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy: accuracyMeters } = position.coords;
        const timestamp = new Date(position.timestamp || Date.now()).toISOString();
        setLatitude(lat.toFixed(7));
        setLongitude(lng.toFixed(7));
        setAccuracy(Number.isFinite(accuracyMeters) ? accuracyMeters : null);
        setCapturedAt(timestamp);
        setBusy(false);

        requestAnimationFrame(() => {
          const form = formRef.current;
          if (!form) return;
          const data = new FormData(form);
          data.set("latitude", lat.toString());
          data.set("longitude", lng.toString());
          data.set("accuracyMeters", String(accuracyMeters));
          data.set("capturedAt", timestamp);
          startTransition(() => saveAction(data));
        });
      },
      (error) => {
        setBusy(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. You can allow it in your browser settings and try again."
            : error.code === error.TIMEOUT
              ? "Location lookup timed out. Try again with GPS enabled."
              : "Could not read your location. Try again when location services are available.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const message = state.error || geoError;

  return (
    <section className="rounded-2xl border border-[#dcebe5] bg-[#f8fbf9] p-4 sm:p-5" aria-labelledby="customer-location-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="customer-location-title" className="text-sm font-semibold text-[#0c1a14]">
            Find pharmacies near you
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#5a6b62]">
            Share your current location to help Afyvia show nearby pharmacies and improve location-aware services. Your browser will ask for permission first.
          </p>
        </div>
      </div>

      {message && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-800" role="alert">
          {message}
        </p>
      )}
      {state.success && !message && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.success}</span>
        </p>
      )}

      <form ref={formRef} action={saveAction} className="mt-4 space-y-3">
        <input type="hidden" name="latitude" value={latitude} />
        <input type="hidden" name="longitude" value={longitude} />
        <input type="hidden" name="accuracyMeters" value={accuracy ?? ""} />
        <input type="hidden" name="capturedAt" value={capturedAt} />

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={busy || pending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0d6e5a] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a5b4b] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {busy || pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
          {busy ? "Finding your location…" : pending ? "Saving location…" : "Use my current location"}
        </button>

        <p className="text-[11px] leading-5 text-[#7a8b84]">
          Location sharing is optional. You can continue without it and add/update your location later from your profile.
        </p>
      </form>
    </section>
  );
}
