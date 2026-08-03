"use client";

import { useState } from "react";
import { Check, X, Clock, Calendar, StickyNote } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate } from "@/app/lib/time";

/**
 * Lets the customer log today's dose as taken/missed/skipped/late.
 * POSTs to /api/portal/adherence. Optional notes are supported.
 */

type DoseStatus = "taken" | "missed" | "skipped" | "late";

export function AdherenceTracker({ prescriptionId }: { prescriptionId: string }) {
  const [busy, setBusy] = useState(false);
  const [logged, setLogged] = useState<DoseStatus | null>(null);
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
        missed: "Dose logged as missed",
        skipped: "Dose logged as skipped",
        late: "Dose logged as late",
      };
      toast.success(labels[status]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log dose.");
    } finally {
      setBusy(false);
    }
  }

  if (logged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <Check className="h-3 w-3" /> {logged} today
        {notes.trim() ? <span className="font-normal opacity-70">· noted</span> : null}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[#f4f7f4] p-1">
        <Calendar className="mx-1 h-3 w-3 text-[#8a9a92]" />
        <span className="text-[10px] text-[#8a9a92] mr-1">{formatDate(today)}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("taken")}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          title="I took my dose today"
        >
          <Check className="h-2.5 w-2.5" /> Taken
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("late")}
          className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          title="I took my dose late"
        >
          <Clock className="h-2.5 w-2.5" /> Late
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("missed")}
          className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          title="I missed my dose today"
        >
          <X className="h-2.5 w-2.5" /> Missed
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("skipped")}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
          title="I deliberately skipped this dose"
        >
          <Clock className="h-2.5 w-2.5" /> Skip
        </button>
        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#5a6b62] border border-[#e3ebe6] transition hover:border-[#0d6e5a]"
          title="Add an optional note"
        >
          <StickyNote className="h-2.5 w-2.5" /> Note
        </button>
      </div>
      {showNotes && (
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional note (e.g. took with food, felt nauseous…)"
          className="w-full rounded-lg border border-[#e3ebe6] bg-white px-3 py-1.5 text-xs text-[#0c1a14] placeholder:text-[#8a9a92] focus:border-[#0d6e5a] focus:outline-none"
          maxLength={280}
        />
      )}
    </div>
  );
}
