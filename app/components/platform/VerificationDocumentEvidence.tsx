"use client";

/* These private verification images require the reviewer browser session, so
 * they are loaded directly from the authenticated evidence endpoint. */
/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, FileImage, KeyRound, Loader2, ShieldCheck, X } from "lucide-react";
import { verifyStepUpAction, type MfaState } from "@/app/actions/mfa";

type Kind = "license" | "business";
type DocumentSource = "saved-dossier" | "uploaded-draft" | "unknown";
type LoadState =
  | { status: "loading" }
  | { status: "ready"; objectUrl: string; source: DocumentSource }
  | { status: "missing" }
  | { status: "reauth"; reason: string }
  | { status: "error"; message: string };

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

const initialMfaState: MfaState = {};

function sourceLabel(source: DocumentSource) {
  if (source === "uploaded-draft") return "Uploaded draft";
  if (source === "saved-dossier") return "Saved with dossier";
  return "Secure upload";
}

function StepUpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(verifyStepUpAction, initialMfaState);

  useEffect(() => {
    if (!state.success) return;
    // The server action has refreshed the session's MFA timestamp. Reloading the
    // current review route re-runs the secure image requests without losing place.
    window.location.reload();
  }, [state.success]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="document-step-up-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#111a17] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-teal-300/20 bg-teal-300/10 text-teal-200">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-200/65">Sensitive evidence</p>
              <h2 id="document-step-up-title" className="mt-1 text-lg font-semibold text-white">Verify identity to continue</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white disabled:opacity-40" aria-label="Close verification dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="space-y-4 px-5 py-5">
          <p className="text-sm leading-6 text-teal-50/70">
            Enter a fresh code from your authenticator app or one of your recovery codes. After verification, this pharmacy review reloads automatically and the private documents appear here.
          </p>
          <label className="block text-sm font-semibold text-white">
            Authenticator or recovery code
            <input
              name="code"
              autoComplete="one-time-code"
              required
              pattern="[0-9a-fA-F ]{6,12}"
              maxLength={12}
              autoFocus
              placeholder="Enter code"
              className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 text-base text-white outline-none transition placeholder:text-white/30 focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/10"
            />
          </label>

          {state.error ? (
            <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-100">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-100">
              Verified. Reloading the document review…
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/5 disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={pending || Boolean(state.success)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-teal-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {pending ? "Verifying…" : "Verify and show documents"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EvidenceCard({
  pharmacyId,
  kind,
  title,
  description,
  onRequestVerification,
}: {
  pharmacyId: string;
  kind: Kind;
  title: string;
  description: string;
  onRequestVerification: () => void;
}) {
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
          if (!active) return;
          if (response.status === 404) {
            setState({ status: "missing" });
            return;
          }

          let payload: { error?: string; message?: string } = {};
          try {
            payload = (await response.json()) as { error?: string; message?: string };
          } catch {
            // Non-JSON errors still fall back to the status-specific message below.
          }

          const authReason = payload.error || "";
          if (
            response.status === 401 ||
            authReason === "MFA_REQUIRED" ||
            authReason === "STEP_UP_REQUIRED"
          ) {
            setState({ status: "reauth", reason: authReason || "STEP_UP_REQUIRED" });
            return;
          }

          // The existing endpoint historically returned 403 for an expired
          // step-up timestamp. Give the reviewer the safe re-verification path.
          if (response.status === 403 && !payload.message) {
            setState({ status: "reauth", reason: "STEP_UP_REQUIRED" });
            return;
          }

          setState({
            status: "error",
            message: payload.message || "The secure document could not be opened.",
          });
          return;
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        const rawSource = response.headers.get("X-Verification-Document-Source");
        const source: DocumentSource = rawSource === "saved-dossier" || rawSource === "uploaded-draft" ? rawSource : "unknown";
        if (active) setState({ status: "ready", objectUrl, source });
      } catch {
        if (active) {
          setState({
            status: "error",
            message: "The document request failed. Check your connection and try again.",
          });
        }
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

      {state.status === "reauth" ? (
        <div className="flex min-h-56 flex-col items-center justify-center bg-amber-50/45 px-5 py-8 text-center dark:bg-amber-400/[0.035] sm:min-h-72">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700 shadow-sm dark:border-amber-400/25 dark:bg-white/5 dark:text-amber-200">
            <KeyRound className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-amber-950 dark:text-amber-100">Verify identity to view document</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-amber-900/70 dark:text-amber-100/65">
            Your secure-review window expired. Re-verify here and this exact review page will reload automatically.
          </p>
          <button
            type="button"
            onClick={onRequestVerification}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200"
          >
            <KeyRound className="h-4 w-4" /> Verify identity
          </button>
          <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-amber-800/50 dark:text-amber-100/40">Sensitive evidence · fresh verification required</p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
          <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-300" />
          <p className="mt-2 text-sm font-semibold text-rose-900 dark:text-rose-100">Document could not be opened</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-rose-800/75 dark:text-rose-100/65">{state.message}</p>
        </div>
      ) : null}
    </article>
  );
}

export default function VerificationDocumentEvidence({ pharmacyId }: { pharmacyId: string }) {
  const [stepUpOpen, setStepUpOpen] = useState(false);

  return (
    <>
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
            <EvidenceCard
              key={document.kind}
              pharmacyId={pharmacyId}
              onRequestVerification={() => setStepUpOpen(true)}
              {...document}
            />
          ))}
        </div>
      </section>
      <StepUpDialog open={stepUpOpen} onClose={() => setStepUpOpen(false)} />
    </>
  );
}
