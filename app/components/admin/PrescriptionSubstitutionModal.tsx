"use client";

import { useEffect, useState } from "react";
import {
  X,
  RefreshCw,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import type { GenericAlternativeItem } from "@/app/lib/services/clinical-safety";

const COMMON_REASONS = [
  "Patient requested lower-cost bioequivalent generic",
  "Prescribed brand out of stock — bioequivalent generic substituted",
  "Generic substitution per Pharmacy and Poisons Board practice guidelines",
  "Physician consulted and approved generic switch",
];

export function PrescriptionSubstitutionModal({
  prescriptionId,
  currentMedicineName,
  currentMedicationId,
  isOpen,
  onClose,
  onSuccess,
}: {
  prescriptionId: string;
  currentMedicineName: string;
  currentMedicationId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [alternatives, setAlternatives] = useState<GenericAlternativeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAltId, setSelectedAltId] = useState("");
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch("/api/admin/clinical-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicationId: currentMedicationId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.report?.genericAlternatives) {
          setAlternatives(data.report.genericAlternatives);
          if (data.report.genericAlternatives.length > 0) {
            setSelectedAltId(data.report.genericAlternatives[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, currentMedicationId]);

  // Handle ESC key to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const finalReason = reason === "custom" ? customReason.trim() : reason;

  async function handleSubstitute(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAltId) {
      toast.error("Please select a replacement medication.");
      return;
    }
    if (!finalReason) {
      toast.error("Clinical substitution reason is required for regulatory records.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/prescriptions/substitute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          newMedicationId: selectedAltId,
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Prescription substituted successfully.");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to substitute prescription.");
      }
    } catch {
      toast.error("Error performing substitution.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAlt = alternatives.find((a) => a.id === selectedAltId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4 bg-[var(--admin-card-2)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold admin-text">Pharmacist Generic Substitution</h2>
              <p className="text-[11px] admin-soft">
                Replace prescribed brand with in-stock bioequivalent generic
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[var(--admin-hover)] hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubstitute} className="p-5 space-y-4">
          {/* Currently Prescribed Card */}
          <div className="rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-3 text-xs">
            <span className="font-bold text-[10px] uppercase tracking-wider admin-muted">Currently Prescribed Medicine</span>
            <p className="text-sm font-black admin-text mt-0.5">{currentMedicineName}</p>
          </div>

          {/* Generic Alternatives Selector */}
          <div>
            <label className="label-admin text-xs font-bold mb-1.5 block">
              Select In-Stock Generic / Bioequivalent Medication *
            </label>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs admin-soft">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-t-transparent" />
                <span>Searching catalogue for bioequivalent generics…</span>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                No automatic in-stock generic equivalents found with matching generic name. You can edit the prescription to choose any other catalogue item manually.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto scroll-admin pr-1">
                {alternatives.map((alt) => (
                  <label
                    key={alt.id}
                    className={`flex cursor-pointer items-start justify-between rounded-xl border p-3 text-xs transition ${
                      selectedAltId === alt.id
                        ? "border-emerald-500 bg-emerald-50/60 shadow-xs dark:bg-emerald-950/20"
                        : "border-[var(--admin-border)] hover:bg-[var(--admin-hover)]"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="alternative"
                        value={alt.id}
                        checked={selectedAltId === alt.id}
                        onChange={() => setSelectedAltId(alt.id)}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{alt.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {alt.genericName} {alt.strengthDisplay ? `· ${alt.strengthDisplay}` : ""}{" "}
                          {alt.dosageForm ? `· ${alt.dosageForm}` : ""}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          ✓ {alt.stockQty} in stock (Immediate handoff)
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 dark:text-slate-100">KES {alt.price.toLocaleString()}</p>
                      {alt.savingsPercent > 0 && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <TrendingDown className="h-2.5 w-2.5" />
                          Save {alt.savingsPercent}%
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Quick Justification Pills */}
          <div>
            <label className="label-admin text-xs font-bold mb-1.5 block">
              Clinical Justification / Regulatory Reason *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition text-left ${
                    reason === r
                      ? "bg-emerald-700 text-white shadow-2xs"
                      : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-hover)]"
                  }`}
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setReason("custom")}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                  reason === "custom"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-hover)]"
                }`}
              >
                Other (Custom)…
              </button>
            </div>

            {reason === "custom" && (
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific clinical justification for this generic switch…"
                className="input-admin text-xs resize-y"
                required
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <button type="button" onClick={onClose} className="btn-admin-secondary text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedAltId || (!finalReason && reason === "custom")}
              className="btn-admin-primary inline-flex items-center gap-1.5 text-xs font-bold px-4 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{submitting ? "Applying Substitution…" : "Confirm Generic Substitution"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
