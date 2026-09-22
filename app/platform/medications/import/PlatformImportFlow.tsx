"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  HelpCircle,
  Info,
  Loader2,
  PackagePlus,
  Pill,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import type {
  ImportPreviewResult,
  ImportExecutionResult,
} from "@/app/lib/services/platform-csv-importer";

const SAMPLE_CSV = `name,generic_name,brand_name,strength_display,dosage_form,route,pack_size,barcode,category,manufacturer,active_ingredients,controlled_drug,controlled_drug_schedule,indications,description
Amoxicillin 500mg,Amoxicillin,Amoxil,500 mg,Capsule,Oral,20 capsules,6164000123456,antibiotics,Cosmos Limited,Amoxicillin|500|mg,false,,Bacterial infections,Broad-spectrum penicillin antibiotic for bacterial infections.
Panadol Extra,Paracetamol,Panadol,500 mg + 65 mg,Tablet,Oral,100 tablets,6164000789012,pain-relief,GlaxoSmithKline,Paracetamol|500|mg;Caffeine|65|mg,false,,Mild to moderate pain,Fast pain relief tablets with caffeine.
Codeine Phosphate 30mg,Codeine Phosphate,,30 mg,Tablet,Oral,28 tablets,6164000999999,pain-relief,Regal Pharmaceuticals,Codeine|30|mg,true,Schedule 3,Severe pain,Opioid analgesic for moderate to severe pain.`;

