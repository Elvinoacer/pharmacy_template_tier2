"use client";

/* These private verification images require the reviewer browser session, so
 * they are loaded directly from the authenticated evidence endpoint. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, FileImage, Loader2, ShieldCheck } from "lucide-react";

type Kind = "license" | "business";
type DocumentSource = "saved-dossier" | "uploaded-draft" | "unknown";
type LoadState =
  | { status: "loading" }
  | { status: "ready"; objectUrl: string; source: DocumentSource }
  | { status: "missing" }
  | { status: "error" };

const documents: Array<{ kind: Kind; title: string; description: string }> = [
  {
    kind: "license",
    title: "PPB premises licence",
    description: "The actual premises-licence image uploaded during onboarding.",
  },
  {
    kind: "business",
    title: "Business registration evidence",
    description: "The actual business-registration image uploaded during onboarding.",
  },
];

function sourceLabel(source: DocumentSource) {
  if (source === "uploaded-draft") return "Uploaded draft";
  if (source === "saved-dossier") return "Saved with dossier";
  return "Secure upload";
}

function EvidenceCard({ pharmacyId, kind, title, description }: { pharmacyId: string; kind: Kind; title: string; description: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const endpoint = `/api/platform/verification-documents?pharmacyId=${encodeURIComponent(pharmacyId)}&kind=${kind}`;

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          if (active) setState({ status: response.status === 404 ? "missing" : "error" });
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        const rawSource = response.headers.get("X-Verification-Document-Source");
        const source: DocumentSource = rawSource === "saved-dossier" || rawSource === "uploaded-draft" ? rawSource : "unknown";
        if (active) setState({ status: "ready", objectUrl, source });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [endpoint]);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#dce7e1] bg-white dark:border-white/10 dark:bg-white/[0.025]">
      <div className="flex items-start justify-between gap-3 border-b border-[#e7eee9] px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#203029] dark:text-white">{title}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#718078] dark:text-teal-100/50">{description}</p>
        </div>
        {state.status === "ready" ? (
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${state.source === "uploaded-draft" ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"}`}>
            {sourceLabel(state.source)}
          </span>
        ) : null}
      </div>

      {state.status === "loading" ? (
        <div className="flex h-56 items-center justify-center gap-2 bg-[#f6f9f7] text-xs font-medium text-[#718078] dark:bg-black/15 dark:text-teal-100/50 sm:h-72">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading secure image…
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <a href={endpoint} target="_blank" rel="noopener noreferrer" className="group block bg-[#f4f7f5] dark:bg-black/20" title={`Open full ${title}`}>
            <img
              src={state.objectUrl}
              alt={title}
              className="mx-auto max-h-[34rem] min-h-56 w-full object-contain transition duration-200 group-hover:scale-[1.01] sm:min-h-72"
            />
          </a>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e7eee9] px-4 py-3 dark:border-white/10">
            <p className="text-[11px] leading-4 text-[#718078] dark:text-teal-100/50">
              {state.source === "uploaded-draft"
                ? "This upload exists securely, but the owner has not yet committed it into the saved verification dossier."
                : "Loaded from the pharmacy's saved verification dossier."}
            </p>
            <a href={endpoint} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg text-xs font-semibold text-teal-700 hover:underline dark:text-teal-200">
              Open full image <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </>
      ) : null}

      {state.status === "missing" ? (
        <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
          <FileImage className="h-6 w-6 text-[#a0aaa4] dark:text-teal-100/30" />
          <p className="mt-2 text-sm font-semibold text-[#56665d] dark:text-teal-50/75">No uploaded image found</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-[#839087] dark:text-teal-100/45">Neither a saved dossier image nor a recoverable onboarding upload is available for this document.</p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-300" />
          <p className="mt-2 text-sm font-semibold text-amber-900 dark:text-amber-100">Image could not be opened</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-amber-800/75 dark:text-amber-100/65">Your platform session may need step-up verification, or the private object may no longer be readable.</p>
        </div>
      ) : null}
    </article>
  );
}

export default function VerificationDocumentEvidence({ pharmacyId }: { pharmacyId: string }) {
  return (
    <section className="rounded-2xl border border-teal-200/80 bg-teal-50/35 p-3.5 dark:border-teal-300/15 dark:bg-teal-300/[0.035] sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-white text-teal-700 dark:border-teal-300/20 dark:bg-white/5 dark:text-teal-200">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-700 dark:text-teal-200/70">Private onboarding evidence</p>
          <h3 className="mt-1 text-base font-semibold text-[#17231d] dark:text-white">Review the actual uploaded images</h3>
          <p className="mt-1 text-xs leading-5 text-[#65736b] dark:text-teal-100/55">These are the secure files uploaded by the pharmacy during onboarding. Compare them directly with the submitted licence, business and identity details before marking verification checks complete.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {documents.map((document) => (
          <EvidenceCard key={document.kind} pharmacyId={pharmacyId} {...document} />
        ))}
      </div>
    </section>
  );
}
