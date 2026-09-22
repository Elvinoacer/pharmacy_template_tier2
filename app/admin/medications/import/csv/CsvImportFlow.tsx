"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toaster";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { MAX_PHARMACY_CSV_IMPORT_ROWS } from "@/app/lib/medication-import-limits";

type SystemField = {
  key: string;
  label: string;
  required?: boolean;
};

const SYSTEM_FIELDS: SystemField[] = [
  { key: "name", label: "Medicine name", required: true },
  { key: "genericName", label: "Generic name", required: true },
  { key: "brandName", label: "Brand name" },
  { key: "strengthDisplay", label: "Strength (display)" },
  { key: "dosageForm", label: "Dosage form (name)" },
  { key: "category", label: "Category slug" },
  { key: "barcode", label: "Barcode" },
  { key: "manufacturer", label: "Manufacturer name" },
  { key: "price", label: "Price (KES)", required: true },
  { key: "sku", label: "SKU" },
  { key: "currentStock", label: "Stock qty" },
  { key: "lowStockThreshold", label: "Low stock threshold" },
  { key: "supplier", label: "Supplier" },
  { key: "shelfLocation", label: "Shelf location" },
  { key: "overTheCounter", label: "OTC (true/false)" },
  { key: "prescriptionRequired", label: "Rx required (true/false)" },
  { key: "publicListing", label: "Public listing (true/false)" },
];

type Step = "upload" | "map" | "preview" | "importing" | "done";

type Summary = {
  created: number;
  matched: number;
  alreadyStocked: number;
  flagged: number;
  upgradeRequired: boolean;
  errors: Array<{ row: number; message: string }>;
};

const STEP_META: Array<{ key: Exclude<Step, "importing" | "done">; label: string }> = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map columns" },
  { key: "preview", label: "Review" },
];

