"use client";

import React, { useState, useMemo } from "react";
import {
  SPECIAL_DOSAGE_FORM_GUIDES,
  MEDICAL_DEVICE_GUIDES,
  type DosageFormGuideType,
  type DeviceGuideType,
} from "@/app/lib/medication-counselling";
import {
  Wind,
  Eye,
  Ear,
  Layers,
  Shield,
  Activity,
  HeartPulse,
  Cloud,
  AlertTriangle,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  Beaker,
  Smile,
  Coffee,
  Check,
} from "lucide-react";

export default function DeviceDosageViewer({
  initialType = "dosage_forms",
  selectedFormId = "inhaler_mdi",
  selectedDeviceId = "spacer",
}: {
  initialType?: "dosage_forms" | "devices";
  selectedFormId?: DosageFormGuideType;
  selectedDeviceId?: DeviceGuideType;
}) {
  const [guideCategory, setGuideCategory] = useState<"dosage_forms" | "devices">(initialType);
  const [activeFormId, setActiveFormId] = useState<DosageFormGuideType>(selectedFormId);
  const [activeDeviceId, setActiveDeviceId] = useState<DeviceGuideType>(selectedDeviceId);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const activeGuide = useMemo(() => {
    if (guideCategory === "dosage_forms") {
      return SPECIAL_DOSAGE_FORM_GUIDES[activeFormId] || SPECIAL_DOSAGE_FORM_GUIDES.inhaler_mdi;
    }
    return MEDICAL_DEVICE_GUIDES[activeDeviceId] || MEDICAL_DEVICE_GUIDES.spacer;
  }, [guideCategory, activeFormId, activeDeviceId]);

  // Reset active step when changing guide
  const handleSelectGuide = (id: string) => {
    if (guideCategory === "dosage_forms") {
      setActiveFormId(id as DosageFormGuideType);
    } else {
      setActiveDeviceId(id as DeviceGuideType);
    }
    setActiveStepIndex(0);
    setCompletedSteps({});
  };

  const currentStep = activeGuide.steps[activeStepIndex] || activeGuide.steps[0];
  const totalSteps = activeGuide.steps.length;

  const toggleStepCompleted = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-[#cfe0d8] bg-white shadow-sm">
      {/* Category Tabs */}
      <div className="bg-[#0c1a14] p-4 sm:p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-emerald-400/20 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200 border border-emerald-400/30">
              Interactive Technique Masterclass
            </span>
            <h3
              className="mt-1.5 text-xl font-bold sm:text-2xl text-white"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Dosage Forms &amp; Medical Devices Mastery
            </h3>
            <p className="mt-0.5 text-xs text-emerald-100/80">
              Up to 70% of medication errors happen due to technique mistakes. Master proper administration:
            </p>
          </div>

          <div className="flex items-center rounded-2xl bg-white/10 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setGuideCategory("dosage_forms");
                setActiveStepIndex(0);
                setCompletedSteps({});
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                guideCategory === "dosage_forms"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              💊 11 Dosage Forms
            </button>
            <button
              type="button"
              onClick={() => {
                setGuideCategory("devices");
                setActiveStepIndex(0);
                setCompletedSteps({});
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                guideCategory === "devices"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              🩺 7 Medical Devices
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-12">
        {/* Left Side Selection List */}
        <div className="border-b lg:border-b-0 lg:border-r border-[#e3ebe6] bg-[#f8faf9] p-4 sm:p-5 lg:col-span-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#5a6b62] px-2 mb-3">
            {guideCategory === "dosage_forms" ? "Select Dosage Formulation:" : "Select Medical Device:"}
          </p>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {guideCategory === "dosage_forms"
              ? Object.entries(SPECIAL_DOSAGE_FORM_GUIDES).map(([id, guide]) => {
                  const isSelected = activeFormId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectGuide(id)}
                      className={`w-full text-left rounded-2xl p-3 transition flex items-center justify-between border ${
                        isSelected
                          ? "border-teal-700 bg-teal-50/90 shadow-xs font-bold text-teal-950"
                          : "border-transparent bg-white hover:border-[#cfe0d8] text-[#2c3e35]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold truncate">{guide.title}</p>
                        <p className="text-[10px] text-[#5a6b62] truncate mt-0.5">
                          {guide.steps.length} verified clinical steps
                        </p>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition ${
                          isSelected ? "text-teal-800 translate-x-0.5" : "text-[#8a9a92]"
                        }`}
                      />
                    </button>
                  );
                })
              : Object.entries(MEDICAL_DEVICE_GUIDES).map(([id, guide]) => {
                  const isSelected = activeDeviceId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectGuide(id)}
                      className={`w-full text-left rounded-2xl p-3 transition flex items-center justify-between border ${
                        isSelected
                          ? "border-teal-700 bg-teal-50/90 shadow-xs font-bold text-teal-950"
                          : "border-transparent bg-white hover:border-[#cfe0d8] text-[#2c3e35]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold truncate">{guide.title}</p>
                        <p className="text-[10px] text-[#5a6b62] truncate mt-0.5">
                          {guide.steps.length} verified clinical steps
                        </p>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition ${
                          isSelected ? "text-teal-800 translate-x-0.5" : "text-[#8a9a92]"
                        }`}
                      />
                    </button>
                  );
                })}
          </div>
        </div>

        {/* Right Side Step-by-Step Viewer */}
        <div className="p-6 sm:p-8 lg:col-span-8 space-y-6">
          {/* Active Guide Title */}
          <div className="border-b border-[#e3ebe6] pb-4">
            <h4
              className="text-xl font-bold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {activeGuide.title}
            </h4>
            <p className="mt-1 text-xs text-[#5a6b62] leading-relaxed">
              {activeGuide.shortDescription}
            </p>
          </div>

          {/* Interactive Step Carousel Tracker */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0c1a14]">
                Step {activeStepIndex + 1} of {totalSteps}
              </span>
              <span className="text-xs text-[#5a6b62]">
                {Object.values(completedSteps).filter(Boolean).length}/{totalSteps} steps completed
              </span>
            </div>

            {/* Step Progress Circles */}
            <div className="flex items-center gap-1.5">
              {activeGuide.steps.map((st, idx) => {
                const isActive = idx === activeStepIndex;
                const isDone = Boolean(completedSteps[idx]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveStepIndex(idx)}
                    className={`flex-1 h-2.5 rounded-full transition-all duration-200 ${
                      isActive
                        ? "bg-teal-700 ring-2 ring-teal-300"
                        : isDone
                        ? "bg-emerald-500"
                        : "bg-[#e3ebe6] hover:bg-[#cfe0d8]"
                    }`}
                    title={`Go to Step ${idx + 1}: ${st.title}`}
                  />
                );
              })}
            </div>

            {/* Active Step Card */}
            <div className="rounded-3xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/50 via-white to-teal-50/20 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-800 text-sm font-extrabold text-white shadow-xs">
                    {currentStep.stepNumber}
                  </span>
                  <h5 className="font-extrabold text-base text-[#0c1a14]">{currentStep.title}</h5>
                </div>

                <button
                  type="button"
                  onClick={() => toggleStepCompleted(activeStepIndex)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                    completedSteps[activeStepIndex]
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "border border-[#cfe0d8] bg-white text-[#5a6b62] hover:bg-slate-50"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {completedSteps[activeStepIndex] ? "Step Done" : "Mark Done"}
                </button>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-[#2c3e35]">
                {currentStep.instruction}
              </p>

              {currentStep.keyNote && (
                <div className="rounded-2xl border border-teal-200 bg-white p-3.5 text-xs text-teal-950 font-medium flex items-start gap-2 shadow-2xs">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    <strong>Pharmacist Clinical Key:</strong> {currentStep.keyNote}
                  </div>
                </div>
              )}

              {/* Prev / Next Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-teal-100">
                <button
                  type="button"
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1 text-xs font-bold text-teal-900 disabled:opacity-30 disabled:pointer-events-none hover:underline"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous Step
                </button>

                <button
                  type="button"
                  disabled={activeStepIndex === totalSteps - 1}
                  onClick={() => setActiveStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
                  className="flex items-center gap-1 rounded-full bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-900 transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  Next Step <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Do and Donts Comparative Grid */}
          {"crucialDoList" in activeGuide && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                <h6 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Essential Do&apos;s
                </h6>
                <ul className="mt-2 space-y-1.5 text-xs text-emerald-900">
                  {(activeGuide as any).crucialDoList.map((d: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
                <h6 className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-rose-700" /> Crucial Don&apos;ts
                </h6>
                <ul className="mt-2 space-y-1.5 text-xs text-rose-900">
                  {(activeGuide as any).crucialDontList.map((d: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {"safetyWarnings" in activeGuide && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs">
              <h6 className="font-bold text-amber-950 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-700" /> Device Safety Warnings &amp; Ranges:
              </h6>
              <ul className="mt-2 space-y-1 text-amber-900">
                {(activeGuide as any).safetyWarnings.map((w: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
