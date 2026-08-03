"use client";

import { useState } from "react";
import { Check, X, Clock, Calendar } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate } from "@/app/lib/time";

/**
 * Lets the customer log today's dose as taken/missed/skipped.
 * POSTs to /api/portal/adherence.
 */

export function AdherenceTracker({ prescriptionId }: { prescriptionId: string }) {
  const [busy, setBusy] = useState(false);
  const [logged, setLogged] = useState<"taken" | "missed" | "skipped" | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function log(status: "taken" | "missed" | "skipped") {
    setBusy(true);
    try {
      const r = await fetch("/api/portal/adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId, status, takenOn: today }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "log_failed");
      }
      setLogged(status);
      const labels = { taken: "Dose logged as taken", missed: "Dose logged as missed", skipped: "Dose logged as skipped" };
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
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[#f4f7f4] p-1">
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
    </div>
  );
}
