"use client";

import { useState } from "react";
import { Check, X, Clock, StickyNote, AlertCircle } from "lucide-react";
import { toast } from "@/app/components/Toaster";

type DoseStatus = "taken" | "missed" | "skipped" | "late";

/**
 * Compact dose-confirm control for a *specific* scheduled slot.
 * Mobile-first: primary "Taken" is full-width and tappable; secondary actions
 * sit in a 3-col row underneath.
 */
export function AdherenceTracker({
  prescriptionId,
  scheduledTime,
  scheduleId,
  initialStatus,
  onLogged,
  /** When true, use the stacked responsive layout (default for dose cards). */
  stacked = false,
}: {
  prescriptionId: string;
  scheduledTime?: string | null;
  scheduleId?: string | null;
  initialStatus?: DoseStatus | null;
  onLogged?: (status: DoseStatus) => void;
  stacked?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [logged, setLogged] = useState<DoseStatus | null>(initialStatus || null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function log(status: DoseStatus) {
    setBusy(true);
    try {
      const r = await fetch("/api/portal/adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          status,
          takenOn: today,
          scheduledTime: scheduledTime ?? null,
          scheduleId: scheduleId ?? null,
          notes: notes.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || j.message || "log_failed");
      }
      setLogged(status);
      const labels: Record<DoseStatus, string> = {
        taken: "Dose logged as taken",
        missed: "Dose marked as missed",
        skipped: "Dose marked as skipped",
        late: "Dose logged as late",
      };
      toast.success(labels[status]);
      if (onLogged) onLogged(status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log dose.");
    } finally {
      setBusy(false);
    }
  }

  if (logged) {
    const statusStyles: Record<DoseStatus, string> = {
      taken: "bg-emerald-100 text-emerald-800 border-emerald-300",
      late: "bg-amber-100 text-amber-800 border-amber-300",
      missed: "bg-rose-100 text-rose-800 border-rose-300",
      skipped: "bg-slate-100 text-slate-700 border-slate-300",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles[logged]}`}
      >
        {logged === "taken" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
        {logged === "late" && <Clock className="h-3.5 w-3.5 text-amber-600" />}
        {logged === "missed" && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
        {logged === "skipped" && <X className="h-3.5 w-3.5 text-slate-500" />}
        <span className="capitalize">{logged}</span>
        {notes.trim() && <span className="font-normal opacity-75">· note saved</span>}
      </span>
    );
  }

  const btnBase =
    "inline-flex items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold shadow-xs transition disabled:opacity-50 active:scale-[0.98]";

  return (
    <div className="w-full space-y-2">
      {stacked ? (
        <div className="grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => log("taken")}
            className={`${btnBase} min-h-11 w-full bg-emerald-600 text-sm text-white hover:bg-emerald-700 sm:min-h-10 sm:text-xs`}
            title="Confirm dose taken"
          >
            <Check className="h-4 w-4" /> Taken
          </button>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => log("late")}
              className={`${btnBase} min-h-10 bg-amber-500 text-white hover:bg-amber-600`}
              title="Took dose late"
            >
              <Clock className="h-3.5 w-3.5" /> Late
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => log("missed")}
              className={`${btnBase} min-h-10 bg-rose-500 text-white hover:bg-rose-600`}
              title="Mark missed"
            >
              <X className="h-3.5 w-3.5" /> Missed
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => log("skipped")}
              className={`${btnBase} min-h-10 bg-slate-200 text-slate-700 hover:bg-slate-300`}
              title="Skip dose"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => log("taken")}
            className={`${btnBase} min-h-10 bg-emerald-600 text-white hover:bg-emerald-700`}
            title="Confirm dose taken"
          >
            <Check className="h-3.5 w-3.5" /> Taken
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => log("late")}
            className={`${btnBase} min-h-10 bg-amber-500 text-white hover:bg-amber-600`}
            title="Took dose late"
          >
            <Clock className="h-3.5 w-3.5" /> Late
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => log("missed")}
            className={`${btnBase} min-h-10 bg-rose-500 text-white hover:bg-rose-600`}
            title="Mark missed"
          >
            <X className="h-3.5 w-3.5" /> Missed
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => log("skipped")}
            className={`${btnBase} min-h-10 bg-slate-200 text-slate-700 hover:bg-slate-300`}
            title="Skip dose"
          >
            Skip
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowNotes((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5a6b62] hover:text-[#0d6e5a]"
        title="Add note"
      >
        <StickyNote className="h-3 w-3 text-[#8a9a92]" />
        {showNotes ? "Hide note" : "Add note"}
      </button>
      {showNotes && (
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note (e.g. took with meal…)"
          className="w-full rounded-xl border border-[#e3ebe6] bg-white px-3 py-2 text-xs text-[#0c1a14] placeholder:text-[#8a9a92] shadow-2xs focus:border-[#0d6e5a] focus:outline-none"
          maxLength={280}
        />
      )}
    </div>
  );
}
