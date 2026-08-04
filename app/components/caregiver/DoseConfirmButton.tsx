"use client";

import { useState } from "react";
import { Check, X, Clock, Calendar } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate } from "@/app/lib/time";

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
  const today = scheduledDate || new Date().toISOString().slice(0, 10);

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
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${colorMap[logged]}`}>
        <Check className="h-3 w-3" /> {logged} {scheduledTime ? `· ${scheduledTime}` : ""}
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[#f4f7f4] p-1">
        <Calendar className="mx-1 h-3 w-3 text-[#8a9a92]" />
        <span className="text-[10px] text-[#8a9a92] mr-1">
          {formatDate(today)}{scheduledTime ? ` · ${scheduledTime}` : ""}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("taken")}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          title="Took this dose"
        >
          <Check className="h-2.5 w-2.5" /> Taken
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("late")}
          className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          title="Took it late"
        >
          <Clock className="h-2.5 w-2.5" /> Late
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("missed")}
          className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          title="Missed this dose"
        >
          <X className="h-2.5 w-2.5" /> Missed
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => log("skipped")}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
          title="Skipped intentionally"
        >
          <Clock className="h-2.5 w-2.5" /> Skip
        </button>
      </div>
    </div>
  );
}
