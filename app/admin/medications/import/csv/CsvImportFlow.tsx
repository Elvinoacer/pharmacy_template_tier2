"use client";

import { useState, useRef } from "react";
import { toast } from "@/app/components/Toaster";
import { useRouter } from "next/navigation";
import {
  Upload, FileSpreadsheet, ArrowRight, Check, AlertCircle, Loader2, X,
} from "lucide-react";

type SystemField = {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
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

export function CsvImportFlow() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // systemField → sourceColumn
  const [summary, setSummary] = useState<{ created: number; matched: number; flagged: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          out.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = cells[i] ?? "";
      });
      return obj;
    });
    return { headers, rows };
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
      setError("Only .csv files are supported in this build. For .xlsx, use Excel's 'Save As CSV' first.");
      toast.error(".xlsx not supported — save as CSV first.");
      return;
    }
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0 || rows.length === 0) {
        setError("The CSV file appears to be empty.");
        return;
      }
      setHeaders(headers);
      setRows(rows);
      // Auto-map: try to match source column names to system field keys/labels.
      const auto: Record<string, string> = {};
      for (const f of SYSTEM_FIELDS) {
        const match = headers.find((h) => {
          const hn = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          const fk = f.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const fl = f.label.toLowerCase().replace(/[^a-z0-9]/g, "");
          return hn === fk || hn === fl || hn.includes(fk) || fk.includes(hn);
        });
        if (match) auto[f.key] = match;
      }
      setMapping(auto);
      setStep("map");
      toast.success(`Loaded ${rows.length} rows with ${headers.length} columns.`);
    } catch (err) {
      console.error(err);
      setError("Could not parse the CSV file.");
    }
  }

  function fieldFor(row: Record<string, string>, systemKey: string): string {
    const col = mapping[systemKey];
    return col ? (row[col] ?? "") : "";
  }

  async function doImport() {
    setStep("importing");
    setError(null);
    try {
      const mappedRows = rows.map((r) => {
        const obj: Record<string, string> = {};
        for (const f of SYSTEM_FIELDS) {
          obj[f.key] = fieldFor(r, f.key);
        }
        return obj;
      });
      const res = await fetch("/api/admin/medications/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "Import failed.");
      }
      const j = (await res.json()) as { created: number; matched: number; flagged: number };
      setSummary(j);
      setStep("done");
      toast.success(`Imported ${j.created + j.matched} medications (${j.matched} matched existing).`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
      setStep("preview");
    }
  }

  if (step === "upload") {
    return (
      <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-8">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          onChange={onFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--admin-border-2)] py-12 text-center transition hover:border-emerald-500/50 hover:bg-emerald-500/5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold admin-text">Click to upload a .csv file</p>
            <p className="mt-1 text-xs admin-soft">Max 1000 rows. Headers in the first row.</p>
          </div>
        </button>
        {error && (
          <div className="mt-4 admin-alert-error">
            <AlertCircle className="h-3.5 w-3.5" /> <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4">
          <h3 className="mb-3 text-sm font-semibold admin-text">Map source columns to system fields</h3>
          <p className="mb-4 text-xs admin-soft">
            Your file has {headers.length} columns. Match each to a system field. Required fields are marked *.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SYSTEM_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <label className="w-40 text-xs font-medium admin-muted">
                  {f.label}{f.required && <span className="text-rose-500"> *</span>}
                </label>
                <select
                  value={mapping[f.key] || ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                  className="input-admin flex-1 text-xs"
                >
                  <option value="">— Skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setStep("upload")}
            className="rounded-full bg-[var(--admin-inset)] px-4 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
          >
            ← Upload different file
          </button>
          <button
            type="button"
            onClick={() => setStep("preview")}
            className="btn-admin inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs"
          >
            Preview <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    const previewRows = rows.slice(0, 10);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4">
          <h3 className="mb-3 text-sm font-semibold admin-text">Preview (first 10 rows)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--admin-border-2)]">
                  <th className="px-2 py-1.5 text-left font-semibold admin-muted">#</th>
                  {SYSTEM_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                    <th key={f.key} className="px-2 py-1.5 text-left font-semibold admin-muted">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--admin-border-2)]/50">
                    <td className="px-2 py-1 admin-soft">{i + 1}</td>
                    {SYSTEM_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                      <td key={f.key} className="px-2 py-1 admin-text">{fieldFor(r, f.key) || <span className="admin-soft">—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs admin-soft">
            Importing {rows.length} rows. Missing clinical fields will flag records for enrichment (not reject).
          </p>
        </div>
        {error && (
          <div className="admin-alert-error">
            <AlertCircle className="h-3.5 w-3.5" /> <span>{error}</span>
          </div>
        )}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setStep("map")}
            className="rounded-full bg-[var(--admin-inset)] px-4 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
          >
            ← Edit mapping
          </button>
          <button
            type="button"
            onClick={doImport}
            className="btn-admin inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import {rows.length} rows
          </button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin admin-accent-text" />
        <p className="mt-4 text-sm font-semibold admin-text">Importing {rows.length} medications…</p>
        <p className="mt-1 text-xs admin-soft">Matching against existing masters + creating new ones.</p>
      </div>
    );
  }

  // done
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Check className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold admin-text">Import complete</h3>
      {summary && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.created}</p>
            <p className="text-[10px] admin-soft">New masters</p>
          </div>
          <div>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{summary.matched}</p>
            <p className="text-[10px] admin-soft">Matched existing</p>
          </div>
          <div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.flagged}</p>
            <p className="text-[10px] admin-soft">Flagged for enrichment</p>
          </div>
        </div>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/admin/medications")}
          className="btn-admin inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs"
        >
          View catalog
        </button>
        <button
          type="button"
          onClick={() => { setStep("upload"); setRows([]); setHeaders([]); setSummary(null); }}
          className="rounded-full bg-[var(--admin-inset)] px-4 py-2 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
        >
          Import another file
        </button>
      </div>
    </div>
  );
}
