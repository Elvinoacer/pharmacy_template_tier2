"use client";

import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Calendar,
  Pill,
  Activity,
  PhoneCall,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { pharmacy } from "@/app/lib/data";

type DosingSchedule =
  | "once_daily"
  | "twice_daily"
  | "three_times_daily"
  | "four_times_daily"
  | "antibiotic"
  | "oral_contraceptive"
  | "insulin"
  | "prn";

const SCHEDULE_PRESETS: Array<{
  id: DosingSchedule;
  title: string;
  subtitle: string;
  interval: string;
  icon: string;
}> = [
  { id: "once_daily", title: "Once Daily (QD)", subtitle: "Every 24 hours (e.g. BP, Cholesterol)", interval: "24 hours", icon: "🌅" },
  { id: "twice_daily", title: "Twice Daily (BID)", subtitle: "Every 12 hours (e.g. Metformin, Heart meds)", interval: "12 hours", icon: "🌓" },
  { id: "three_times_daily", title: "3x Daily (TID)", subtitle: "Every 8 hours (e.g. Amoxicillin)", interval: "8 hours", icon: "🕒" },
  { id: "four_times_daily", title: "4x Daily (QID)", subtitle: "Every 6 hours (e.g. Pain, Eye drops)", interval: "6 hours", icon: "⚡" },
  { id: "antibiotic", title: "Antibiotic Course", subtitle: "Strict time-dependent bacterial killing", interval: "8–12 hours", icon: "🛡️" },
  { id: "oral_contraceptive", title: "Contraceptive Pill", subtitle: "Combined or Mini-Pill", interval: "24 hours", icon: "🌸" },
  { id: "insulin", title: "Insulin / Injectable", subtitle: "Basal long-acting or bolus with meals", interval: "Variable", icon: "💉" },
  { id: "prn", title: "As Needed (PRN)", subtitle: "Pain relief, allergies, antacids", interval: "PRN", icon: "💊" },
];

