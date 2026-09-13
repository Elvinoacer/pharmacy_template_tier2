"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2 } from "lucide-react";
import { setBrowseLocation } from "@/app/actions/browse-location";
export default function NearbyLocation({ active }: { active: boolean }) {
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  function locate() {
    setError("");
    if (!navigator.geolocation) { setError("Location is unavailable. You can still browse everything."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocating(false);
      startTransition(async () => {
        const result = await setBrowseLocation(coords.latitude, coords.longitude);
        if (result.error) setError(result.error); else router.refresh();
      });
    }, () => { setLocating(false); setError("Allow location access to see nearest first, or keep browsing."); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  }
  return <div className="my-4 flex flex-wrap items-center gap-3 text-sm">
    <button type="button" disabled={locating || pending} onClick={locate} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 font-semibold text-[var(--brand)]">{locating || pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <MapPin size={16} aria-hidden />}{locating ? "Finding you…" : active ? "Nearest first · update location" : "Show nearest to me"}</button>
    {active ? <button type="button" disabled={pending} className="min-h-11 px-2 text-xs text-[var(--muted)] underline" onClick={() => startTransition(async () => { await setBrowseLocation(null, null); router.refresh(); })}>Clear location</button> : <span className="text-xs text-[var(--muted)]">Browse freely. No pharmacy selection needed.</span>}
    {error && <p role="alert" className="w-full text-sm text-[var(--muted)]">{error}</p>}
  </div>;
}
