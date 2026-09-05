"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toaster";
import {
  Copy, ClipboardPaste, Sparkles, AlertCircle, Check, ArrowLeft, ArrowRight, Pencil, Loader2,
} from "lucide-react";
import { MEDICATION_AI_PROMPT } from "@/app/lib/medication-ai-prompt";
import { PROMPT_VERSION, MedicationAiSchema, type MedicationAiInput } from "@/app/lib/medication-ai-schema";

type Step = "prompt" | "paste" | "review" | "saving";

export function AiImportFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("prompt");
  const [pasted, setPasted] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<MedicationAiInput | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    // Strip markdown fences if present.
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      setParseError(`Invalid JSON: ${e instanceof Error ? e.message : "parse failed"}. Make sure you pasted only the JSON the AI returned.`);
      return;
    }
    const result = MedicationAiSchema.safeParse(json);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      setParseError(`Schema validation failed: ${issues}`);
      return;
    }
    setParsed(result.data);
    setStep("review");
    toast.success("Parsed successfully. Review below.");
  }

  async function confirmCreate() {
    if (!parsed) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/medications/import/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.validation) {
          toast.error(`Validation: ${j.validation.checks?.filter((c: { severity: string }) => c.severity === "fail").map((c: { message: string }) => c.message).join(" ") || "failed"}`);
        } else {
          toast.error(j.message || j.error || "Could not create medication.");
        }
        return;
      }
      toast.success(`Created. Enrichment: ${j.enrichmentScore}% (${j.validation?.counts?.pass ?? 0} checks passed).`);
      router.push("/admin/medications");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Step indicator ── */}
      <div className="flex items-center gap-2 text-xs">
        {(["prompt", "paste", "review"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step === s || (step === "saving" && s === "review")
                ? "bg-[var(--admin-accent)] text-white"
                : "bg-[var(--admin-inset)] admin-muted"
            }`}>{i + 1}</span>
            <span className={step === s ? "admin-text font-semibold" : "admin-muted"}>
              {s === "prompt" ? "Copy prompt" : s === "paste" ? "Paste JSON" : "Review & save"}
            </span>
            {i < 2 && <ArrowRight className="h-3 w-3 admin-soft" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: prompt ── */}
      {step === "prompt" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold admin-text">Extraction prompt (v{PROMPT_VERSION})</p>
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent-soft)] px-3 py-1.5 text-xs font-semibold admin-accent-text hover:opacity-80"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Prompt
              </button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--admin-inset)] p-3 text-xs leading-relaxed admin-text whitespace-pre-wrap">{MEDICATION_AI_PROMPT}</pre>
          </div>

          <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4">
            <p className="mb-2 text-sm font-semibold admin-text">Photo guidance</p>
            <ul className="space-y-1 text-xs admin-muted list-disc list-inside">
              <li><strong>Front of pack</strong> — brand name, strength, dosage form.</li>
              <li><strong>Back of pack</strong> — manufacturer, barcode, storage.</li>
              <li><strong>Patient leaflet</strong> — indications, side effects, contraindications.</li>
            </ul>
            <p className="mt-2 text-xs admin-soft">
              Photos are processed entirely by your AI tool — they never touch our servers unless you upload them later as gallery images.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep("paste")}
            className="btn-admin w-full !rounded-xl py-2.5"
          >
            <ClipboardPaste className="h-4 w-4" /> I&apos;ve run the AI — paste response
          </button>
        </div>
      )}

      {/* ── Step 2: paste ── */}
      {step === "paste" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4">
            <label className="label-admin">Paste the AI&apos;s JSON response</label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={14}
              placeholder='{"name":"Panadol 500mg","genericName":"Paracetamol",...}'
              className="input-admin font-mono text-xs resize-y"
            />
            {parseError && (
              <div className="mt-2 admin-alert-error">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{parseError}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("prompt")}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-4 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={parse}
              disabled={!pasted.trim()}
              className="btn-admin flex-1 !rounded-xl py-2.5 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" /> Parse response
            </button>
          </div>

          <div className="text-center">
            <Link href="/admin/medications/new" className="text-xs admin-muted hover:underline">
              Fall back to Manual Entry →
            </Link>
          </div>
        </div>
      )}

      {/* ── Step 3: review ── */}
      {step === "review" && parsed && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4">
            <p className="mb-3 text-sm font-semibold admin-text">Parsed data — review before saving</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {Object.entries(parsed).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2 border-b border-[var(--admin-border-2)] py-1.5 text-xs">
                  <dt className="admin-muted">{k}</dt>
                  <dd className="admin-text text-right font-mono break-all">
                    {Array.isArray(v) ? v.join(", ") : v == null || v === false ? "—" : v === true ? "✓" : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs admin-text">
            On save, this runs through the shared Phase 4 validation layer (duplicate detection, barcode uniqueness, etc.). If validation flags issues, you&apos;ll see them before the final commit.
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("paste")}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-4 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit JSON
            </button>
            <button
              type="button"
              onClick={confirmCreate}
              disabled={submitting}
              className="btn-admin flex-1 !rounded-xl py-2.5 disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Check className="h-4 w-4" /> Confirm &amp; Create</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
