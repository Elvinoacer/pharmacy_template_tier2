"use client";

import Link from "next/link";
import { useTenantHref } from "./TenantLink";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import {
  Camera,
  ImagePlus,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import {
  MedicineCatalogGrid,
  type MedicineCatalogItem,
} from "@/app/components/MedicineCatalogCard";
import { platform } from "@/app/lib/data";

type MatchItem = MedicineCatalogItem & {
  matchScore: number;
  matchLabel: string;
};

type Identified = {
  name: string;
  genericName: string | null;
  brandName: string | null;
  strength: string | null;
  confidence: number;
};

type ApiOk = {
  ok: true;
  identified: Identified[];
  summary: string;
  matches: MatchItem[];
  tips: string[];
  contactHint: boolean;
};

type ApiErr = {
  ok: false;
  error?: string;
  message: string;
};

type Phase = "idle" | "preview" | "reading" | "shelves" | "done" | "error";

const STAGE_COPY: Record<"reading" | "shelves", string[]> = {
  reading: [
    "Taking a careful look at the pack…",
    "Reading the label like a friendly pharmacist…",
    "Spotting the name on the foil…",
  ],
  shelves: [
    "Checking what we actually stock…",
    "Matching against our live shelves…",
    "Pulling real prices and availability…",
  ],
};

function pickStage(phase: "reading" | "shelves") {
  const list = STAGE_COPY[phase];
  return list[Math.floor(Math.random() * list.length)] || list[0];
}

export default function MedicineImageSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const contactHref = useTenantHref("/contact");
  const refillHref = useTenantHref("/refill");
  const inputId = useId();
  const cameraId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stageLine, setStageLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiOk | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const reset = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(null);
    setPhase("idle");
    setError(null);
    setResult(null);
    setStageLine("");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }, []);

  const acceptFile = useCallback((next: File | null | undefined) => {
    if (!next) return;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(next);
    });
    setFile(next);
    setPhase("preview");
    setError(null);
    setResult(null);
    onOpenChange(true);
  }, [onOpenChange]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const runSearch = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setPhase("reading");
    setStageLine(pickStage("reading"));

    const form = new FormData();
    form.append("image", file);

    const shelvesTimer = window.setTimeout(() => {
      setPhase("shelves");
      setStageLine(pickStage("shelves"));
    }, 900);

    try {
      const res = await fetch("/api/medicines/image-search", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as ApiOk | ApiErr;
      window.clearTimeout(shelvesTimer);

      if (!res.ok || !data.ok) {
        const msg =
          !data.ok && "message" in data
            ? data.message
            : "We couldn’t finish that photo search. Try again in a moment.";
        setError(msg);
        setPhase("error");
        return;
      }

      setResult(data);
      setPhase("done");
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      window.clearTimeout(shelvesTimer);
      setError(
        "Network hiccup — please try again, or type the medicine name in the search box.",
      );
      setPhase("error");
    }
  };

  const badges =
    result?.matches.reduce<Record<string, string>>((acc, m) => {
      acc[m.id] = m.matchLabel;
      return acc;
    }, {}) ?? {};

  const busy = phase === "reading" || phase === "shelves";

  return (
    <div className="mb-6">
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#0d6e5a]/25 bg-gradient-to-r from-[#e6f4ef] via-white to-[#fbf4dd] px-4 py-3 text-left shadow-sm transition hover:border-[#0d6e5a]/45 hover:shadow-md"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0d6e5a] text-white shadow-sm transition group-hover:scale-105">
            <Camera size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#0c1a14]">
              <Sparkles size={14} className="text-[#c9a227]" aria-hidden />
              Snap a pack — we’ll check our shelves
            </span>
            <span className="mt-0.5 block text-xs text-[#5a6b62]">
              Upload or take a photo of a medicine label. AI reads it, then we match real stock.
            </span>
          </span>
          <span className="hidden shrink-0 rounded-full bg-[#0d6e5a] px-3 py-1.5 text-xs font-semibold text-white sm:inline">
            Try photo search
          </span>
        </button>
      )}

      {open && (
        <div className="animate-fade-up overflow-hidden rounded-2xl border border-[#e3ebe6] bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[#e3ebe6] bg-gradient-to-r from-[#e6f4ef] to-white px-4 py-3 sm:px-5">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#0c1a14]">
                <Sparkles size={16} className="text-[#c9a227]" aria-hidden />
                Photo medicine search
              </p>
              <p className="mt-0.5 text-xs text-[#5a6b62]">
                Same catalogue cards as below — just found by looking at your pack.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="rounded-full p-1.5 text-[#5a6b62] transition hover:bg-[#e6f4ef] hover:text-[#0c1a14]"
              aria-label="Close photo search"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onFileChange}
            />
            <input
              ref={cameraRef}
              id={cameraId}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onFileChange}
            />

            {!previewUrl ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition ${
                  dragging
                    ? "border-[#0d6e5a] bg-[#e6f4ef]"
                    : "border-[#d5e3dc] bg-[#f8fbf9]"
                }`}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0d6e5a] shadow-sm">
                  <ImagePlus size={28} aria-hidden />
                </div>
                <p className="text-sm font-semibold text-[#0c1a14]">
                  Drop a pack photo here
                </p>
                <p className="mt-1 max-w-sm text-xs text-[#5a6b62]">
                  Front of box, blister, or bottle label works best. JPEG, PNG, or WebP · up to 5&nbsp;MB.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <label
                    htmlFor={inputId}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0d6e5a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#084c3f]"
                  >
                    <ImagePlus size={14} aria-hidden />
                    Choose photo
                  </label>
                  <label
                    htmlFor={cameraId}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#0d6e5a]/30 bg-white px-4 py-2 text-xs font-semibold text-[#0d6e5a] transition hover:bg-[#e6f4ef]"
                  >
                    <Camera size={14} aria-hidden />
                    Use camera
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-2xl border border-[#e3ebe6] bg-[#f4f7f4] sm:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img
                    src={previewUrl}
                    alt="Medicine pack preview"
                    className="h-full w-full object-cover"
                  />
                  {busy && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c1a14]/55 p-3 text-center">
                      <Loader2 className="mb-2 h-7 w-7 animate-spin text-white" />
                      <p className="text-[11px] font-medium leading-snug text-white">
                        {stageLine}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-center">
                  <p className="text-sm font-semibold text-[#0c1a14]">
                    {phase === "preview" && "Looking sharp — ready when you are"}
                    {phase === "reading" && stageLine}
                    {phase === "shelves" && stageLine}
                    {phase === "done" && "Here’s what we found on our shelves"}
                    {phase === "error" && "Let’s try a different angle"}
                  </p>
                  <p className="mt-1 text-xs text-[#5a6b62]">
                    {file?.name} ·{" "}
                    {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(phase === "preview" || phase === "error") && (
                      <button
                        type="button"
                        onClick={runSearch}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#084c3f] disabled:opacity-60"
                      >
                        <Sparkles size={14} aria-hidden />
                        Analyse &amp; match stock
                      </button>
                    )}
                    {phase === "done" && (
                      <button
                        type="button"
                        onClick={runSearch}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#0d6e5a]/30 bg-white px-4 py-2 text-xs font-semibold text-[#0d6e5a] transition hover:bg-[#e6f4ef]"
                      >
                        <RefreshCw size={14} aria-hidden />
                        Search again
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={reset}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#e3ebe6] bg-white px-4 py-2 text-xs font-semibold text-[#5a6b62] transition hover:bg-[#f4f7f4] disabled:opacity-60"
                    >
                      Clear photo
                    </button>
                    <label
                      htmlFor={inputId}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#e3ebe6] bg-white px-4 py-2 text-xs font-semibold text-[#5a6b62] transition hover:bg-[#f4f7f4] ${busy ? "pointer-events-none opacity-60" : ""}`}
                    >
                      Swap photo
                    </label>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                role="alert"
              >
                {error}
              </p>
            )}

            {result && phase === "done" && (
              <div ref={resultsRef} className="mt-6 animate-fade-up">
                <div className="mb-4 rounded-xl border border-[#0d6e5a]/15 bg-[#e6f4ef]/60 px-4 py-3">
                  <p className="text-sm leading-relaxed text-[#0c1a14]">
                    {result.summary}
                  </p>
                  {result.identified.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.identified.map((id, i) => (
                        <span
                          key={`${id.name}-${i}`}
                          className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#0d6e5a] shadow-sm"
                        >
                          {id.name}
                          {id.strength ? ` · ${id.strength}` : ""}
                          {id.confidence > 0
                            ? ` · ${Math.round(id.confidence * 100)}%`
                            : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {result.matches.length > 0 ? (
                  <>
                    <h3
                      className="mb-3 text-lg font-semibold text-[#0c1a14]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      Matches from your photo ({result.matches.length})
                    </h3>
                    <MedicineCatalogGrid items={result.matches} badges={badges} />
                  </>
                ) : (
                  <div className="rounded-2xl border border-[#e3ebe6] bg-[#f8fbf9] px-4 py-6 text-center">
                    <p className="text-sm font-medium text-[#0c1a14]">
                      No public catalogue match just yet
                    </p>
                    <p className="mt-1 text-xs text-[#5a6b62]">
                      That doesn’t always mean we don’t have it — some items stay behind the counter.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Link
                        href={contactHref}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#084c3f]"
                      >
                        Contact us
                      </Link>
                      <a
                        href={platform.whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#0d6e5a]/30 bg-white px-4 py-2 text-xs font-semibold text-[#0d6e5a] transition hover:bg-[#e6f4ef]"
                      >
                        <MessageCircle size={14} aria-hidden />
                        WhatsApp
                      </a>
                      <Link
                        href={refillHref}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#e3ebe6] bg-white px-4 py-2 text-xs font-semibold text-[#5a6b62] transition hover:bg-[#f4f7f4]"
                      >
                        Request a refill
                      </Link>
                    </div>
                  </div>
                )}

                {result.tips.length > 0 && (
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-[#5a6b62]">
                    {result.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