export default function MissedDoseCalculator() {
  const [schedule, setSchedule] = useState<DosingSchedule>("once_daily");
  const [hoursAgo, setHoursAgo] = useState<number>(3);
  const [hoursUntilNext, setHoursUntilNext] = useState<number>(9);

  const activePreset = useMemo(() => {
    return SCHEDULE_PRESETS.find((s) => s.id === schedule) || SCHEDULE_PRESETS[0];
  }, [schedule]);

  const advice = useMemo(() => {
    switch (schedule) {
      case "once_daily": {
        if (hoursAgo <= 12 && hoursUntilNext >= 6) {
          return {
            status: "take_now" as const,
            tone: "good" as const,
            badge: "🟢 Safe to Take Missed Dose Now",
            title: "Take Your Missed Dose Now",
            advice: "Since less than 12 hours have passed and your next scheduled dose is more than 6 hours away, take your missed dose as soon as possible. Resume your regular schedule tomorrow.",
            rules: [
              "Take the missed tablet now with a full glass of water (and food if required).",
              "Take tomorrow's scheduled dose at your regular time.",
              "NEVER take two doses together tomorrow to 'catch up'.",
            ],
          };
        } else {
          return {
            status: "skip" as const,
            tone: "warn" as const,
            badge: "🔴 Skip Missed Dose & Wait for Next",
            title: "Skip This Dose Completely",
            advice: "Since you are close to your next scheduled dose (less than 6 hours away), SKIP the missed dose completely. Taking it now would cause dangerous drug accumulation.",
            rules: [
              "Do not take a double dose at your next scheduled time.",
              "Take your next dose at the regular scheduled time tomorrow.",
              "Set a daily phone alarm to stay on track.",
            ],
          };
        }
      }

      case "twice_daily": {
        if (hoursAgo <= 4 && hoursUntilNext >= 4) {
          return {
            status: "take_now" as const,
            tone: "good" as const,
            badge: "🟢 Safe to Take Now",
            title: "Take Your Missed Dose Now",
            advice: "Take your missed dose now. If your next dose is within 4–6 hours, you can push the next dose by 1–2 hours to maintain safe interval spacing.",
            rules: [
              "Take the single missed dose immediately.",
              "Space your following dose by at least 6 to 8 hours.",
              "Never take two doses together.",
            ],
          };
        } else {
          return {
            status: "skip" as const,
            tone: "warn" as const,
            badge: "🔴 Skip & Wait for Next 12h Slot",
            title: "Skip This Dose",
            advice: "It is too close to your next 12-hour dose (within 4 hours). Skip the missed dose and resume on schedule.",
            rules: [
              "Skip the forgotten tablet.",
              "Take only ONE dose at your next scheduled slot.",
              "Double-dosing can cause blood pressure crashes or hypoglycemic shock.",
            ],
          };
        }
      }

      case "three_times_daily":
      case "four_times_daily": {
        if (hoursAgo <= 2 && hoursUntilNext >= 3) {
          return {
            status: "take_now" as const,
            tone: "good" as const,
            badge: "🟢 Take Now (Within 2-Hour Window)",
            title: "Take Missed Dose Immediately",
            advice: "Take the missed dose now, and slightly space out your next dose if needed.",
            rules: [
              "Take now with a light snack or water.",
              "Ensure at least 3 to 4 hours elapse before taking your next dose.",
            ],
          };
        } else {
          return {
            status: "skip" as const,
            tone: "warn" as const,
            badge: "🔴 Skip Missed Dose",
            title: "Skip and Wait for Next Slot",
            advice: "For frequent 6-to-8 hour dosing schedules, taking pills too close together causes toxic drug peaks. Skip the missed dose.",
            rules: [
              "Skip the missed dose entirely.",
              "Resume on-time with your next scheduled slot.",
              "Never take 2 pills together.",
            ],
          };
        }
      }

      case "antibiotic": {
        return {
          status: "take_now" as const,
          tone: "good" as const,
          badge: "🟢 Antibiotic Rule: Take As Soon As Remembered",
          title: "Take Missed Antibiotic Immediately",
          advice: "Antibiotics require consistent blood concentrations to kill bacteria. If you remember midway through your interval, take it now. If your next dose is due within 2 hours, skip and extend your course by one dose at the end.",
          rules: [
            "Take the missed dose now unless within 2 hours of next scheduled dose.",
            "Never double up pills.",
            "Finish every single remaining dose in the bottle to prevent superbug antibiotic resistance (AMR).",
          ],
        };
      }

      case "oral_contraceptive": {
        return {
          status: "caution" as const,
          tone: "special" as const,
          badge: "🌸 Contraceptive Hormone Protocol",
          title: "Birth Control Pill Protocol",
          advice: "For combined pills: If 1 pill is missed (< 24h late), take it as soon as remembered (even if taking 2 pills in one day), and continue the pack. Contraceptive efficacy is preserved.",
          rules: [
            "1 pill missed: Take missed pill now + today's regular pill. No backup needed.",
            "2 or more pills missed: Take most recent missed pill now, continue pack, and USE CONDOMS (backup protection) for 7 consecutive days.",
            "Progestin-only Mini-Pill (POP): If > 3 hours late, take now and use condoms for 48 hours.",
          ],
        };
      }

      case "insulin": {
        return {
          status: "caution" as const,
          tone: "special" as const,
          badge: "💉 Test Blood Sugar Immediately",
          title: "Check Blood Glucose Before Dosing",
          advice: "For missed insulin, your action depends on insulin type (Basal vs Rapid-Acting). NEVER inject blind without checking blood sugar.",
          rules: [
            "TEST BLOOD SUGAR IMMEDIATELY with your glucometer.",
            "Basal (Long-acting / Glargine): If remembered within a few hours, take normal dose. If > 12h late, take half dose or call pharmacist.",
            "Rapid-acting (with meals): If you forgot during a meal, take immediately after eating. If 2+ hours after meal, test blood sugar first.",
            "Never double your insulin dose (extreme hypoglycemia risk).",
          ],
        };
      }

      case "prn": {
        return {
          status: "skip" as const,
          tone: "info" as const,
          badge: "💊 As-Needed (PRN) Symptom Relief",
          title: "Take Only If Symptoms Are Present",
          advice: "As-needed medicines (pain relievers, allergy pills, antacids) are only taken when you experience active symptoms. If you have no symptoms, skip the dose completely.",
          rules: [
            "If in pain or feverish: check that at least 4 to 6 hours have passed since your previous dose before taking another tablet.",
            "Never exceed the 24-hour maximum cap printed on the label.",
          ],
        };
      }
    }
  }, [schedule, hoursAgo, hoursUntilNext]);

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--health-ui-border)] bg-white shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0c1a14] via-[#1b382b] to-[#0d6e5a] p-6 text-white sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-400/20 px-3 py-0.5 text-sm font-bold uppercase tracking-wider text-emerald-200 border border-emerald-400/30">
                Interactive Decision Engine
              </span>
              <span className="rounded-full bg-white/10 px-3 py-0.5 text-sm font-semibold text-emerald-100">
                Clinical Safety Algorithm
              </span>
            </div>
            <h3
              className="mt-2 text-xl font-bold sm:text-2xl text-white"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Missed-Dose Decision Assistant
            </h3>
            <p className="mt-1 text-sm text-emerald-100">
              Select your medication dosing frequency and time elapsed to calculate instant clinical guidance.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-emerald-200 border border-white/10">
            <Zap className="h-4 w-4 text-emerald-300" />
            Instant Pharmacist Decision
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Step 1: Dosing Schedule Selection Chips */}
        <div>
          <label className="block text-sm font-bold text-[#0c1a14] uppercase tracking-wider">
            1. Select Medication Frequency Schedule
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SCHEDULE_PRESETS.map((preset) => {
              const isSelected = schedule === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() = className="min-h-11 min-w-11"> setSchedule(preset.id)}
                  className={`text-left rounded-2xl p-4 border transition-all duration-150 ${
                    isSelected
                      ? "border-teal-700 bg-teal-50/80 shadow-xs ring-1 ring-teal-700"
                      : "border-[var(--health-ui-border)] bg-[#fbfdfb] hover:border-teal-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{preset.icon}</span>
                    <p className="font-bold text-sm text-[#0c1a14] truncate">{preset.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--health-editorial-body)] leading-tight line-clamp-2">
                    {preset.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Time Slider Controls (For Fixed Schedules) */}
        {schedule !== "antibiotic" && schedule !== "oral_contraceptive" && schedule !== "insulin" && schedule !== "prn" && (
          <div className="rounded-2xl border border-[var(--health-ui-border)] bg-[#f8faf9] p-5 sm:p-6 space-y-6">
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-bold text-[#0c1a14]">
                  2. How many hours ago was your dose due?
                </label>
                <span className="rounded-full bg-teal-800 px-3 py-0.5 text-sm font-black text-white">
                  {hoursAgo} {hoursAgo === 1 ? "hour" : "hours"} ago
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={hoursAgo}
                onChange={(e) = className="min-h-11 min-w-11"> setHoursAgo(Number(e.target.value))}
                className="mt-3 w-full accent-teal-800 cursor-pointer"
              />
              <div className="flex justify-between text-sm text-[var(--muted)] font-semibold mt-1">
                <span>1 hour (Just missed)</span>
                <span>6 hours</span>
                <span>12 hours</span>
                <span>20 hours (Very late)</span>
              </div>
            </div>

            <div className="border-t border-[var(--health-ui-border)] pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-bold text-[#0c1a14]">
                  3. In how many hours is your NEXT scheduled dose due?
                </label>
                <span className="rounded-full bg-teal-800 px-3 py-0.5 text-sm font-black text-white">
                  In {hoursUntilNext} {hoursUntilNext === 1 ? "hour" : "hours"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={hoursUntilNext}
                onChange={(e) = className="min-h-11 min-w-11"> setHoursUntilNext(Number(e.target.value))}
                className="mt-3 w-full accent-teal-800 cursor-pointer"
              />
              <div className="flex justify-between text-sm text-[var(--muted)] font-semibold mt-1">
                <span>1 hour (Imminent next dose)</span>
                <span>6 hours</span>
                <span>12 hours</span>
                <span>24 hours</span>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Visual Decision Output Card */}
        <div
          className={`rounded-3xl border-2 p-6 sm:p-7 shadow-sm transition-all ${
            advice.tone === "good"
              ? "border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30"
              : advice.tone === "warn"
              ? "border-rose-300 bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30"
              : "border-purple-300 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
            <span
              className={`rounded-full px-4 py-1 text-sm font-black uppercase tracking-wider ${
                advice.tone === "good"
                  ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                  : advice.tone === "warn"
                  ? "bg-rose-100 text-rose-950 border border-rose-300"
                  : "bg-purple-100 text-purple-950 border border-purple-300"
              }`}
            >
              {advice.badge}
            </span>

            <span className="text-sm text-[var(--health-editorial-body)] font-semibold">
              Selected: <strong>{activePreset.title}</strong>
            </span>
          </div>

          <div className="mt-4">
            <h4
              className={`text-lg sm:text-xl font-extrabold ${
                advice.tone === "good"
                  ? "text-emerald-950"
                  : advice.tone === "warn"
                  ? "text-rose-950"
                  : "text-purple-950"
              }`}
            >
              {advice.title}
            </h4>

            <p className="mt-2 text-sm sm:text-sm leading-relaxed text-[#2c3e35] font-medium">
              {advice.advice}
            </p>

            <div className="mt-4 rounded-2xl bg-white/90 p-4 border border-black/5 space-y-2">
              <p className="text-sm font-bold text-[#0c1a14]">Required Safety Action Steps:</p>
              <ul className="space-y-2">
                {advice.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#2c3e35]">
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        advice.tone === "good"
                          ? "text-emerald-700"
                          : advice.tone === "warn"
                          ? "text-rose-700"
                          : "text-purple-700"
                      }`}
                    />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Pharmacist Phone Assistance CTA */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4 text-sm text-[var(--health-editorial-body)]">
            <span>Still unsure or experiencing adverse symptoms?</span>
            <a
              href={`tel:${pharmacy.phone}`}
              className="min-h-11 min-w-11 inline-flex items-center gap-2 font-bold text-teal-900 hover:underline"
            >
              <PhoneCall className="h-3.5 w-3.5 text-teal-700" />
              Call Pharmacist ({pharmacy.phone})
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
