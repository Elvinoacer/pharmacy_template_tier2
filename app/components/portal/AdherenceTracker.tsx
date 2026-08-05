"use client";

import { useState } from "react";
import { Check, X, Clock, Calendar, StickyNote, AlertCircle } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate } from "@/app/lib/time";

type DoseStatus = "taken" | "missed" | "skipped" | "late";

export function AdherenceTracker({
  prescriptionId,
  scheduledTime,
  scheduleId,
  initialStatus,
  onLogged,
}: {
  prescriptionId: string;
  scheduledTime?: string | null;
  scheduleId?: string | null;
  initialStatus?: DoseStatus | null;
  onLogged?: (status: DoseStatus) => void;
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
        throw new Error(j.error || "log_failed");
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
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[logged]}`}>
        {logged === "taken" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
        {logged === "late" && <Clock className="h-3.5 w-3.5 text-amber-600" />}
        {logged === "missed" && <AlertCircle className="h-3.5 w-3.5 text-rose-600" />}
        {logged === "skipped" && <X className="h-3.5 w-3.5 text-slate-500" />}
        <span className="capitalize">{logged}</span>
        {notes.trim() && <span className="font-normal opacity-75">· note saved</span>}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-[#e3ebe6] bg-[#f8faf8] p-1 shadow-2xs">
        <span className="flex items-center gap-1 px-2 text-[11px] font-medium text-[#5a6b62]">
          <Calendar className="h-3 w-3 text-[#0d6e5a]" />
          {scheduledTime ? scheduledTime : formatDate(today)}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("taken")}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
          title="Confirm dose taken"
        >
          <Check className="h-3 w-3" /> Taken
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("late")}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-amber-600 disabled:opacity-50"
          title="Took dose late"
        >
          <Clock className="h-3 w-3" /> Late
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("missed")}
          className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-rose-600 disabled:opacity-50"
          title="Mark missed"
        >
          <X className="h-3 w-3" /> Missed
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("skipped")}
          className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"
          title="Skip dose"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#5a6b62] border border-[#e3ebe6] transition hover:border-[#0d6e5a]"
          title="Add note"
        >
          <StickyNote className="h-3 w-3 text-[#8a9a92]" /> Note
        </button>
      </div>
      {showNotes && (
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note (e.g. took with meal, mild side effect…)"
          className="w-full rounded-xl border border-[#e3ebe6] bg-white px-3 py-1.5 text-xs text-[#0c1a14] placeholder:text-[#8a9a92] focus:border-[#0d6e5a] focus:outline-none shadow-2xs"
          maxLength={280}
        />
      )}
    </div>
  );
}
