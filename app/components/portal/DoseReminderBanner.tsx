"use client";

import { useState } from "react";
import { Check, Clock, X, Bell, Pill, Sparkles } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { localTodayStr } from "@/app/lib/time";

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
    const todayStr = localTodayStr();

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
        throw new Error(j.error || j.message || "Failed to log dose");
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
    <div className="mb-5 overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-50 via-white to-emerald-50/60 p-3 shadow-sm sm:mb-6 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-md">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[#0c1a14] sm:text-base">Doses need confirmation</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <Sparkles className="h-3 w-3 text-amber-600" />
              {items.length} pending
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#5a6b62]">
            Confirm below — one tap updates your adherence score.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2.5">
        {items.map((item) => {
          const busy = busyId === item.scheduleId;
          return (
            <li
              key={item.scheduleId}
              className="rounded-xl border border-white/80 bg-white/95 p-3 shadow-xs"
            >
              <div className="flex items-start gap-2">
                <Pill className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0c1a14]">{item.medicineName}</p>
                  <p className="mt-0.5 text-[11px] text-[#5a6b62]">
                    <span className="font-mono font-semibold text-[#0d6e5a]">{item.timeOfDay}</span>
                    {item.label ? ` · ${item.label}` : ""}
                    {item.dosage ? ` · ${item.dosage}` : ""}
                  </p>
                </div>
              </div>

              {/* Mobile-first action row: primary full-width, secondary pair below */}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleLog(item, "taken")}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50 sm:min-h-10 sm:text-xs"
                >
                  <Check className="h-4 w-4" /> Taken
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleLog(item, "late")}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 disabled:opacity-50"
                >
                  <Clock className="h-3.5 w-3.5" /> Late
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleLog(item, "skipped")}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Skip
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
