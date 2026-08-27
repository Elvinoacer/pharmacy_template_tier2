"use client";

import { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Pill,
  Lock,
  ArrowRight,
  Utensils,
  Sun,
  Snowflake,
  Clock,
  Baby,
  HeartCrack,
} from "lucide-react";
import type {
  ClinicalSafetyReport,
  GenericAlternativeItem,
} from "@/app/lib/services/clinical-safety";

export function ClinicalSafetyAlert({
  report,
  loading,
  onSelectAlternative,
}: {
  report: ClinicalSafetyReport | null;
  loading?: boolean;
  onSelectAlternative?: (alt: GenericAlternativeItem) => void;
}) {
  const [expandedInteractions, setExpandedInteractions] = useState(true);
  const [expandedAlternatives, setExpandedAlternatives] = useState(true);
  const [expandedInstructions, setExpandedInstructions] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-3 text-xs admin-soft">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-t-transparent" />
        <span>Screening clinical safety, drug interactions & duplicate therapy…</span>
      </div>
    );
  }

  if (!report) return null;

  const {
    overallSafety,
    interactions,
    duplicates,
    dosageAlert,
    contraindications,
    controlledDrug,
    genericAlternatives,
    medicationInfo,
  } = report;

  const hasIssues =
    interactions.length > 0 ||
    duplicates.length > 0 ||
    contraindications.length > 0 ||
    controlledDrug.isControlled ||
    dosageAlert.severity !== "pass";

  return (
    <div className="space-y-3">
      {/* ── Overall Status Banner ── */}
      {overallSafety === "blocked" && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-900">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-bold text-rose-700">Clinical Safety Warning: Hard Contraindication Detected</p>
              <p className="mt-1 text-rose-800/90">
                A critical drug interaction or strict patient contraindication was identified. Dispensing without clinical modification or doctor consultation is high risk.
              </p>
            </div>
          </div>
        </div>
      )}

      {overallSafety === "warning" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="font-bold text-amber-800">Clinical Caution: Duplicate Therapy or Severe Interaction</p>
              <p className="mt-1 text-amber-800/90">
                Potential duplicate therapy or significant drug interaction detected. Verify patient history and active prescriptions.
              </p>
            </div>
          </div>
        </div>
      )}

      {overallSafety === "safe" && !hasIssues && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Clinical safety screen passed: No known interactions or duplicate therapies found.</span>
          </div>
        </div>
      )}

      {/* ── Controlled Substance Compliance ── */}
      {controlledDrug.isControlled && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-900">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-800">Controlled Substance:</span>
                <span className="rounded-full bg-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                  {controlledDrug.schedule?.toUpperCase().replace("_", " ") || "DDA REGULATED"}
                </span>
              </div>
              <p className="mt-1 text-purple-800/90">{controlledDrug.notes}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-purple-900">
                <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5">
                  ✓ Valid Prescriber License Req.
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5">
                  ✓ Patient National ID Req.
                </span>
                <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5">
                  ✓ Controlled Drugs Register Entry
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate Therapy Alerts ── */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-50/80 p-3 text-xs text-amber-950">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Duplicate Therapy Alert ({duplicates.length})</span>
          </div>
          <div className="mt-2 space-y-2">
            {duplicates.map((dup, idx) => (
              <div key={idx} className="rounded-lg border border-amber-200 bg-white/80 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{dup.medicineName}</span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    {dup.status} · {dup.prescribedDate}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-amber-900">{dup.message}</p>
                {dup.dosage && <p className="mt-0.5 text-[10px] text-slate-600">Current Dosage: {dup.dosage}</p>}
                {dup.prescriber && <p className="text-[10px] text-slate-600">Prescriber: {dup.prescriber}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Drug-Drug Interaction Alerts ── */}
      {interactions.length > 0 && (
        <div className="rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-3 text-xs">
          <button
            type="button"
            onClick={() => setExpandedInteractions(!expandedInteractions)}
            className="flex w-full items-center justify-between font-bold admin-text"
          >
            <div className="flex items-center gap-1.5">
              <HeartCrack className="h-3.5 w-3.5 text-rose-500" />
              <span>Drug-Drug Interactions ({interactions.length})</span>
            </div>
            {expandedInteractions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expandedInteractions && (
            <div className="mt-2.5 space-y-2">
              {interactions.map((inter, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-2.5 ${
                    inter.severity === "contraindicated"
                      ? "border-rose-300 bg-rose-50/80 text-rose-950"
                      : inter.severity === "severe"
                        ? "border-amber-300 bg-amber-50/80 text-amber-950"
                        : "border-slate-200 bg-white/80 text-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">
                      {inter.drugA} ↔ {inter.drugB}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        inter.severity === "contraindicated"
                          ? "bg-rose-600 text-white"
                          : inter.severity === "severe"
                            ? "bg-amber-600 text-white"
                            : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {inter.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium">{inter.description}</p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    <strong>Effect:</strong> {inter.clinicalEffect}
                  </p>
                  <p className="mt-0.5 text-[10px] text-emerald-800">
                    <strong>Management:</strong> {inter.management}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Patient Contraindications (Pregnancy, Pediatric, Geriatric) ── */}
      {contraindications.length > 0 && (
        <div className="space-y-2">
          {contraindications.map((contra, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-3 text-xs ${
                contra.severity === "fail"
                  ? "border-rose-400/40 bg-rose-50/80 text-rose-950"
                  : "border-amber-400/40 bg-amber-50/80 text-amber-950"
              }`}
            >
              <div className="flex items-start gap-2">
                {contra.type === "pediatric" ? (
                  <Baby className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                )}
                <div>
                  <p className="font-bold">{contra.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{contra.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── In-Stock Generic Alternatives (1-Click Switch & Cost Savings) ── */}
      {genericAlternatives.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-3 text-xs">
          <button
            type="button"
            onClick={() => setExpandedAlternatives(!expandedAlternatives)}
            className="flex w-full items-center justify-between font-bold text-emerald-900"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>In-Stock Generic & Bioequivalent Alternatives ({genericAlternatives.length})</span>
            </div>
            {expandedAlternatives ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expandedAlternatives && (
            <div className="mt-2.5 space-y-2">
              <p className="text-[11px] text-emerald-800">
                Equivalent generic options available in stock with lower cost to patient:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {genericAlternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className="flex flex-col justify-between rounded-lg border border-emerald-200 bg-white p-2.5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-slate-900">{alt.name}</span>
                        {alt.savingsPercent > 0 && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            Save {alt.savingsPercent}%
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {alt.genericName} {alt.strengthDisplay ? `· ${alt.strengthDisplay}` : ""} {alt.dosageForm ? `· ${alt.dosageForm}` : ""}
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        KES {alt.price.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">({alt.stockQty} in stock)</span>
                      </p>
                    </div>

                    {onSelectAlternative && (
                      <button
                        type="button"
                        onClick={() => onSelectAlternative(alt)}
                        className="mt-2 inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-700"
                      >
                        <span>Substitute with Generic</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Medication Instructions & Administration Accordion ── */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 text-xs">
        <button
          type="button"
          onClick={() => setExpandedInstructions(!expandedInstructions)}
          className="flex w-full items-center justify-between font-semibold admin-text"
        >
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 admin-accent-text" />
            <span>Medication Instructions & Counselling Guidelines</span>
          </div>
          {expandedInstructions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expandedInstructions && (
          <div className="mt-2.5 space-y-2 border-t border-[var(--admin-border-2)] pt-2 admin-soft">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-1.5 rounded-lg bg-[var(--admin-inset)] p-2">
                <Utensils className="mt-0.5 h-3.5 w-3.5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold admin-text">Food Condition:</span>
                  <p className="mt-0.5 text-[11px]">{dosageAlert.foodInstructions}</p>
                </div>
              </div>
              <div className="flex items-start gap-1.5 rounded-lg bg-[var(--admin-inset)] p-2">
                <Snowflake className="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold admin-text">Storage Instructions:</span>
                  <p className="mt-0.5 text-[11px]">{dosageAlert.storageInstructions}</p>
                </div>
              </div>
            </div>

            {dosageAlert.auxiliaryWarnings.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-900">
                <span className="font-bold">Auxiliary Labels / Warnings:</span>
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px]">
                  {dosageAlert.auxiliaryWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
