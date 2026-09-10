"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ScanBarcode,
  Camera,
  CameraOff,
  Search,
  Check,
  AlertCircle,
  Sparkles,
  Plus,
  ArrowRight,
  Keyboard,
} from "lucide-react";
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

function subscribeToBarcodeDetector() {
  return () => {};
}

function useBarcodeDetectorSupported(): boolean {
  return useSyncExternalStore(
    subscribeToBarcodeDetector,
    () => "BarcodeDetector" in window,
    () => false,
  );
}

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
  const scanningRef = useRef(false);

  const cameraSupported = useBarcodeDetectorSupported();
  const [cameraActive, setCameraActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
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
      // @ts-expect-error — BarcodeDetector is not in TS DOM lib yet.
      detectorRef.current = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"],
      });
      scanningRef.current = true;
      setCameraActive(true);
      setScanning(true);
      void scanLoop();
    } catch (error) {
      console.error("[camera]", error);
      toast.error("Could not start camera. Use the barcode field below.");
      scanningRef.current = false;
      setCameraActive(false);
      setScanning(false);
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  }

  async function scanLoop() {
    if (!scanningRef.current || !detectorRef.current || !videoRef.current) return;
    try {
      const codes = await detectorRef.current.detect(videoRef.current);
      if (codes.length > 0 && codes[0].rawValue) {
        const barcode = codes[0].rawValue.trim();
        stopCamera();
        setManualBarcode(barcode);
        toast.success(`Scanned: ${barcode}`);
        await lookupBarcode(barcode);
        return;
      }
    } catch {
      // Detection errors are transient — try again on the next animation frame.
    }
    if (scanningRef.current) {
      rafRef.current = requestAnimationFrame(() => void scanLoop());
    }
  }

  async function lookupBarcode(barcode: string) {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/medications/library/lookup?barcode=${encodeURIComponent(barcode)}`);
      const lookupResult: LookupResult = await response.json();
      setResult(lookupResult);
      if (!lookupResult.found) {
        toast.error(`No medication found for barcode ${barcode}. Try AI Import?`);
      }
    } catch {
      toast.error("Lookup failed. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function onManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = manualBarcode.trim();
    if (!code) return;
    void lookupBarcode(code);
  }

  function addToPharmacy() {
    if (!result?.master) return;
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
      .then((response) => response.json())
      .then((payload) => {
        if (payload.ok) {
          toast.success("Added to your pharmacy inventory. Edit to set price and stock.");
          router.push(`/admin/medications/${payload.inventoryId}`);
        } else {
          toast.error(payload.message || "Could not add to pharmacy.");
        }
      })
      .catch(() => toast.error("Network error."));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 shadow-sm sm:rounded-3xl sm:p-5">
        {!cameraSupported && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Your browser does not support native camera scanning. Manual entry and USB keyboard scanners still work.</span>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {cameraSupported && (
            <button
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={loading}
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50 ${
                cameraActive
                  ? "border border-rose-500/20 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
                  : "bg-[var(--admin-accent)] text-white shadow-sm hover:brightness-105"
              }`}
            >
              {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraActive ? "Stop camera" : "Start camera"}
            </button>
          )}
          <Link
            href="/admin/medications/import/ai"
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 text-sm font-semibold text-purple-700 transition-all hover:bg-purple-500/15 active:scale-[0.99] dark:text-purple-300 ${!cameraSupported ? "sm:col-span-2" : ""}`}
          >
            <Sparkles className="h-4 w-4" /> Switch to AI Import
          </Link>
        </div>

        {cameraActive && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-inner">
            <video ref={videoRef} className="aspect-[4/3] max-h-[28rem] w-full object-cover sm:aspect-video" playsInline muted />
            <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/70 p-2.5 text-xs font-medium text-white backdrop-blur-sm">
              {scanning ? (
                <>
                  <span className="typing-dot" /> Align one barcode inside the frame
                </>
              ) : (
                "Camera stopped"
              )}
            </div>
          </div>
        )}

        <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] admin-soft">
          <span className="h-px flex-1 bg-[var(--admin-border-2)]" />
          <span className="inline-flex items-center gap-1.5"><Keyboard className="h-3 w-3" /> Manual or USB scanner</span>
          <span className="h-px flex-1 bg-[var(--admin-border-2)]" />
        </div>

        <form onSubmit={onManualSubmit} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 admin-soft" />
            <input
              type="text"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              placeholder="Type or scan barcode"
              className="input-admin min-h-11 w-full pl-10 font-mono"
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              aria-label="Barcode"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !manualBarcode.trim()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50 sm:w-auto"
          >
            <Search className="h-4 w-4" /> {loading ? "Looking up…" : "Look up"}
          </button>
        </form>
      </section>

      <div aria-live="polite">
        {loading && (
          <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-5 text-center text-sm admin-muted">
            <span className="typing-dot" /> Looking up barcode…
          </div>
        )}

        {result && !result.found && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm sm:p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" /> Not found in the shared library
            </p>
            <p className="mt-2 break-words text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/75">
              Barcode <code className="rounded bg-amber-500/10 px-1 font-mono">{result.barcode}</code> is not in MedicationMaster yet. AI Import is the fastest fallback; manual entry is available too.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/admin/medications/import/ai"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-purple-500/10 px-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-500/20 dark:text-purple-300"
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Import <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/admin/medications/new"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--admin-inset)] px-3 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
              >
                Manual entry
              </Link>
            </div>
          </section>
        )}

        {result && result.found && result.master && (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm sm:p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
              <Check className="h-4 w-4 shrink-0" /> Found in shared library
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
              {result.master.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.master.imageUrl}
                  alt={result.master.name}
                  className="h-24 w-24 rounded-2xl border border-[var(--admin-border-2)] object-cover"
                />
              )}
              <div className="min-w-0">
                <h3 className="break-words text-base font-bold admin-text">{result.master.name}</h3>
                <p className="mt-1 text-xs leading-relaxed admin-muted">
                  {result.master.genericName}
                  {result.master.brandName ? ` · ${result.master.brandName}` : ""}
                  {result.master.strengthDisplay ? ` · ${result.master.strengthDisplay}` : ""}
                  {result.master.dosageForm ? ` · ${result.master.dosageForm}` : ""}
                  {result.master.manufacturer ? ` · ${result.master.manufacturer}` : ""}
                </p>
                {result.master.controlledDrug && (
                  <span className="mt-2 inline-flex rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
                    Controlled · {result.master.controlledDrugSchedule}
                  </span>
                )}
              </div>
            </div>

            {result.alreadyStocked ? (
              <div className="mt-4 rounded-xl border border-blue-500/15 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-800 dark:text-blue-200">
                <Check className="mr-1 inline h-3 w-3" /> Already in inventory ({result.alreadyStocked.currentStock} in stock).{" "}
                <Link href={`/admin/medications/${result.alreadyStocked.id}`} className="font-semibold underline underline-offset-2">
                  Edit inventory →
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={addToPharmacy}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 active:scale-[0.99] sm:w-auto"
              >
                <Plus className="h-4 w-4" /> Add to my pharmacy
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
