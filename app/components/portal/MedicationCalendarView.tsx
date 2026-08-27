"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Pill,
  RefreshCw,
  Info,
  Check,
  X,
  StickyNote,
  User,
  ShoppingBag,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Flame,
  Filter,
  CheckCheck,
  CalendarDays,
  ListTodo,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { useTenantBrand } from "@/app/components/TenantBrand";
import { formatDate } from "@/app/lib/time";
import type {
  MedicationCalendarMonthView,
  CalendarDayData,
  CalendarDoseSlot,
} from "@/app/lib/services/medication-calendar";

export function MedicationCalendarView({
  initialData,
}: {
  initialData: MedicationCalendarMonthView;
}) {
  const brand = useTenantBrand();
  const [data, setData] = useState<MedicationCalendarMonthView>(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(() => {
    return initialData.days.find((d) => d.isToday) || initialData.days[0] || null;
  });
  const [activeDoseModal, setActiveDoseModal] = useState<CalendarDoseSlot | null>(null);
  const [loggingStatus, setLoggingStatus] = useState<string | null>(null);
  const [doseNote, setDoseNote] = useState("");
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda">("month");
  const [timeFilter, setTimeFilter] = useState<"all" | "morning" | "afternoon" | "evening">("all");

  async function loadMonth(year: number, month: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/calendar?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to load calendar");
      const json: MedicationCalendarMonthView = await res.json();
      setData(json);
      const todayInNewMonth = json.days.find((d) => d.isToday) || json.days[0] || null;
      setSelectedDay(todayInNewMonth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error loading calendar");
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    let newMonth = data.month - 1;
    let newYear = data.year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    loadMonth(newYear, newMonth);
  }

  function nextMonth() {
    let newMonth = data.month + 1;
    let newYear = data.year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    loadMonth(newYear, newMonth);
  }

  function jumpToToday() {
    const now = new Date();
    loadMonth(now.getFullYear(), now.getMonth() + 1);
  }

  async function handleLogDose(
    prescriptionId: string,
    status: "taken" | "late" | "missed" | "skipped",
    timeOfDay?: string
  ) {
    setLoggingStatus(status);
    try {
      const dateToLog = selectedDay?.dateStr || new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/portal/adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId,
          status,
          takenOn: dateToLog,
          scheduledTime: timeOfDay || undefined,
          notes: doseNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update dose status");

      const labels: Record<string, string> = {
        taken: "Dose confirmed as taken! Great job staying on track. ✨",
        late: "Dose logged as late.",
        missed: "Dose recorded as missed.",
        skipped: "Dose recorded as skipped.",
      };
      toast.success(labels[status] || `Dose marked as ${status}`);
      setActiveDoseModal(null);
      setDoseNote("");
      loadMonth(data.year, data.month);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update dose");
    } finally {
      setLoggingStatus(null);
    }
  }

  // Week view calculation
  const weekDays = (() => {
    if (!selectedDay) return data.days.slice(0, 7);
    const dayIndex = data.days.findIndex((d) => d.dateStr === selectedDay.dateStr);
    if (dayIndex === -1) return data.days.slice(0, 7);
    const startOfWeek = Math.max(0, dayIndex - selectedDay.dayOfWeek);
    return data.days.slice(startOfWeek, startOfWeek + 7);
  })();

  const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const leadingBlanks = data.days.length > 0 ? data.days[0].dayOfWeek : 0;

  // Group doses by time of day
  function getTimeSlotCategory(timeStr: string): "morning" | "afternoon" | "evening" {
    const hour = parseInt(timeStr.split(":")[0], 10) || 8;
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }

  const filteredSelectedDoses = (selectedDay?.doses || []).filter((d) => {
    if (timeFilter === "all") return true;
    return getTimeSlotCategory(d.timeOfDay) === timeFilter;
  });

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL BAR ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-3.5 sm:p-4 rounded-3xl border border-[#e3ebe6] shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center rounded-2xl border border-[#e3ebe6] bg-[#fafcfb] p-1 shadow-2xs">
            <button
              onClick={prevMonth}
              disabled={loading}
              className="rounded-xl p-2 text-[#5a6b62] hover:bg-white hover:text-[#0c1a14] disabled:opacity-50 transition"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-bold text-[#0c1a14] min-w-[140px] text-center">
              {data.monthLabel}
            </span>
            <button
              onClick={nextMonth}
              disabled={loading}
              className="rounded-xl p-2 text-[#5a6b62] hover:bg-white hover:text-[#0c1a14] disabled:opacity-50 transition"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={jumpToToday}
            className="rounded-xl border border-[#e3ebe6] bg-white px-3.5 py-2 text-xs font-bold text-[#0d6e5a] hover:bg-teal-50 shadow-2xs transition"
          >
            Today
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-[#e3ebe6] bg-[#fafcfb] p-1 shadow-2xs">
            <button
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "month"
                  ? "bg-[#0d6e5a] text-white shadow-2xs"
                  : "text-[#5a6b62] hover:text-[#0c1a14]"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "week"
                  ? "bg-[#0d6e5a] text-white shadow-2xs"
                  : "text-[#5a6b62] hover:text-[#0c1a14]"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "agenda"
                  ? "bg-[#0d6e5a] text-white shadow-2xs"
                  : "text-[#5a6b62] hover:text-[#0c1a14]"
              }`}
            >
              <ListTodo className="h-3.5 w-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>

        {/* Sync & Export CTA buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/portal/calendar?export=ics"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-bold text-[#0d6e5a] hover:bg-teal-100 shadow-2xs transition"
            title="Download iCal (.ics) to sync alarms with Apple Calendar, Google Calendar or Outlook"
          >
            <Download className="h-3.5 w-3.5 text-[#0d6e5a]" />
            <span>Sync to Phone (.ics)</span>
          </a>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e3ebe6] bg-white px-3.5 py-2 text-xs font-semibold text-[#5a6b62] hover:bg-[#f2f7f4] shadow-2xs transition"
            title="Print a clean wallet/fridge card of your schedule"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Card</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS RIBBON ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-3xl border border-[#e3ebe6] bg-white p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#5a6b62]">Monthly Adherence</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-extrabold ${
                  data.overallMonthAdherence >= 85
                    ? "text-emerald-700"
                    : data.overallMonthAdherence >= 70
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {data.overallMonthAdherence}%
              </span>
              <span className="text-xs text-[#8a9a92]">target 85%+</span>
            </div>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
              data.overallMonthAdherence >= 85
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-[#e3ebe6] bg-white p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#5a6b62]">Doses Confirmed</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {data.totalTakenMonth}
              </span>
              <span className="text-xs text-[#8a9a92]">of {data.totalScheduledMonth}</span>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-[#e3ebe6] bg-white p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#5a6b62]">Missed Doses</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                {data.totalMissedMonth}
              </span>
              <span className="text-xs text-[#8a9a92]">past due</span>
            </div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50/40 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0d6e5a]">Med Sync Status</span>
            <RefreshCw className="h-4 w-4 text-[#0d6e5a]" />
          </div>
          <p className="mt-1 text-xs text-[#5a6b62]">Align all chronic refills to 1 day</p>
          <Link
            href="/portal/sync"
            className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#0d6e5a] hover:underline"
          >
            Manage Med Sync →
          </Link>
        </div>
      </div>

      {/* ── MAIN CALENDAR DISPLAY & DETAIL PANEL ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT 2 COLS: VISUAL CALENDAR */}
        <div className="lg:col-span-2 rounded-3xl border border-[#e3ebe6] bg-white p-4 sm:p-6 shadow-xs">
          {/* Days of week header */}
          <div className="grid grid-cols-7 mb-3 text-center text-xs font-bold uppercase tracking-wider text-[#8a9a92]">
            {weekDayNames.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* VIEW: MONTH GRID */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: leadingBlanks }).map((_, idx) => (
                <div
                  key={`blank-${idx}`}
                  className="h-20 sm:h-24 rounded-2xl bg-[#fafcfb]/60 border border-dashed border-black/5"
                />
              ))}

              {data.days.map((day) => {
                const isSelected = selectedDay?.dateStr === day.dateStr;
                const hasRefill = day.refills.length > 0;

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDay(day)}
                    className={`h-20 sm:h-24 rounded-2xl p-1.5 sm:p-2 text-left flex flex-col justify-between transition relative border ${
                      isSelected
                        ? "border-[#0d6e5a] bg-teal-50/50 ring-2 ring-[#0d6e5a]/25 shadow-xs"
                        : day.isToday
                        ? "border-emerald-300 bg-emerald-50/20"
                        : "border-[#f0f4f2] bg-white hover:border-[#ccd7d1] hover:bg-[#fafcfb]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center text-xs font-bold ${
                          day.isToday
                            ? "h-5 w-5 rounded-full bg-[#0d6e5a] text-white shadow-2xs"
                            : isSelected
                            ? "text-[#0d6e5a] font-extrabold"
                            : "text-[#0c1a14]"
                        }`}
                      >
                        {day.dayOfMonth}
                      </span>

                      {day.adherencePercentage !== null && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            day.adherencePercentage === 100
                              ? "bg-emerald-500"
                              : day.adherencePercentage >= 50
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {hasRefill && (
                        <div className="truncate rounded px-1 py-0.5 text-[9px] font-bold bg-purple-100 text-purple-900 flex items-center gap-0.5">
                          <RefreshCw className="h-2 w-2 shrink-0" />
                          <span>Refill</span>
                        </div>
                      )}

                      {day.doses.slice(0, 2).map((dose, idx) => (
                        <div
                          key={idx}
                          className={`truncate rounded px-1 py-0.5 text-[9px] font-medium flex items-center gap-1 ${
                            dose.status === "taken" || dose.status === "late"
                              ? "bg-emerald-100 text-emerald-900 font-semibold"
                              : dose.status === "missed"
                              ? "bg-rose-100 text-rose-900 font-semibold"
                              : dose.status === "skipped"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-teal-50 text-[#0d6e5a]"
                          }`}
                        >
                          <span className="font-mono text-[8px] font-bold">{dose.timeOfDay}</span>
                          <span className="truncate">{dose.medicineName}</span>
                        </div>
                      ))}

                      {day.doses.length > 2 && (
                        <span className="block text-[8px] font-bold text-[#8a9a92] pl-1">
                          +{day.doses.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: WEEK STRIP */}
          {viewMode === "week" && (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const isSelected = selectedDay?.dateStr === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDay(day)}
                    className={`h-48 rounded-2xl p-2.5 text-left flex flex-col justify-between transition border ${
                      isSelected
                        ? "border-[#0d6e5a] bg-teal-50/50 ring-2 ring-[#0d6e5a]/25 shadow-xs"
                        : day.isToday
                        ? "border-emerald-300 bg-emerald-50/20"
                        : "border-[#f0f4f2] bg-white hover:border-[#ccd7d1]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#8a9a92]">
                          {weekDayNames[day.dayOfWeek]}
                        </span>
                        <span
                          className={`inline-flex items-center justify-center text-xs font-bold ${
                            day.isToday
                              ? "h-5 w-5 rounded-full bg-[#0d6e5a] text-white"
                              : "text-[#0c1a14]"
                          }`}
                        >
                          {day.dayOfMonth}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        {day.doses.map((dose, idx) => (
                          <div
                            key={idx}
                            className={`rounded p-1 text-[10px] ${
                              dose.status === "taken"
                                ? "bg-emerald-100 text-emerald-900 font-bold"
                                : dose.status === "missed"
                                ? "bg-rose-100 text-rose-900 font-bold"
                                : "bg-teal-50 text-[#0d6e5a]"
                            }`}
                          >
                            <span className="font-mono text-[9px] font-bold block">
                              {dose.timeOfDay}
                            </span>
                            <span className="truncate block">{dose.medicineName}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-[#8a9a92]">
                      {day.doses.length} dose{day.doses.length === 1 ? "" : "s"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* VIEW: AGENDA TIMELINE */}
          {viewMode === "agenda" && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {data.days
                .filter((d) => d.doses.length > 0 || d.refills.length > 0)
                .map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => setSelectedDay(day)}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      selectedDay?.dateStr === day.dateStr
                        ? "border-[#0d6e5a] bg-teal-50/30"
                        : "border-[#e3ebe6] bg-white hover:border-[#ccd7d1]"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-black/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0c1a14]">
                          {formatDate(new Date(day.dateStr + "T00:00:00Z"))}
                        </span>
                        {day.isToday && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#5a6b62]">
                        {day.takenDoses}/{day.totalDoses} taken
                      </span>
                    </div>

                    <div className="mt-3 grid sm:grid-cols-2 gap-2">
                      {day.doses.map((dose, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl p-2 text-xs flex items-center justify-between border ${
                            dose.status === "taken"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : dose.status === "missed"
                              ? "bg-rose-50 border-rose-200 text-rose-900"
                              : "bg-white border-[#e3ebe6] text-[#0c1a14]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[11px] text-[#0d6e5a]">
                              {dose.timeOfDay}
                            </span>
                            <span className="font-bold">{dose.medicineName}</span>
                          </div>
                          <span className="capitalize text-[10px] font-semibold">
                            {dose.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Color legend footer */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-black/5 pt-4 text-xs text-[#5a6b62]">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span>Taken</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span>Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              <span>Missed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-300" />
              <span>Skipped</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-purple-500" />
              <span>Refill Milestone</span>
            </div>
          </div>
        </div>

        {/* RIGHT COL: SELECTED DAY DOSAGE DETAIL & QUICK ACTION PANEL */}
        <div className="rounded-3xl border border-[#e3ebe6] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between border-b border-black/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#8a9a92]">
                  Daily Checklist
                </span>
                <h3 className="text-lg font-bold text-[#0c1a14]">
                  {selectedDay
                    ? formatDate(new Date(selectedDay.dateStr + "T00:00:00Z"))
                    : "Select a Date"}
                </h3>
              </div>

              {selectedDay?.isToday && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  Today
                </span>
              )}
            </div>

            {/* Time period filter pills */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setTimeFilter("all")}
                className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                  timeFilter === "all"
                    ? "bg-[#0d6e5a] text-white"
                    : "bg-[#fafcfb] text-[#5a6b62] border border-[#e3ebe6]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTimeFilter("morning")}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
                  timeFilter === "morning"
                    ? "bg-[#0d6e5a] text-white"
                    : "bg-[#fafcfb] text-[#5a6b62] border border-[#e3ebe6]"
                }`}
              >
                <Sun className="h-3 w-3" /> Morning
              </button>
              <button
                onClick={() => setTimeFilter("afternoon")}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
                  timeFilter === "afternoon"
                    ? "bg-[#0d6e5a] text-white"
                    : "bg-[#fafcfb] text-[#5a6b62] border border-[#e3ebe6]"
                }`}
              >
                <Sunset className="h-3 w-3" /> Afternoon
              </button>
              <button
                onClick={() => setTimeFilter("evening")}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
                  timeFilter === "evening"
                    ? "bg-[#0d6e5a] text-white"
                    : "bg-[#fafcfb] text-[#5a6b62] border border-[#e3ebe6]"
                }`}
              >
                <Moon className="h-3 w-3" /> Evening
              </button>
            </div>

            {/* Refill alerts on this day */}
            {selectedDay && selectedDay.refills.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedDay.refills.map((refill, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-purple-200 bg-purple-50/60 p-3.5 flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-900">
                        <RefreshCw className="h-3.5 w-3.5" />
                        {refill.type === "refill_due" ? "Refill Due Date" : "Refill Pickup Ready"}
                      </span>
                      <p className="mt-0.5 font-bold text-sm text-[#0c1a14]">{refill.medicineName}</p>
                      {refill.rxReference && (
                        <p className="text-xs text-[#5a6b62]">Rx Ref: {refill.rxReference}</p>
                      )}
                    </div>
                    <Link
                      href={`/portal/refills/new?prescriptionId=${refill.prescriptionId}`}
                      className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 transition"
                    >
                      Refill Now
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Daily Doses checklist */}
            <div className="mt-4 space-y-3">
              {filteredSelectedDoses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e3ebe6] p-6 text-center text-xs text-[#8a9a92]">
                  No medications scheduled for this time slot.
                </div>
              ) : (
                filteredSelectedDoses.map((dose, idx) => {
                  const statusBorder: Record<string, string> = {
                    taken: "border-emerald-200 bg-emerald-50/40",
                    late: "border-amber-200 bg-amber-50/40",
                    missed: "border-rose-200 bg-rose-50/40",
                    skipped: "border-slate-200 bg-slate-50",
                    pending: "border-[#e3ebe6] bg-white",
                    unknown: "border-amber-200 bg-amber-50/20",
                  };

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border p-4 transition space-y-3 ${
                        statusBorder[dose.status] || "border-[#e3ebe6] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0d6e5a]">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{dose.timeOfDay}</span>
                            {dose.label && <span>· {dose.label}</span>}
                          </div>
                          <h4 className="mt-1 font-bold text-sm text-[#0c1a14]">{dose.medicineName}</h4>
                          {dose.dosage && (
                            <p className="text-xs text-[#5a6b62] mt-0.5">{dose.dosage}</p>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            dose.status === "taken"
                              ? "bg-emerald-100 text-emerald-900"
                              : dose.status === "late"
                              ? "bg-amber-100 text-amber-900"
                              : dose.status === "missed"
                              ? "bg-rose-100 text-rose-900"
                              : dose.status === "skipped"
                              ? "bg-slate-100 text-slate-800"
                              : "bg-teal-50 text-[#0d6e5a]"
                          }`}
                        >
                          {dose.status === "taken" && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {dose.status === "missed" && <AlertCircle className="h-3.5 w-3.5" />}
                          {dose.status === "late" && <Clock className="h-3.5 w-3.5" />}
                          {dose.status === "skipped" && <XCircle className="h-3.5 w-3.5" />}
                          <span className="capitalize">{dose.status}</span>
                        </span>
                      </div>

                      {dose.notes && (
                        <p className="text-xs text-[#5a6b62] italic bg-black/5 rounded-xl px-3 py-1.5">
                          Note: {dose.notes}
                        </p>
                      )}

                      {/* Quick 1-tap Actions */}
                      <div className="flex items-center justify-between border-t border-black/5 pt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              handleLogDose(dose.prescriptionId, "taken", dose.timeOfDay)
                            }
                            disabled={loggingStatus !== null}
                            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            <Check className="h-3.5 w-3.5 inline mr-1" />
                            Taken
                          </button>
                          <button
                            onClick={() =>
                              handleLogDose(dose.prescriptionId, "late", dose.timeOfDay)
                            }
                            disabled={loggingStatus !== null}
                            className="rounded-xl bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition"
                          >
                            Late
                          </button>
                          <button
                            onClick={() =>
                              handleLogDose(dose.prescriptionId, "skipped", dose.timeOfDay)
                            }
                            disabled={loggingStatus !== null}
                            className="rounded-xl bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
                          >
                            Skip
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setActiveDoseModal(dose);
                            setDoseNote(dose.notes || "");
                          }}
                          className="rounded-xl border border-[#e3ebe6] px-2.5 py-1.5 text-xs font-semibold text-[#5a6b62] hover:bg-[#f2f7f4] transition"
                        >
                          <StickyNote className="h-3.5 w-3.5 inline mr-1" />
                          Note
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Adherence Tip Footer */}
          <div className="mt-6 rounded-2xl bg-teal-50/60 p-4 border border-teal-100 text-xs text-[#0d6e5a]">
            <span className="font-bold text-[#0c1a14] block">💡 Missed Dose Safety Reminder</span>
            If you miss a dose, take it as soon as you remember. If it is almost time for your next scheduled dose, skip the missed dose and resume your normal schedule. Never take double doses.
          </div>
        </div>
      </div>

      {/* ── PRINT-ONLY MEDICATION REGIMEN CARD ── */}
      <div className="hidden print:block print:p-6 print:bg-white text-black font-sans">
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">{brand.name} — Medication Regimen Card</h1>
            <p className="text-sm text-gray-700">Patient: {data.customerName}</p>
          </div>
          <div className="text-right text-xs">
            <p>Printed: {new Date().toLocaleDateString()}</p>
            <p>Emergency Hotline: +254 700 000 000</p>
          </div>
        </div>

        <h3 className="font-bold text-sm mb-2 uppercase tracking-wide">Daily Medication Dosing Plan</h3>
        <table className="w-full text-left text-xs border border-gray-300 mb-6">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="p-2">Time</th>
              <th className="p-2">Medication Name</th>
              <th className="p-2">Dosage Instructions</th>
              <th className="p-2">Special Notes</th>
            </tr>
          </thead>
          <tbody>
            {(selectedDay?.doses || []).map((d, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="p-2 font-mono font-bold">{d.timeOfDay}</td>
                <td className="p-2 font-bold">{d.medicineName}</td>
                <td className="p-2">{d.dosage || "Standard dose"}</td>
                <td className="p-2 text-gray-600">{d.label || "Take with water"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── DOSE NOTE MODAL ── */}
      {activeDoseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#e3ebe6]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#0c1a14]">
                Dose Log Note: {activeDoseModal.medicineName}
              </h3>
              <button
                onClick={() => setActiveDoseModal(null)}
                className="rounded-full p-1 text-[#8a9a92] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-1 text-xs text-[#5a6b62]">
              Dose slot: {selectedDay?.dateStr} at {activeDoseModal.timeOfDay}
            </p>

            <textarea
              value={doseNote}
              onChange={(e) => setDoseNote(e.target.value)}
              placeholder="e.g. Taken after lunch, mild dizziness noted..."
              rows={3}
              className="mt-4 w-full rounded-2xl border border-[#e3ebe6] p-3 text-xs text-[#0c1a14] focus:border-[#0d6e5a] focus:outline-none"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setActiveDoseModal(null)}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-[#5a6b62] hover:bg-[#f2f7f4]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleLogDose(
                    activeDoseModal.prescriptionId,
                    activeDoseModal.status === "pending"
                      ? "taken"
                      : (activeDoseModal.status as any),
                    activeDoseModal.timeOfDay
                  )
                }
                disabled={loggingStatus !== null}
                className="rounded-xl bg-[#0d6e5a] px-4 py-2 text-xs font-bold text-white hover:bg-[#095243]"
              >
                Save & Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
