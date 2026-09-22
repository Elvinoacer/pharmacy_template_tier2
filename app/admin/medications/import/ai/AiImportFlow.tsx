"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toaster";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardPaste,
  Copy,
  FileJson2,
  Loader2,
  Pencil,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MEDICATION_AI_PROMPT } from "@/app/lib/medication-ai-prompt";
import { PROMPT_VERSION, MedicationAiSchema, type MedicationAiInput } from "@/app/lib/medication-ai-schema";

type Step = "prompt" | "paste" | "review" | "saving";

const STEPS = [
  { key: "prompt", label: "Prompt", detail: "Copy extraction instructions" },
  { key: "paste", label: "JSON", detail: "Paste the AI response" },
  { key: "review", label: "Review", detail: "Validate and save" },
] as const;

export function AiImportFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("prompt");
  const [pasted, setPasted] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<MedicationAiInput | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeIndex = step === "saving" ? 2 : STEPS.findIndex((item) => item.key === step);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(MEDICATION_AI_PROMPT);
      toast.success("Prompt copied to clipboard.");
    } catch {
      toast.error("Could not copy. Select the prompt text manually and copy.");
    }
  }

  function parse() {
    setParseError(null);
    let text = pasted.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      setParseError(
        `Invalid JSON: ${error instanceof Error ? error.message : "parse failed"}. Make sure you pasted only the JSON the AI returned.`,
      );
      return;
    }

    const result = MedicationAiSchema.safeParse(json);
    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      setParseError(`Schema validation failed: ${issues}`);
      return;
    }

    setParsed(result.data);
    setStep("review");
    toast.success("Parsed successfully. Review the medicine details below.");
  }

  async function confirmCreate() {
    if (!parsed) return;
    setSubmitting(true);
    setStep("saving");

    try {
      const response = await fetch("/api/admin/medications/import/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload.validation) {
          toast.error(
            `Validation: ${
              payload.validation.checks
                ?.filter((check: { severity: string }) => check.severity === "fail")
                .map((check: { message: string }) => check.message)
                .join(" ") || "failed"
            }`,
          );
        } else {
          toast.error(payload.message || payload.error || "Could not create medication.");
        }
        setStep("review");
        return;
      }

      toast.success(
        `Created. Enrichment: ${payload.enrichmentScore}% (${payload.validation?.counts?.pass ?? 0} checks passed).`,
      );
      router.push("/admin/medications");
    } catch {
      toast.error("Network error. Try again.");
      setStep("review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <nav aria-label="AI import progress" className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-2 sm:p-3">
        <ol className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {STEPS.map((item, index) => {
            const current = index === activeIndex;
            const complete = index < activeIndex;
            return (
              <li
                key={item.key}
                aria-current={current ? "step" : undefined}
                className={`min-w-0 rounded-xl px-2 py-2.5 transition sm:px-3 ${
                  current
                    ? "bg-[var(--admin-accent-soft)] ring-1 ring-inset ring-[var(--admin-border-2)]"
                    : complete
                      ? "bg-emerald-500/[0.06]"
                      : "bg-[var(--admin-inset)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      current
                        ? "bg-[var(--admin-accent)] text-white"
                        : complete
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-[var(--admin-card)] admin-muted"
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className={`break-words text-sm font-semibold sm:text-sm ${current ? "admin-text" : "admin-muted"}`}>{item.label}</span>
                </div>
                <p className="mt-1.5 hidden text-sm leading-4 admin-soft sm:block">{item.detail}</p>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === "prompt" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3.5 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold admin-text">Extraction prompt</p>
                <p className="mt-0.5 text-sm admin-muted">Version {PROMPT_VERSION} · optimized for medicine pack extraction</p>
              </div>
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--admin-accent-soft)] px-4 text-sm font-semibold admin-accent-text transition hover:opacity-80 sm:w-auto sm:rounded-full sm:py-2"
              >
                <Copy className="h-3.5 w-3.5" /> Copy prompt
              </button>
            </div>
            <pre className="mt-3 max-h-[18rem] overflow-auto rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-3 text-sm leading-5 admin-text whitespace-pre-wrap sm:max-h-80 sm:p-4 sm:text-sm">
              {MEDICATION_AI_PROMPT}
            </pre>
          </section>

          <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3.5 sm:p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 admin-accent-text" />
              <p className="text-sm font-semibold admin-text">Capture the right evidence</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ["Front of pack", "Brand, strength and dosage form"],
                ["Back of pack", "Manufacturer, barcode and storage"],
                ["Patient leaflet", "Indications, cautions and side effects"],
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl bg-[var(--admin-inset)] p-3">
                  <p className="text-sm font-semibold admin-text">{title}</p>
                  <p className="mt-1 text-sm leading-4 admin-muted">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => setStep("paste")}
            className="btn-admin min-h-12 w-full !rounded-xl justify-center text-sm"
          >
            <ClipboardPaste className="h-4 w-4" /> I have the AI response
          </button>
        </div>
      )}

      {step === "paste" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3.5 sm:p-5">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-inset)] admin-accent-text">
                <FileJson2 className="h-4 w-4" />
              </div>
              <div>
                <label htmlFor="ai-medication-json" className="text-sm font-semibold admin-text">Paste the AI&apos;s JSON response</label>
                <p className="mt-0.5 text-sm leading-4 admin-muted">Markdown code fences are okay; the parser strips them automatically.</p>
              </div>
            </div>
            <textarea
              id="ai-medication-json"
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              rows={14}
              spellCheck={false}
              placeholder='{"name":"Panadol 500mg","genericName":"Paracetamol",...}'
              className="input-admin min-h-64 resize-y font-mono text-base leading-6 sm:text-sm sm:leading-5"
            />
            {parseError && (
              <div className="admin-alert-error mt-3 items-start">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">{parseError}</span>
              </div>
            )}
          </section>

          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <button
              type="button"
              onClick={() => setStep("prompt")}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-4 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] sm:rounded-full"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to prompt
            </button>
            <button
              type="button"
              onClick={parse}
              disabled={!pasted.trim()}
              className="btn-admin min-h-11 w-full !rounded-xl justify-center disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> Parse and review
            </button>
          </div>

          <p className="text-center text-sm admin-muted">
            Prefer a form?{" "}
            <Link href="/admin/medications/new" className="font-semibold admin-accent-text hover:underline">Use manual entry</Link>
          </p>
        </div>
      )}

      {(step === "review" || step === "saving") && parsed && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3.5 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold admin-text">Parsed medicine data</p>
                <p className="mt-0.5 text-sm admin-muted">Review high-impact fields before creating the record.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Schema valid</span>
            </div>
            <dl className="grid gap-2 lg:grid-cols-2">
              {Object.entries(parsed).map(([key, value]) => (
                <div key={key} className="min-w-0 rounded-xl bg-[var(--admin-inset)] p-3">
                  <dt className="text-sm font-semibold uppercase tracking-wide admin-soft">{key}</dt>
                  <dd className="mt-1 break-words text-sm leading-5 admin-text">
                    {Array.isArray(value)
                      ? value.join(", ") || "—"
                      : value == null || value === false
                        ? "—"
                        : value === true
                          ? "Yes"
                          : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-sm leading-5 text-amber-800 dark:text-amber-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Saving runs duplicate and barcode checks through the shared validation layer. Failed checks stop the create operation.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <button
              type="button"
              onClick={() => setStep("paste")}
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-4 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] disabled:opacity-50 sm:rounded-full"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit JSON
            </button>
            <button
              type="button"
              onClick={confirmCreate}
              disabled={submitting}
              className="btn-admin min-h-11 w-full !rounded-xl justify-center disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating medicine…</>
              ) : (
                <><Check className="h-4 w-4" /> Confirm and create</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
