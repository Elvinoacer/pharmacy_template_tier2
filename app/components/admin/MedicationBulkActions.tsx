"use client";

import { useState, useTransition } from "react";
import { toast } from "@/app/components/Toaster";
import { CheckSquare, Square, Archive, Eye, EyeOff } from "lucide-react";

type Row = { id: string; name: string; active: boolean; publicListing: boolean };

/**
 * Client bulk actions for the medications catalogue: select all / deactivate /
 * hide from public listing. Hits a small admin API so we don't need one form
 * per row.
 */
export function MedicationBulkActions({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(action: "deactivate" | "activate" | "unpublish" | "publish") {
    if (selected.size === 0) {
      toast.error("Select at least one medication.");
      return;
    }
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/medications/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selected), action }),
        });
        if (!r.ok) throw new Error();
        const j = await r.json().catch(() => ({}));
        toast.success(j.message || `Updated ${selected.size} medication(s).`);
        window.location.reload();
      } catch {
        toast.error("Bulk update failed.");
      }
    });
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-muted hover:text-[var(--admin-text)]"
        >
          {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {allSelected ? "Clear selection" : "Select all on page"}
        </button>
        {selected.size > 0 && (
          <>
            <span className="text-[10px] admin-soft">{selected.size} selected</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("deactivate")}
              className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-600 disabled:opacity-50"
            >
              <Archive className="h-3 w-3" /> Deactivate
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("activate")}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 disabled:opacity-50"
            >
              <Eye className="h-3 w-3" /> Activate
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("unpublish")}
              className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 text-[10px] font-semibold text-slate-600 disabled:opacity-50"
            >
              <EyeOff className="h-3 w-3" /> Hide public
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("publish")}
              className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold text-blue-700 disabled:opacity-50"
            >
              <Eye className="h-3 w-3" /> Show public
            </button>
          </>
        )}
      </div>
      {/* Per-row checkboxes rendered via data attributes on sibling list — we expose a map helper */}
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => toggleOne(r.id)}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              selected.has(r.id)
                ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text"
                : "border-[var(--admin-border)] admin-muted"
            }`}
            title={r.name}
          >
            {selected.has(r.id) ? "✓ " : ""}
            {r.name.length > 18 ? r.name.slice(0, 18) + "…" : r.name}
          </button>
        ))}
      </div>
    </div>
  );
}
