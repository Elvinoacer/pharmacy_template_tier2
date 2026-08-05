"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import {
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Save,
} from "lucide-react";
import {
  savePharmacyLocationAction,
  type LocationActionState,
} from "@/app/actions/location";

export type LocationFormDefaults = {
  displayName: string;
  phone: string;
  email: string;
  whatsapp: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: string;
  longitude: string;
  placeId: string;
  mapsEmbedUrl: string;
  hoursText: string;
};

const initial: LocationActionState = {};

function buildPreviewEmbed(lat: string, lng: string, override?: string) {
  if (override?.trim()) return override.trim();
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(`${la},${lo}`)}&z=16&output=embed`;
}

function buildDirections(lat: string, lng: string, address: string) {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  if (Number.isFinite(la) && Number.isFinite(lo)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`;
  }
  if (address.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return null;
}

export default function LocationSettingsForm({
  defaults,
}: {
  defaults: LocationFormDefaults;
}) {
  const [state, action, pending] = useActionState(savePharmacyLocationAction, initial);
  const [lat, setLat] = useState(defaults.latitude);
  const [lng, setLng] = useState(defaults.longitude);
  const [line1, setLine1] = useState(defaults.addressLine1);
  const [city, setCity] = useState(defaults.city);
  const [embedOverride, setEmbedOverride] = useState(defaults.mapsEmbedUrl);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoNote, setGeoNote] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      setGeoNote(state.success);
    }
  }, [state.success]);

  const useMyLocation = useCallback(() => {
    setGeoError(null);
    setGeoNote(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        setGeoNote(
          `Captured current location (±${Math.round(accuracy)} m). Review the pin, then save.`,
        );

        // Best-effort reverse geocode via OpenStreetMap Nominatim (no key).
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
          const res = await fetch(url, {
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const data = (await res.json()) as {
              display_name?: string;
              address?: {
                road?: string;
                pedestrian?: string;
                suburb?: string;
                city?: string;
                town?: string;
                village?: string;
                state?: string;
                postcode?: string;
                country?: string;
              };
            };
            const a = data.address;
            if (a) {
              const street = a.road || a.pedestrian || "";
              if (street) setLine1(street);
              const c = a.city || a.town || a.village || a.suburb || "";
              if (c) setCity(c);
            }
          }
        } catch {
          // Reverse geocode is optional
        }
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location access or enter coordinates manually."
            : "Could not read your location. Enter latitude and longitude manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  const fullAddress = [line1, city, defaults.state, defaults.zip].filter(Boolean).join(", ");
  const preview = buildPreviewEmbed(lat, lng, embedOverride);
  const directions = buildDirections(lat, lng, fullAddress || defaults.addressLine1);

  return (
    <form action={action} className="space-y-6">
      <div className="admin-card rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold admin-text">Pharmacy location</h2>
            <p className="mt-1 text-xs admin-muted">
              Capture your pin once — the public contact page shows the map and a Get directions
              button automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoBusy}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-600/30 bg-teal-500/10 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-500/15 disabled:opacity-50 dark:text-teal-200"
          >
            {geoBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            Use my current location
          </button>
        </div>

        {(geoError || state.error) && (
          <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
            {geoError || state.error}
          </p>
        )}
        {(geoNote || state.success) && !geoError && !state.error && (
          <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
            {geoNote || state.success}
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold admin-muted">
            Latitude
            <input
              name="latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="-1.286389"
              className="input-admin mt-1.5 w-full"
              inputMode="decimal"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Longitude
            <input
              name="longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="36.817223"
              className="input-admin mt-1.5 w-full"
              inputMode="decimal"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Street address
            <input
              name="addressLine1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="input-admin mt-1.5 w-full"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Address line 2
            <input
              name="addressLine2"
              defaultValue={defaults.addressLine2}
              className="input-admin mt-1.5 w-full"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            City
            <input
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-admin mt-1.5 w-full"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            State / county
            <input
              name="state"
              defaultValue={defaults.state}
              className="input-admin mt-1.5 w-full"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Postal code
            <input name="zip" defaultValue={defaults.zip} className="input-admin mt-1.5 w-full" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Country
            <input
              name="country"
              defaultValue={defaults.country}
              className="input-admin mt-1.5 w-full"
            />
          </label>
        </div>
      </div>

      <div className="admin-card rounded-2xl border p-5 sm:p-6">
        <h2 className="text-sm font-semibold admin-text">Contact details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Display name
            <input
              name="displayName"
              defaultValue={defaults.displayName}
              className="input-admin mt-1.5 w-full"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Phone
            <input name="phone" defaultValue={defaults.phone} className="input-admin mt-1.5 w-full" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            WhatsApp
            <input
              name="whatsapp"
              defaultValue={defaults.whatsapp}
              className="input-admin mt-1.5 w-full"
            />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Email
            <input name="email" defaultValue={defaults.email} className="input-admin mt-1.5 w-full" />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Hours (one per line: Day | Time)
            <textarea
              name="hoursText"
              defaultValue={defaults.hoursText}
              rows={4}
              className="input-admin mt-1.5 w-full font-mono text-xs"
              placeholder={"Monday – Friday | 8:00 AM – 8:00 PM\nSaturday | 9:00 AM – 6:00 PM"}
            />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Custom map embed URL (optional)
            <input
              name="mapsEmbedUrl"
              value={embedOverride}
              onChange={(e) => setEmbedOverride(e.target.value)}
              className="input-admin mt-1.5 w-full"
              placeholder="Leave blank to auto-build from lat/lng"
            />
          </label>
          <input type="hidden" name="placeId" defaultValue={defaults.placeId} />
        </div>
      </div>

      <div className="admin-card rounded-2xl border p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold admin-text">
            <MapPin className="h-4 w-4 admin-accent-text" />
            Public map preview
          </h2>
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold admin-accent-text hover:underline"
            >
              <Navigation className="h-3.5 w-3.5" />
              Test Get directions
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border admin-border bg-[var(--admin-inset)]">
          {preview ? (
            <iframe
              title="Pharmacy location preview"
              src={preview}
              className="h-64 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm admin-muted">
              <MapPin className="h-8 w-8 opacity-40" />
              Set latitude &amp; longitude (or Use my current location) to preview the map.
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-teal-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save location
        </button>
      </div>
    </form>
  );
}
