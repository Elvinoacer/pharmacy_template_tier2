"use client";

import { useState } from "react";
import { Check, Clock, X, Bell, Pill, Sparkles } from "lucide-react";
import { toast } from "@/app/components/Toaster";

export type PendingDoseItem = {
  scheduleId: string;
  prescriptionId: string;
  medicineName: string;
  dosage?: string | null;
  timeOfDay: string;
  label?: string | null;
  status?: "pending" | "overdue" | "missed" | "taken" | "late" | "skipped";
};

export function DoseReminderBanner({
  pendingDoses,
  onDoseLogged,
}: {
  pendingDoses: PendingDoseItem[];
  onDoseLogged?: () => void;
}) {
  const [items, setItems] = useState<PendingDoseItem[]>(pendingDoses);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  async function handleLog(item: PendingDoseItem, status: "taken" | "late" | "skipped") {
    setBusyId(item.scheduleId);
    const todayStr = new Date().toISOString().slice(0, 10);

    try {
      const res = await fetch("/api/portal/adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: item.prescriptionId,
          status,
          takenOn: todayStr,
          scheduledTime: item.timeOfDay,
          scheduleId: item.scheduleId,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to log dose");
      }

      setItems((prev) => prev.filter((i) => i.scheduleId !== item.scheduleId));
      toast.success(
        status === "taken"
          ? `Confirmed dose for ${item.medicineName}`
          : status === "late"
          ? `Logged late dose for ${item.medicineName}`
          : `Skipped dose for ${item.medicineName}`
      );
      if (onDoseLogged) onDoseLogged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update dose status");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0d6e5a]/10 via-[#084c3f]/5 to-emerald-500/10 p-4 shadow-sm backdrop-blur-sm transition-all hover:border-emerald-500/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-md">
            <Bell className="h-5 w-5 animate-pulse" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#0c1a14]">Pending Dose Reminder</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <Sparkles className="h-3 w-3 text-amber-600" /> Action Required
              </span>
            </div>
            <p className="text-xs text-[#5a6b62]">
              You have {items.length} dose{items.length === 1 ? "" : "s"} due. Confirm directly below to update your live adherence score.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.scheduleId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/90 p-2.5 shadow-xs transition hover:bg-white"
            >
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-[#0d6e5a]" />
                <div>
                  <span className="font-semibold text-xs text-[#0c1a14]">{item.medicineName}</span>
                  <span className="ml-1.5 rounded bg-[#e6f4ef] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#0d6e5a]">
                    {item.timeOfDay} {item.label ? `(${item.label})` : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busyId === item.scheduleId}
                  onClick={() => handleLog(item, "taken")}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                  title="Confirm dose taken"
                >
                  <Check className="h-3.5 w-3.5" /> Taken
                </button>
                <button
                  type="button"
                  disabled={busyId === item.scheduleId}
                  onClick={() => handleLog(item, "late")}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-600 disabled:opacity-50"
                  title="Took dose late"
                >
                  <Clock className="h-3.5 w-3.5" /> Late
                </button>
                <button
                  type="button"
                  disabled={busyId === item.scheduleId}
                  onClick={() => handleLog(item, "skipped")}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"
                  title="Skip this dose"
                >
                  <X className="h-3.5 w-3.5" /> Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
