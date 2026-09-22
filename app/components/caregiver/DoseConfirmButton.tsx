"use client";

import { useState } from "react";
import { Check, X, Clock, Calendar } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate, localTodayStr } from "@/app/lib/time";

/**
 * One-tap dose confirmation widget. Used by:
 *   - The caregiver dashboard "today's doses" checklist
 *   - The patient portal dose tracker (when tied to a scheduled slot)
 *
 * Calls the appropriate API based on the `actor` prop:
 *   - actor="customer" → /api/portal/adherence
 *   - actor="caregiver" → /api/caregiver/adherence
 *
 * When a reminderId is passed, the API will mark the reminder as answered.
 */
type DoseStatus = "taken" | "missed" | "skipped" | "late";

export function DoseConfirmButton({
  customerId,
  prescriptionId,
  scheduleId,
  scheduledTime,
  scheduledDate,
  reminderId,
  medicineName,
  actor = "customer",
  initialStatus,
}: {
  customerId: string;
  prescriptionId: string;
  scheduleId?: string | null;
  scheduledTime?: string | null;
  scheduledDate?: string; // YYYY-MM-DD, defaults to today
  reminderId?: string | null;
  medicineName: string;
  actor?: "customer" | "caregiver";
  initialStatus?: DoseStatus | null;
}) {
  const [busy, setBusy] = useState(false);
  const [logged, setLogged] = useState<DoseStatus | null>(initialStatus ?? null);
  const today = scheduledDate || localTodayStr();

  async function log(status: DoseStatus) {
    setBusy(true);
    try {
      const url = actor === "caregiver" ? "/api/caregiver/adherence" : "/api/portal/adherence";
      const payload: Record<string, unknown> = {
        prescriptionId,
        status,
        takenOn: today,
      };
      if (actor === "caregiver") {
        payload.customerId = customerId;
        payload.scheduledDate = today;
        payload.scheduledTime = scheduledTime ?? null;
        payload.scheduleId = scheduleId ?? null;
        if (reminderId) payload.reminderId = reminderId;
      }
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "log_failed");
      }
      setLogged(status);
      const labels: Record<DoseStatus, string> = {
        taken: "Dose marked as taken",
        missed: "Dose marked as missed",
        skipped: "Dose skipped",
        late: "Dose marked as late",
      };
      toast.success(`${medicineName}: ${labels[status]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log dose.");
    } finally {
      setBusy(false);
    }
  }

  if (logged) {
    const colorMap: Record<DoseStatus, string> = {
      taken: "bg-emerald-100 text-emerald-700",
      missed: "bg-rose-100 text-rose-700",
      skipped: "bg-amber-100 text-amber-700",
      late: "bg-orange-100 text-orange-700",
    };
    return (
      <span className={`inline-flex min-h-11 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold ${colorMap[logged]}`}>
        <Check className="h-3 w-3" /> {logged} {scheduledTime ? `· ${scheduledTime}` : ""}
      </span>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex items-center gap-1.5 text-sm text-[#8a9a92]">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span>
          {formatDate(today)}
          {scheduledTime ? ` · ${scheduledTime}` : ""}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => log("taken")}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
          title="Took this dose"
        >
          <Check className="h-4 w-4" /> {busy ? "…" : "Taken"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("late")}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60"
          title="Took it late"
        >
          <Clock className="h-4 w-4" /> Late
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("missed")}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-3 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-rose-600 disabled:cursor-wait disabled:opacity-60"
          title="Missed this dose"
        >
          <X className="h-4 w-4" /> Missed
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("skipped")}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
          title="Skipped intentionally"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
