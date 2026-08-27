"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanBarcode, Camera, CameraOff, Search, Check, AlertCircle, Sparkles, Plus, ArrowRight } from "lucide-react";
import { toast } from "@/app/components/Toaster";

type LookupResult = {
  ok: boolean;
  found: boolean;
  barcode?: string;
  master?: {
    id: string;
    name: string;
    genericName: string;
    brandName: string | null;
    strengthDisplay: string | null;
    dosageForm: string | null;
    manufacturer: string | null;
    barcode: string | null;
    category: string;
    imageUrl: string | null;
    indications: string | null;
    sideEffects: string | null;
    contraindications: string | null;
    storage: string | null;
    dosage: string | null;
    controlledDrug: boolean;
    controlledDrugSchedule: string | null;
    pediatricUse: boolean;
    requiresRefrigeration: boolean;
    pregnancyCategory: string | null;
  };
  alreadyStocked?: { id: string; slug: string; currentStock: number } | null;
};

/**
 * Phase 3.2 — Barcode / QR scan flow (Decision D16).
 * Uses the browser-native BarcodeDetector API when available, with a manual text input
 * fallback for hardware USB scanners (which behave as fast keyboard entry).
 */
export function BarcodeScanFlow() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{ detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Feature-detect BarcodeDetector (Chromium-only as of 2024).
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setCameraSupported(false);
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Lazily construct the detector.
      // @ts-expect-error — BarcodeDetector is not in TS DOM lib yet.
      detectorRef.current = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
      });
      setCameraActive(true);
      setScanning(true);
      scanLoop();
    } catch (e) {
      console.error("[camera]", e);
      toast.error("Could not start camera. Use the manual entry field below.");
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  }

  async function scanLoop() {
    if (!detectorRef.current || !videoRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes.length > 0 && codes[0].rawValue) {
        const barcode = codes[0].rawValue.trim();
        stopCamera();
        toast.success(`Scanned: ${barcode}`);
        await lookupBarcode(barcode);
        return;
      }
    } catch {
      // Detection errors are transient — just try again next frame.
    }
    if (scanning) {
      rafRef.current = requestAnimationFrame(scanLoop);
    }
  }

  async function lookupBarcode(barcode: string) {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`/api/admin/medications/library/lookup?barcode=${encodeURIComponent(barcode)}`);
      const j: LookupResult = await r.json();
      setResult(j);
      if (!j.found) {
        toast.error(`No medication found for barcode ${barcode}. Try AI Import?`);
      }
    } catch {
      toast.error("Lookup failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualBarcode.trim();
    if (!code) return;
    lookupBarcode(code);
  }

  function addToPharmacy() {
    if (!result?.master) return;
    // Route to the "Add to Pharmacy" flow — POST to the library/add endpoint.
    fetch("/api/admin/medications/library/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicationMasterId: result.master.id,
        price: 0,
        currentStock: 0,
        lowStockThreshold: 10,
        slug: result.master.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        sku: null,
        supplier: null,
        shelfLocation: null,
        overTheCounter: false,
        prescriptionRequired: true,
        publicListing: false,
        active: true,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          toast.success("Added to your pharmacy inventory. Edit to set price and stock.");
          router.push(`/admin/medications/${j.inventoryId}`);
        } else {
          toast.error(j.message || "Could not add to pharmacy.");
        }
      })
      .catch(() => toast.error("Network error."));
  }

  return (
    <div className="space-y-6">
      {/* Camera + manual input */}
      <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-5">
        {!cameraSupported && (
          <div className="mb-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="mr-1 inline h-3 w-3" /> Your browser doesn&apos;t support camera scanning. Use the manual field below (works with hardware USB scanners).
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {cameraSupported && (
            <button
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-4 py-2 text-sm font-semibold admin-text hover:bg-[var(--admin-hover)] disabled:opacity-50"
            >
              {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraActive ? "Stop camera" : "Start camera"}
            </button>
          )}
          <Link
            href="/admin/medications/import/ai"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-500/20 dark:text-purple-400"
          >
            <Sparkles className="h-4 w-4" /> Switch to AI Import
          </Link>
        </div>

        {cameraActive && (
          <div className="mt-4 overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-64 w-full object-cover" playsInline muted />
            <div className="flex items-center justify-center gap-2 bg-black/80 p-2 text-xs text-white">
              {scanning ? <><span className="typing-dot" /> Point at a barcode…</> : "Camera stopped"}
            </div>
          </div>
        )}

        <form onSubmit={onManualSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Type or paste a barcode (e.g. 6001234567890)"
              className="input-admin pl-9 font-mono"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !manualBarcode.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Search className="h-4 w-4" /> Look up
          </button>
        </form>
      </div>

      {/* Result */}
      {loading && (
        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-5 text-center text-sm admin-muted">
          <span className="typing-dot" /> Looking up barcode…
        </div>
      )}

      {result && !result.found && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" /> Not found in the shared library
          </p>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80">
            Barcode <code className="font-mono">{result.barcode}</code> isn&apos;t in MedicationMaster yet. You can import it via AI (recommended) or add it manually.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/admin/medications/import/ai`}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-500/20 dark:text-purple-400"
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Import <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/medications/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
            >
              Manual entry
            </Link>
          </div>
        </div>
      )}

      {result && result.found && result.master && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4" /> Found in shared library
          </p>
          <div className="mt-3 flex items-start gap-4">
            {result.master.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.master.imageUrl} alt={result.master.name} className="h-20 w-20 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <h3 className="text-base font-bold admin-text">{result.master.name}</h3>
              <p className="text-xs admin-muted">
                {result.master.genericName}
                {result.master.brandName ? ` · ${result.master.brandName}` : ""}
                {result.master.strengthDisplay ? ` · ${result.master.strengthDisplay}` : ""}
                {result.master.dosageForm ? ` · ${result.master.dosageForm}` : ""}
                {result.master.manufacturer ? ` · ${result.master.manufacturer}` : ""}
              </p>
              {result.master.controlledDrug && (
                <span className="mt-1 inline-block rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                  Controlled · {result.master.controlledDrugSchedule}
                </span>
              )}
            </div>
          </div>

          {result.alreadyStocked ? (
            <div className="mt-4 rounded-lg bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-400">
              <Check className="mr-1 inline h-3 w-3" /> Already in your inventory ({result.alreadyStocked.currentStock} in stock).{" "}
              <Link href={`/admin/medications/${result.alreadyStocked.id}`} className="font-semibold underline">
                Edit inventory →
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={addToPharmacy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              <Plus className="h-4 w-4" /> Add to my pharmacy
            </button>
          )}
        </div>
      )}
    </div>
  );
}