export function PlatformImportFlow() {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [filename, setFilename] = useState("medications.csv");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);
  const [transactional, setTransactional] = useState(false);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setPreview(null);
      setResult(null);
    };
    reader.readAsText(file);
  }

  function handleLoadSample() {
    setCsvText(SAMPLE_CSV);
    setFilename("sample_canonical_medications.csv");
    setPreview(null);
    setResult(null);
  }

  async function handleAnalyze() {
    if (!csvText.trim()) {
      toast.error("Please select or paste CSV content first.");
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await fetch("/api/platform/medications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          csvContent: csvText,
          filename,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to analyze CSV.");
      }

      const data = await res.json();
      setPreview(data.preview);
      toast.success("CSV analyzed successfully. Review the preview below.");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse CSV.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleExecuteImport() {
    if (!csvText.trim()) return;

    setExecuting(true);
    try {
      const res = await fetch("/api/platform/medications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          csvContent: csvText,
          filename,
          transactional,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Import execution failed.");
      }

      const data = await res.json();
      setResult(data.result);
      toast.success(`Import complete! Batch ID: ${data.result.batchId}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Import execution failed.");
    } finally {
      setExecuting(false);
    }
  }

  function downloadErrorReport() {
    if (!preview || preview.errors.length === 0) return;

    const headers = ["row_number", "column", "error_code", "message", "rejected_value"];
    const rows = preview.errors.map((e) => [
      String(e.rowNumber),
      e.column,
      e.code,
      `"${e.message.replace(/"/g, '""')}"`,
      `"${(e.value || "").replace(/"/g, '""')}"`,
    ]);

    const csvData = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Informational Callout */}
      <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.07] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Pill className="h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-100">
              Platform Shared Library Importer (Canonical Only)
            </h4>
            <p className="mt-1 text-xs leading-5 text-teal-800/80 dark:text-teal-200/80">
              This importer exclusively writes to <span className="font-semibold">MedicationMaster</span>, Lookups, Manufacturers, and Active Ingredients.
              It will <span className="font-bold underline">NEVER</span> create <span className="font-semibold">PharmacyInventory</span> records, assign prices, stock, or make medications public. Individual pharmacies must explicitly adopt medicines from the shared library.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Box */}
      {!result && (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-shadow)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base font-semibold text-[var(--admin-text)]">1. Upload or Paste CSV</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Load Sample CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--admin-text)] mb-1">
                Choose CSV File
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-[var(--admin-text-muted)] file:mr-3 file:rounded-xl file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:brightness-105"
              />
              <p className="mt-2 text-[11px] text-[var(--admin-text-soft)]">
                Supports RFC 4180 with UTF-8, quotes, and commas. Max {5000} rows per import batch.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--admin-text)] mb-1">
                Or Paste Raw CSV Data
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setPreview(null);
                  setResult(null);
                }}
                placeholder="name,generic_name,strength_display,dosage_form..."
                className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-2.5 font-mono text-xs text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              disabled={!csvText.trim() || loadingPreview}
              onClick={handleAnalyze}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing file...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Validate & Analyze Duplicates
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview Results */}
      {preview && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-shadow)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--admin-text)]">2. Dry-Run Preview & Analysis</h3>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Simulated validation and duplicate matching. No database records have been created yet.
                </p>
              </div>

              {preview.errors.length > 0 && (
                <button
                  type="button"
                  onClick={downloadErrorReport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                >
                  <Download className="h-3.5 w-3.5" /> Download Error Report ({preview.errors.length})
                </button>
              )}
            </div>

            {/* Preview Stat Counters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-3">
                <span className="text-[10px] font-semibold uppercase text-[var(--admin-text-soft)]">Total Rows</span>
                <p className="mt-1 text-xl font-bold text-[var(--admin-text)]">{preview.totalRows}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Valid Rows</span>
                <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">{preview.validRows}</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <span className="text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-400">Invalid Rows</span>
                <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-400">{preview.invalidRows}</p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                <span className="text-[10px] font-semibold uppercase text-blue-700 dark:text-blue-400">Exact Matches</span>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">{preview.exactMatches}</p>
              </div>
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
                <span className="text-[10px] font-semibold uppercase text-teal-700 dark:text-teal-400">New Masters</span>
                <p className="mt-1 text-xl font-bold text-teal-700 dark:text-teal-400">{preview.newMasters}</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <span className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">Needs Review</span>
                <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">{preview.needsReview}</p>
              </div>
            </div>

            {/* Error Table if any */}
            {preview.errors.length > 0 && (
              <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    {preview.errors.length} validation issues found:
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-rose-500/20 text-rose-800/80 dark:text-rose-200/80">
                        <th className="py-1.5 px-2">Row</th>
                        <th className="py-1.5 px-2">Column</th>
                        <th className="py-1.5 px-2">Reason</th>
                        <th className="py-1.5 px-2">Rejected Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-500/10">
                      {preview.errors.slice(0, 20).map((err, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-2 font-mono font-semibold text-rose-900 dark:text-rose-200">
                            {err.rowNumber}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-[11px]">{err.column}</td>
                          <td className="py-1.5 px-2 text-rose-800 dark:text-rose-300">{err.message}</td>
                          <td className="py-1.5 px-2 font-mono text-[11px] text-[var(--admin-text-soft)] truncate max-w-xs">
                            {err.value || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.errors.length > 20 && (
                    <p className="mt-2 text-[11px] text-rose-600 italic">
                      + {preview.errors.length - 20} more errors. Download error report for full list.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Sample Valid Rows Preview */}
            {preview.analyzedRows.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--admin-text)]">
                  Row-by-Row Analysis Sample (First 15 valid rows)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--admin-panel)] text-[var(--admin-text-soft)]">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Medicine & Brand</th>
                        <th className="py-2 px-3">Generic & Strength</th>
                        <th className="py-2 px-3">Dosage Form</th>
                        <th className="py-2 px-3">Planned Action</th>
                        <th className="py-2 px-3">Match Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--admin-border)]">
                      {preview.analyzedRows.slice(0, 15).map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-[var(--admin-hover)]">
                          <td className="py-2 px-3 font-mono font-medium">{row.rowNumber}</td>
                          <td className="py-2 px-3 font-semibold text-[var(--admin-text)]">
                            <div className="flex min-w-[180px] items-center gap-2.5">
                              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)]">
                                {row.data.imageUrl ? (
                                  <Image unoptimized src={row.data.imageUrl} alt={row.data.name} fill sizes="40px" className="object-contain p-1" />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center"><Pill className="h-3.5 w-3.5 text-[var(--admin-text-soft)]" /></span>
                                )}
                              </span>
                              <span className="min-w-0">
                                {row.data.name}
                                {row.data.brandName && (
                                  <span className="block text-[10px] text-[var(--admin-text-soft)]">
                                    {row.data.brandName}
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {row.data.genericName}
                            {row.data.strengthDisplay && (
                              <span className="block text-[10px] text-[var(--admin-text-muted)]">
                                {row.data.strengthDisplay}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">{row.data.dosageForm}</td>
                          <td className="py-2 px-3">
                            {row.action === "create" && (
                              <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                                Create New Master
                              </span>
                            )}
                            {row.action === "match_enrich" && (
                              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                                Match & Enrich
                              </span>
                            )}
                            {row.action === "needs_review" && (
                              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                Flag for Review
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-[var(--admin-text-muted)]">
                            {row.existingMasterName ? `Matches "${row.existingMasterName}"` : row.matchReason || "No duplicate match"}
                            {row.warnings.length > 0 && (
                              <span className="block text-[10px] text-amber-600">
                                {row.warnings.join("; ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Execution Controls */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-[var(--admin-border)] pt-4">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--admin-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={transactional}
                  onChange={(e) => setTransactional(e.target.checked)}
                  className="rounded border-[var(--admin-border)]"
                />
                Strict mode: abort entire batch if any row fails validation
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-2 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
                >
                  Back to editor
                </button>
                <button
                  type="button"
                  disabled={executing || (transactional && preview.errors.length > 0) || preview.validRows === 0}
                  onClick={handleExecuteImport}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
                >
                  {executing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Importing medications...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4" /> Commit Import to Canonical Library
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success / Results Report */}
      {result && (
        <div className="rounded-2xl border border-emerald-500/30 bg-[var(--admin-card)] p-6 shadow-[var(--admin-shadow)] space-y-6">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-bold text-[var(--admin-text)]">Import Batch Completed</h3>
              <p className="text-xs text-[var(--admin-text-muted)]">
                Batch ID: <span className="font-mono font-semibold">{result.batchId}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-3">
              <span className="text-[10px] font-semibold uppercase text-[var(--admin-text-soft)]">Total Processed</span>
              <p className="mt-1 text-xl font-bold text-[var(--admin-text)]">{result.totalRows}</p>
            </div>
            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
              <span className="text-[10px] font-semibold uppercase text-teal-700 dark:text-teal-400">Created Masters</span>
              <p className="mt-1 text-xl font-bold text-teal-700 dark:text-teal-400">{result.createdCount}</p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
              <span className="text-[10px] font-semibold uppercase text-blue-700 dark:text-blue-400">Matched & Enriched</span>
              <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-400">{result.matchedCount}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <span className="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400">Sent to Review</span>
              <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">{result.reviewCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 text-xs text-[var(--admin-text-muted)]">
            <p className="font-semibold text-[var(--admin-text)] mb-1">Commercial Inventory Boundary Preserved</p>
            <p>
              Zero PharmacyInventory records were created. These medications are safely stored in the shared library ready for pharmacies to adopt.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/platform/medications"
              className="rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
            >
              Go to Medication Library
            </Link>
            {result.reviewCount > 0 && (
              <Link
                href="/platform/medications/review"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
              >
                Open Review Queue ({result.reviewCount})
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setPreview(null);
                setCsvText("");
              }}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-2 text-sm font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
