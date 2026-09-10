"use client";

import { useActionState, useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
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
  pharmacyName,
}: {
  defaults: LocationFormDefaults;
  pharmacyName?: string;
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
        setGeoNote(`Captured current location (±${Math.round(accuracy)} m). Review the pin, then save.`);

        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (res.ok) {
            const data = (await res.json()) as {
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
          // Reverse geocoding is optional; coordinates remain usable when it fails.
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
  const knownName = defaults.displayName || pharmacyName || "Your pharmacy";

  return (
    <form action={action} className="space-y-5 sm:space-y-6">
      <section className="admin-card relative overflow-hidden rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 sm:p-6">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[var(--admin-accent)] opacity-70" />
        <div className="inline-flex min-h-7 items-center rounded-full bg-[var(--admin-accent-soft)] px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--admin-accent-text)]">
          Already on file
        </div>
        <h2 className="mt-3 break-words text-lg font-semibold text-[var(--admin-text)] sm:text-xl" style={{ fontFamily: "var(--font-display), serif" }}>
          {knownName}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm text-[var(--admin-text-muted)] sm:grid-cols-2">
          {defaults.email && (
            <div className="min-w-0 rounded-xl bg-[var(--admin-inset)] p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-text-soft)]">Email</dt>
              <dd className="mt-1 break-all text-[var(--admin-text-muted)]">{defaults.email}</dd>
            </div>
          )}
          {defaults.phone && (
            <div className="min-w-0 rounded-xl bg-[var(--admin-inset)] p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-text-soft)]">Phone</dt>
              <dd className="mt-1 break-words text-[var(--admin-text-muted)]">{defaults.phone}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 max-w-2xl text-xs leading-5 text-[var(--admin-text-soft)] sm:text-sm sm:leading-6">
          These came from your application. You can adjust contact details below if anything changed.
        </p>
        <input type="hidden" name="displayName" value={defaults.displayName} />
      </section>

      <section className="admin-card rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold admin-text">Map pin</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 admin-muted sm:leading-relaxed">
              Patients use this for directions. Capture once from your phone at the premises, or type coordinates.
            </p>
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoBusy}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-accent-soft)] px-3 py-2 text-xs font-semibold text-[var(--admin-accent-text)] transition hover:bg-[var(--admin-hover)] disabled:cursor-wait disabled:opacity-50 sm:w-auto"
          >
            {geoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
            Use my current location
          </button>
        </div>

        {(geoError || state.error) && (
          <p className="mt-3 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-danger-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--danger)]" role="alert">
            {geoError || state.error}
          </p>
        )}
        {(geoNote || state.success) && !geoError && !state.error && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-success-soft)] px-3 py-2.5 text-xs leading-5 text-[var(--success)]">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{geoNote || state.success}</span>
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold admin-muted">
            Latitude
            <input name="latitude" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.286389" className="input-admin mt-1.5 w-full" inputMode="decimal" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Longitude
            <input name="longitude" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="36.817223" className="input-admin mt-1.5 w-full" inputMode="decimal" />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Street address
            <input name="addressLine1" value={line1} onChange={(e) => setLine1(e.target.value)} className="input-admin mt-1.5 w-full" placeholder="Building, street, or estate" autoComplete="street-address" />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Address line 2 <span className="font-normal opacity-70">(optional)</span>
            <input name="addressLine2" defaultValue={defaults.addressLine2} className="input-admin mt-1.5 w-full" autoComplete="address-line2" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            City
            <input name="city" value={city} onChange={(e) => setCity(e.target.value)} className="input-admin mt-1.5 w-full" autoComplete="address-level2" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            County / state
            <input name="state" defaultValue={defaults.state} className="input-admin mt-1.5 w-full" autoComplete="address-level1" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Postal code <span className="font-normal opacity-70">(optional)</span>
            <input name="zip" defaultValue={defaults.zip} className="input-admin mt-1.5 w-full" autoComplete="postal-code" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            Country
            <input name="country" defaultValue={defaults.country} className="input-admin mt-1.5 w-full" autoComplete="country-name" />
          </label>
        </div>
      </section>

      <section className="admin-card rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-6">
        <h2 className="text-sm font-semibold admin-text">Public contact</h2>
        <p className="mt-1 text-xs leading-5 admin-muted">Shown on your storefront. Pre-filled from onboarding where available.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold admin-muted">
            Phone
            <input name="phone" defaultValue={defaults.phone} className="input-admin mt-1.5 w-full" autoComplete="tel" />
          </label>
          <label className="block text-xs font-semibold admin-muted">
            WhatsApp
            <input name="whatsapp" defaultValue={defaults.whatsapp} className="input-admin mt-1.5 w-full" autoComplete="tel" />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Public email
            <input name="email" type="email" defaultValue={defaults.email} className="input-admin mt-1.5 w-full" autoComplete="email" />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Opening hours <span className="font-normal opacity-70">(one per line: Day | Time)</span>
            <textarea name="hoursText" defaultValue={defaults.hoursText} rows={4} className="input-admin mt-1.5 w-full font-mono text-xs" placeholder={"Monday – Friday | 8:00 AM – 8:00 PM\nSaturday | 9:00 AM – 6:00 PM"} />
          </label>
          <label className="block text-xs font-semibold admin-muted sm:col-span-2">
            Custom map embed URL <span className="font-normal opacity-70">(optional)</span>
            <input name="mapsEmbedUrl" value={embedOverride} onChange={(e) => setEmbedOverride(e.target.value)} className="input-admin mt-1.5 w-full" placeholder="Leave blank to auto-build from lat/lng" />
          </label>
          <input type="hidden" name="placeId" defaultValue={defaults.placeId} />
        </div>
      </section>

      <section className="admin-card rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold admin-text">
            <MapPin className="h-4 w-4 admin-accent-text" />
            Map preview
          </h2>
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold admin-accent-text hover:underline">
              <Navigation className="h-3.5 w-3.5" />
              Test directions
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)]">
          {preview ? (
            <iframe title="Pharmacy location preview" src={preview} className="location-map-preview h-52 w-full border-0 sm:h-64" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          ) : (
            <div className="flex h-52 flex-col items-center justify-center gap-2 px-4 text-center text-sm admin-muted sm:h-64">
              <MapPin className="h-8 w-8 opacity-40" />
              Set latitude &amp; longitude (or use your current location) to preview the map.
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/admin/setup" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-4 py-2.5 text-sm font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)] sm:w-auto">
          <ArrowLeft className="h-4 w-4" />
          Back to checklist
        </Link>
        <button type="submit" disabled={pending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--admin-btn-fg)] shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-50 sm:w-auto">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save and continue
        </button>
      </div>
    </form>
  );
}