export function CsvImportFlow() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleStep = step === "importing" ? "preview" : step === "done" ? "preview" : step;
  const activeIndex = STEP_META.findIndex((item) => item.key === visibleStep);
  const mappedCount = SYSTEM_FIELDS.filter((field) => mapping[field.key]).length;
  const requiredReady = SYSTEM_FIELDS.filter((field) => field.required).every((field) => mapping[field.key]);

  function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (char === '"') {
          if (inQuotes && line[index + 1] === '"') {
            current += '"';
            index++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          out.push(current);
          current = "";
        } else {
          current += char;
        }
      }

      out.push(current);
      return out.map((value) => value.trim());
    };

    const parsedHeaders = parseLine(lines[0]);
    const parsedRows = lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const record: Record<string, string> = {};
      parsedHeaders.forEach((header, index) => {
        record[header] = cells[index] ?? "";
      });
      return record;
    });

    return { headers: parsedHeaders, rows: parsedRows };
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".txt")) {
      setError("Only .csv files are supported. Save .xlsx files as CSV first.");
      toast.error("Save the spreadsheet as CSV first.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("The CSV file appears to be empty.");
        return;
      }
      if (parsed.rows.length > MAX_PHARMACY_CSV_IMPORT_ROWS) {
        setError(`This importer accepts up to ${MAX_PHARMACY_CSV_IMPORT_ROWS} rows per batch. Split the file and try again.`);
        return;
      }

      const auto: Record<string, string> = {};
      for (const field of SYSTEM_FIELDS) {
        const match = parsed.headers.find((header) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
          return (
            normalizedHeader === normalizedKey ||
            normalizedHeader === normalizedLabel ||
            normalizedHeader.includes(normalizedKey) ||
            normalizedKey.includes(normalizedHeader)
          );
        });
        if (match) auto[field.key] = match;
      }

      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(auto);
      setStep("map");
      toast.success(`Loaded ${parsed.rows.length} rows with ${parsed.headers.length} columns.`);
    } catch (parseError) {
      console.error(parseError);
      setError("Could not parse the CSV file.");
    }
  }

  function fieldFor(row: Record<string, string>, systemKey: string): string {
    const column = mapping[systemKey];
    return column ? row[column] ?? "" : "";
  }

  async function doImport() {
    if (!requiredReady) {
      setError("Map all required fields before importing.");
      return;
    }

    setStep("importing");
    setError(null);

    try {
      const mappedRows = rows.map((row) => {
        const result: Record<string, string> = {};
        for (const field of SYSTEM_FIELDS) result[field.key] = fieldFor(row, field.key);
        return result;
      });

      const response = await fetch("/api/admin/medications/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Import failed.");
      }

      const payload = (await response.json()) as Summary;
      setSummary(payload);
      setStep("done");
      if (payload.upgradeRequired) {
        toast.info("Some public listings reached the free-plan limit. Saved rows remain intact; upgrade or unpublish existing listings to continue.");
      } else if (payload.errors.length > 0) {
        toast.info(
          `Processed ${payload.created + payload.matched} medicines; ${payload.errors.length} row(s) need attention.`,
        );
      } else {
        toast.success(
          `Imported ${payload.created + payload.matched} medications (${payload.matched} matched existing).`,
        );
      }
      router.refresh();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
      setStep("preview");
    }
  }

  function reset() {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSummary(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {step !== "done" && (
        <nav aria-label="CSV import progress" className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-2 sm:p-3">
          <ol className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {STEP_META.map((item, index) => {
              const current = index === activeIndex;
              const complete = index < activeIndex;
              return (
                <li
                  key={item.key}
                  aria-current={current ? "step" : undefined}
                  className={`rounded-xl px-2 py-2.5 text-center transition sm:px-3 ${
                    current
                      ? "bg-[var(--admin-accent-soft)] ring-1 ring-inset ring-[var(--admin-border-2)]"
                      : complete
                        ? "bg-emerald-500/[0.06]"
                        : "bg-[var(--admin-inset)]"
                  }`}
                >
                  <span className={`text-sm font-semibold sm:text-sm ${current ? "admin-text" : complete ? "text-emerald-700 dark:text-emerald-300" : "admin-muted"}`}>
                    {complete ? "✓ " : `${index + 1}. `}{item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {step === "upload" && (
        <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3.5 sm:p-6">
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--admin-border-2)] px-4 py-8 text-center transition duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] sm:min-h-72 sm:py-12"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 transition-transform duration-200 group-hover:-translate-y-0.5 dark:text-emerald-300">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold admin-text">Choose a CSV file</p>
              <p className="mt-1 text-sm leading-5 admin-muted">Up to 1000 rows · headers must be in the first row</p>
            </div>
            <span className="rounded-full bg-[var(--admin-inset)] px-3 py-1 text-sm font-semibold admin-soft">.csv or .txt</span>
          </button>
          {error && (
            <div className="admin-alert-error mt-4 items-start">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
        </section>
      )}

      {step === "map" && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-3.5 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-[var(--admin-border-2)] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold admin-text">Match columns to medicine fields</h2>
                <p className="mt-1 text-sm leading-5 admin-muted">{fileName} · {rows.length} rows · {headers.length} source columns</p>
              </div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-sm font-semibold ${requiredReady ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
                {mappedCount}/{SYSTEM_FIELDS.length} mapped
              </span>
            </div>

            <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
              {SYSTEM_FIELDS.map((field) => (
                <label key={field.key} className="grid gap-1.5 rounded-xl bg-[var(--admin-inset)] p-3 sm:grid-cols-[minmax(0,10rem)_1fr] sm:items-center sm:gap-3">
                  <span className="text-sm font-medium admin-muted">
                    {field.label}{field.required && <span className="text-rose-500"> *</span>}
                  </span>
                  <select
                    value={mapping[field.key] || ""}
                    onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="input-admin min-h-11 min-w-0 text-base sm:text-sm"
                  >
                    <option value="">— Skip —</option>
                    {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>

          {!requiredReady && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Map medicine name, generic name, and price before continuing.
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-4 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] sm:rounded-full">
              <RotateCcw className="h-3.5 w-3.5" /> Different file
            </button>
            <button type="button" onClick={() => setStep("preview")} disabled={!requiredReady} className="btn-admin min-h-11 w-full !rounded-xl justify-center disabled:opacity-50">
              Preview mapped data <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)]">
            <div className="flex flex-col gap-2 border-b border-[var(--admin-border-2)] p-3.5 sm:flex-row sm:items-end sm:justify-between sm:p-5">
              <div>
                <h2 className="text-sm font-semibold admin-text">Preview before import</h2>
                <p className="mt-1 text-sm admin-muted">Showing the first {Math.min(10, rows.length)} of {rows.length} rows.</p>
              </div>
              <span className="w-fit rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-sm font-semibold admin-muted">{mappedCount} columns included</span>
            </div>
            <div tabIndex={0} role="region" aria-label="Scrollable medication import preview" className="admin-table-region overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-[var(--admin-inset)]">
                  <tr className="border-b border-[var(--admin-border-2)]">
                    <th className="sticky left-0 z-10 bg-[var(--admin-inset)] px-3 py-2.5 text-left font-semibold admin-muted">#</th>
                    {SYSTEM_FIELDS.filter((field) => mapping[field.key]).map((field) => (
                      <th key={field.key} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold admin-muted">{field.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b border-[var(--admin-border-2)]/60 last:border-0">
                      <td className="sticky left-0 bg-[var(--admin-card)] px-3 py-2.5 font-semibold admin-soft">{index + 1}</td>
                      {SYSTEM_FIELDS.filter((field) => mapping[field.key]).map((field) => (
                        <td key={field.key} className="max-w-64 px-3 py-2.5 admin-text">
                          <span className="break-words whitespace-normal">{fieldFor(row, field.key) || <span className="admin-soft">—</span>}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[var(--admin-border-2)] p-3 text-sm leading-5 admin-muted sm:px-5">
              Missing clinical fields do not reject a row; new master records can be flagged for enrichment after import.
            </p>
          </section>

          {error && (
            <div className="admin-alert-error items-start">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <button type="button" onClick={() => setStep("map")} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-4 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] sm:rounded-full">
              <ArrowLeft className="h-3.5 w-3.5" /> Edit mapping
            </button>
            <button type="button" onClick={doImport} className="btn-admin min-h-11 w-full !rounded-xl justify-center">
              <FileSpreadsheet className="h-4 w-4" /> Import {rows.length} rows
            </button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <section className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-5 py-12 text-center sm:p-14">
          <Loader2 className="mx-auto h-8 w-8 animate-spin admin-accent-text" />
          <p className="mt-4 text-sm font-semibold admin-text">Importing {rows.length} medicines…</p>
          <p className="mx-auto mt-1 max-w-md text-base leading-6 admin-muted sm:text-sm sm:leading-5">Matching shared medicine masters first, then creating only the records that do not already exist.</p>
        </section>
      )}

      {step === "done" && (
        <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold admin-text">
            {summary?.errors.length ? "Import finished with rows to review" : "Import complete"}
          </h2>
          <p className="mt-1 text-sm admin-muted">
            {summary?.errors.length
              ? "Successful rows were saved. Failed rows were left unchanged so you can correct and retry them safely."
              : "Your catalogue has been refreshed with the processed rows."}
          </p>

          {summary && (
            <div className="mx-auto mt-5 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-3">
              {[
                [summary.created, "New masters", "text-emerald-700 dark:text-emerald-300"],
                [summary.matched, "Matched", "text-blue-700 dark:text-blue-300"],
                [summary.alreadyStocked, "Already stocked", "admin-text"],
                [summary.flagged, "Needs enrichment", "text-amber-700 dark:text-amber-300"],
                [summary.errors.length, "Failed rows", summary.errors.length ? "text-rose-700 dark:text-rose-300" : "admin-text"],
              ].map(([value, label, className]) => (
                <div key={label as string} className="rounded-xl bg-[var(--admin-card)] p-3 sm:p-4">
                  <p className={`text-xl font-black sm:text-2xl ${className as string}`}>{value as number}</p>
                  <p className="mt-1 text-sm leading-4 admin-muted sm:text-sm">{label as string}</p>
                </div>
              ))}
            </div>
          )}

          {summary?.upgradeRequired && (
            <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4 text-left">
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Free-plan public listing limit reached</p>
              <p className="mt-1 text-sm leading-5 text-violet-800/80 dark:text-violet-200/80">
                CSV import itself remains available on the free plan. Only rows that would exceed the 5 public medicine listing allowance were blocked; private inventory rows can still be imported.
              </p>
              <button type="button" onClick={() => router.push("/admin/billing")} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-500">
                View Premium
              </button>
            </div>
          )}

          {summary && summary.errors.length > 0 && (
            <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-3 text-left sm:p-4">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                Rows to correct ({summary.errors.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {summary.errors.slice(0, 10).map((item) => (
                  <li key={`${item.row}:${item.message}`} className="text-sm leading-5 text-rose-700/90 dark:text-rose-200/90">
                    <span className="font-semibold">Row {item.row}:</span> {item.message}
                  </li>
                ))}
              </ul>
              {summary.errors.length > 10 && (
                <p className="mt-2 text-sm text-rose-700/75 dark:text-rose-200/75">
                  +{summary.errors.length - 10} more failed row(s). Correct the source file and import again.
                </p>
              )}
            </div>
          )}

          <div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => router.push("/admin/medications")} className="btn-admin min-h-11 w-full !rounded-xl justify-center">
              View catalogue
            </button>
            <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-4 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]">
              <RotateCcw className="h-3.5 w-3.5" /> Import another file
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
