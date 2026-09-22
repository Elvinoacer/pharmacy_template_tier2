"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { MedicationCounsellingProfile } from "@/app/lib/medication-counselling";
import {
  SPECIAL_DOSAGE_FORM_GUIDES,
  MEDICAL_DEVICE_GUIDES,
} from "@/app/lib/medication-counselling";
import {
  Pill,
  Clock,
  Calendar,
  Utensils,
  Thermometer,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Printer,
  Share2,
  PhoneCall,
  ExternalLink,
  Volume2,
  VolumeX,
  Lock,
  HeartPulse,
  Info,
  Check,
  Flame,
  LayoutGrid,
  FileText,
  AlertOctagon,
  ChevronRight,
} from "lucide-react";

export default function DigitalCounsellingCard({
  counselling,
  showFullActions = true,
}: {
  counselling: MedicationCounsellingProfile;
  showFullActions?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "leaflet">("grid");
  const [activeTab, setActiveTab] = useState<"pillars" | "device" | "form">("pillars");
  const [copiedShare, setCopiedShare] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speaking when unmounted or changed
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShare = () => {
    const fullGuideUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/health/counselling/${counselling.medicineKey}`
        : `/health/counselling/${counselling.medicineKey}`;

    const text = `📋 Digital Medication Counselling Leaflet for ${counselling.brandNames[0]} (${counselling.genericName})\n\n💊 How to take: ${counselling.howToTake.technique}\n⏰ When: ${counselling.whenToTake.bestTimeOfDay}\n🍽️ Food: ${counselling.foodAndDrink.summary}\n🌡️ Storage: ${counselling.storage.temperatureRange}\n⚠️ Key side effects: ${counselling.sideEffects.expected.map((s) => s.effect).join(", ")}\n🔄 Missed dose: ${counselling.missedDose.neverDoubleUpRule}\n\nFull guide: ${fullGuideUrl}`;

    if (navigator.share) {
      navigator
        .share({
          title: `${counselling.brandNames[0]} Counselling Leaflet`,
          text: text,
          url: typeof window !== "undefined" ? window.location.href : fullGuideUrl,
        })
        .catch(() => {
          navigator.clipboard?.writeText(text);
          setCopiedShare(true);
          setTimeout(() => setCopiedShare(false), 2500);
        });
    } else {
      navigator.clipboard?.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const toggleSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const narration = `Patient counselling summary for ${counselling.brandNames[0]}, ${counselling.genericName}. How to take: ${counselling.howToTake.technique}. When to take: ${counselling.whenToTake.bestTimeOfDay}. Food instruction: ${counselling.foodAndDrink.summary}. Storage: ${counselling.storage.temperatureRange}. If a dose is missed: ${counselling.missedDose.ruleOfThumb}. Golden safety rule: ${counselling.missedDose.neverDoubleUpRule}. Always complete your prescribed course. Consult our pharmacist if you have any questions.`;

    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const specialFormGuide = counselling.specialDosageForm
    ? SPECIAL_DOSAGE_FORM_GUIDES[counselling.specialDosageForm.guideId]
    : null;

  const deviceGuide = counselling.device
    ? MEDICAL_DEVICE_GUIDES[counselling.device.guideId]
    : null;

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-[var(--health-ui-border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition-all print:border-none print:shadow-none">
      {/* Luxury Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#063b31] via-[#0d6e5a] to-[#128a71] p-6 sm:p-8 text-white">
        {/* Subtle decorative background circles */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-md border border-white/10">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                Digital Clinical Leaflet
              </span>
              <span className="rounded-full bg-emerald-950/40 px-3 py-0.5 text-sm font-semibold text-emerald-200 border border-emerald-400/20">
                12-Pillar Standard
              </span>
              <span className="rounded-full bg-teal-900/60 px-3 py-0.5 text-sm font-semibold text-white">
                {counselling.categoryName}
              </span>
            </div>

            <h2
              className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {counselling.brandNames[0]}
              {counselling.genericName && counselling.genericName !== counselling.brandNames[0] && (
                <span className="ml-3 font-normal text-emerald-100 text-lg sm:text-2xl opacity-90">
                  ({counselling.genericName})
                </span>
              )}
            </h2>

            <p className="mt-2 text-sm sm:text-sm text-emerald-50 leading-relaxed max-w-xl">
              {counselling.standardDosageSummary}
            </p>
          </div>

          {showFullActions && (
            <div className="grid w-full grid-cols-1 gap-2 print:hidden sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={toggleSpeech}
                title="Read counselling aloud"
                className={`min-h-11 min-w-11 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition backdrop-blur-md ${
                  isSpeaking
                    ? "bg-amber-400 text-amber-950 font-bold shadow-md animate-pulse"
                    : "bg-white/15 text-white hover:bg-white/25 border border-white/10"
                }`}
              >
                {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{isSpeaking ? "Pause Narration" : "Listen (TTS)"}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="min-h-11 min-w-11 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition backdrop-blur-md border border-white/10"
              >
                {copiedShare ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copiedShare ? "Link Copied!" : "Share"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="min-h-11 min-w-11 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-teal-950 shadow-sm hover:bg-emerald-50 transition"
              >
                <Printer className="h-3.5 w-3.5 text-teal-800" />
                <span>Print Leaflet</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Toolbar & View Switcher */}
      <div className="grid grid-cols-1 gap-3 border-b border-[var(--health-ui-border)] bg-[var(--card-elev)] px-4 py-4 text-sm print:hidden sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("pillars")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
              activeTab === "pillars"
                ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                : "bg-[var(--card)] border border-[var(--health-ui-border)] text-[var(--muted)] hover:bg-[var(--card-elev)] hover:text-[var(--foreground)]"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            12-Pillar Guide
          </button>

          {specialFormGuide && (
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
                activeTab === "form"
                  ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                  : "bg-[var(--card)] border border-[var(--health-ui-border)] text-[var(--muted)] hover:bg-[var(--card-elev)] hover:text-[var(--foreground)]"
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
              {counselling.specialDosageForm?.formName} Technique
            </button>
          )}

          {deviceGuide && (
            <button
              type="button"
              onClick={() => setActiveTab("device")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
                activeTab === "device"
                  ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                  : "bg-[var(--card)] border border-[var(--health-ui-border)] text-[var(--muted)] hover:bg-[var(--card-elev)] hover:text-[var(--foreground)]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {counselling.device?.deviceName}
            </button>
          )}
        </div>

        {/* View Mode Toggle (Grid vs Leaflet) */}
        {activeTab === "pillars" && (
          <div className="flex items-center gap-1 rounded-xl border border-[var(--health-ui-border)] bg-[var(--card-elev)] p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold transition ${
                viewMode === "grid"
                  ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                  : "bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-elev)] hover:text-[var(--foreground)]"
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("leaflet")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold transition ${
                viewMode === "leaflet"
                  ? "bg-[var(--brand)] text-[var(--background)] shadow-xs"
                  : "bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--card-elev)] hover:text-[var(--foreground)]"
              }`}
            >
              <FileText className="h-3 w-3" />
              Document
            </button>
          </div>
        )}
      </div>

      {/* Main 12-Pillar Guide Body */}
      {activeTab === "pillars" && (
        <div className="p-6 sm:p-8 space-y-8">
          {/* Golden Rule Callout Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-amber-500/40 bg-amber-700/10 p-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-700 text-white font-bold shadow-xs">
                ⚠️
              </span>
              <div>
                <strong className="text-amber-950 dark:text-amber-200 font-bold text-sm block">
                  Golden Safety Rule: {counselling.missedDose.neverDoubleUpRule}
                </strong>
                <p className="mt-0.5 text-amber-900 dark:text-amber-300 leading-relaxed text-sm">
                  {counselling.missedDose.ruleOfThumb}
                </p>
              </div>
            </div>
            <Link
              href="/health/counselling"
              className="min-h-11 min-w-11 inline-flex items-center gap-1 rounded-full bg-amber-700/20 px-3 py-1 text-sm font-extrabold text-amber-900 dark:text-amber-200 hover:bg-amber-700/30 transition border border-amber-500/30"
            >
              Missed Dose Calculator →
            </Link>
          </div>

          {/* View Mode 1: High-End Interactive Card Grid */}
          {viewMode === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Pillar 1: How to take */}
              <PillarCard
                pillarNumber={1}
                title="How to Take"
                icon={<Pill className="h-4 w-4" />}
                accent="teal"
              >
                <p className="font-semibold text-teal-950 text-sm leading-relaxed">
                  {counselling.howToTake.technique}
                </p>
                <ul className="mt-3 space-y-2">
                  {counselling.howToTake.instructions.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#4a5b52]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
                {counselling.howToTake.swallowWholeWarning && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-2 text-sm font-bold text-amber-900">
                    ⚠️ Swallow whole — do NOT crush or chew.
                  </div>
                )}
              </PillarCard>

              {/* Pillar 2: When to take */}
              <PillarCard
                pillarNumber={2}
                title="When to Take"
                icon={<Clock className="h-4 w-4" />}
                accent="indigo"
              >
                <p className="font-semibold text-indigo-950 text-sm">
                  {counselling.whenToTake.bestTimeOfDay}
                </p>
                <p className="mt-2 text-sm text-[#4a5b52] leading-relaxed">
                  {counselling.whenToTake.circadianRationale}
                </p>
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2 text-sm text-indigo-950">
                  💡 <strong>Routine tip:</strong> {counselling.whenToTake.routineIntegrationTip}
                </div>
              </PillarCard>

              {/* Pillar 3: How often */}
              <PillarCard
                pillarNumber={3}
                title="How Often (Frequency)"
                icon={<Calendar className="h-4 w-4" />}
                accent="teal"
              >
                <p className="font-semibold text-teal-950 text-sm">
                  {counselling.howOftenToTake.frequencySchedule}
                </p>
                <p className="mt-2 text-sm text-[#4a5b52]">
                  Interval: <strong>{counselling.howOftenToTake.intervalHours}</strong>
                </p>
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/70 p-2 text-sm text-rose-950 font-medium">
                  🛑 <strong>Maximum Limit:</strong> {counselling.howOftenToTake.maxDailyDose}
                </div>
              </PillarCard>

              {/* Pillar 4: Food & Drink Rules */}
              <PillarCard
                pillarNumber={4}
                title="Food & Drink Instructions"
                icon={<Utensils className="h-4 w-4" />}
                accent="amber"
              >
                <div className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-sm font-extrabold uppercase tracking-wider text-amber-900 border border-amber-300">
                  {counselling.foodAndDrink.rule.replace(/_/g, " ")}
                </div>
                <p className="mt-2 font-semibold text-[#0c1a14] text-sm">
                  {counselling.foodAndDrink.summary}
                </p>
                <p className="mt-2 text-sm text-[#4a5b52] leading-relaxed">
                  {counselling.foodAndDrink.detailedGuidance}
                </p>
                <div className="mt-3 space-y-1 text-sm">
                  {counselling.foodAndDrink.grapefruitInteraction && (
                    <p className="text-rose-700 font-bold">🚫 Avoid Grapefruit juice (interacts with metabolism)</p>
                  )}
                  {counselling.foodAndDrink.dairyCalciumInteraction && (
                    <p className="text-amber-800 font-bold">🥛 Space dairy/calcium 2h apart (binding interaction)</p>
                  )}
                  <p className="text-[var(--health-editorial-body)]">🍷 {counselling.foodAndDrink.alcoholWarning}</p>
                </div>
              </PillarCard>

              {/* Pillar 5: How to store */}
              <PillarCard
                pillarNumber={5}
                title="Storage & Shelf-Life"
                icon={<Thermometer className="h-4 w-4" />}
                accent="cyan"
              >
                <p className="font-semibold text-cyan-950 text-sm">
                  {counselling.storage.temperatureRange}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {counselling.storage.refrigerationRequired ? (
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-sm font-extrabold text-blue-900">
                      ❄️ Refrigerate (2–8°C)
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-sm font-extrabold text-emerald-900">
                      🌡️ Room Temp (&lt; 25°C)
                    </span>
                  )}
                  {counselling.storage.inUseExpirationDays && (
                    <span className="rounded-md bg-purple-100 px-2 py-0.5 text-sm font-extrabold text-purple-900">
                      📅 Discard after {counselling.storage.inUseExpirationDays} days
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-[#4a5b52]">
                  {counselling.storage.homeLocationAdvice}
                </p>
              </PillarCard>

              {/* Pillar 6: Special Dosage Form */}
              <PillarCard
                pillarNumber={6}
                title="Special Formulation Technique"
                icon={<Sparkles className="h-4 w-4" />}
                accent="teal"
              >
                {counselling.specialDosageForm ? (
                  <div>
                    <span className="rounded-md bg-teal-100 px-2 py-0.5 text-sm font-extrabold text-teal-900">
                      {counselling.specialDosageForm.formName}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-[#0c1a14]">
                      {counselling.specialDosageForm.highlightedInstruction}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("form")}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-teal-800 hover:underline"
                    >
                      Open Full Step-by-Step Guide →
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--health-editorial-body)]">
                    Standard solid oral tablet/capsule formulation. Swallow with adequate water in an upright posture.
                  </p>
                )}
              </PillarCard>

              {/* Pillar 7: Expected Side Effects */}
              <PillarCard
                pillarNumber={7}
                title="Expected Side Effects & Red Flags"
                icon={<AlertTriangle className="h-4 w-4" />}
                accent="rose"
              >
                <div className="space-y-2">
                  <div className="space-y-2">
                    {counselling.sideEffects.expected.map((se, i) => (
                      <div key={i} className="rounded-lg bg-rose-50/60 p-2 text-sm border border-rose-100">
                        <p className="font-bold text-rose-950">{se.effect}</p>
                        <p className="mt-0.5 text-sm text-rose-800">{se.homeManagement}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-rose-300 bg-rose-100/60 p-3 text-sm text-rose-950">
                    <strong className="block font-bold">🚨 Emergency Red Flags:</strong>
                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                      {counselling.sideEffects.emergencyRedFlags.slice(0, 2).map((rf, i) => (
                        <li key={i}>{rf}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </PillarCard>

              {/* Pillar 8: Missed Dose Protocol */}
              <PillarCard
                pillarNumber={8}
                title="What To Do If Dose Is Missed"
                icon={<RotateCcw className="h-4 w-4" />}
                accent="indigo"
              >
                <p className="font-semibold text-indigo-950 text-sm">
                  {counselling.missedDose.ruleOfThumb}
                </p>
                <p className="mt-2 text-sm text-[#4a5b52] leading-relaxed">
                  {counselling.missedDose.specificScenarioGuidance}
                </p>
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm font-extrabold text-rose-950">
                  🛑 {counselling.missedDose.neverDoubleUpRule}
                </div>
              </PillarCard>

              {/* Pillar 9: Course Completion & AMR */}
              <PillarCard
                pillarNumber={9}
                title="Importance of Completing Course"
                icon={<ShieldCheck className="h-4 w-4" />}
                accent="purple"
              >
                <div className="inline-block rounded-full bg-purple-100 px-3 py-0.5 text-sm font-extrabold uppercase tracking-wider text-purple-900 border border-purple-300">
                  {counselling.courseCompletion.importance} Adherence
                </div>
                <p className="mt-2 font-semibold text-purple-950 text-sm">
                  {counselling.courseCompletion.rationale}
                </p>
                {counselling.courseCompletion.antimicrobialResistanceWarning && (
                  <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-2 text-sm text-purple-950 font-medium">
                    🛡️ <strong>AMR Protection:</strong> {counselling.courseCompletion.antimicrobialResistanceWarning}
                  </div>
                )}
              </PillarCard>

              {/* Pillar 10: Device Guide */}
              <PillarCard
                pillarNumber={10}
                title="Device Protocol"
                icon={<Sparkles className="h-4 w-4" />}
                accent="teal"
              >
                {counselling.device ? (
                  <div>
                    <span className="rounded-md bg-teal-100 px-2 py-0.5 text-sm font-extrabold text-teal-900">
                      {counselling.device.deviceName}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-[#0c1a14]">
                      {counselling.device.quickInstructions}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("device")}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-teal-800 hover:underline"
                    >
                      View Illustrated Device Protocol →
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--health-editorial-body)]">
                    No specialized medical device is required for this medication formulation.
                  </p>
                )}
              </PillarCard>

              {/* Pillar 11: Safe Handling & Disposal */}
              <PillarCard
                pillarNumber={11}
                title="Safe Handling & Disposal"
                icon={<Lock className="h-4 w-4" />}
                accent="teal"
              >
                <p className="text-sm font-semibold text-[#0c1a14]">
                  {counselling.safeHandling.safeDisposal}
                </p>
                <div className="mt-3 space-y-2 text-sm text-[#4a5b52]">
                  <p>🧼 {counselling.safeHandling.handHygiene}</p>
                  <p>🔒 {counselling.safeHandling.childProofing}</p>
                  <p className="text-rose-700 font-bold">🚫 {counselling.safeHandling.neverShareMessage}</p>
                </div>
              </PillarCard>

              {/* Pillar 12: When to Return */}
              <PillarCard
                pillarNumber={12}
                title="When to Return to Clinician"
                icon={<HeartPulse className="h-4 w-4" />}
                accent="rose"
              >
                <p className="text-sm font-semibold text-rose-950">
                  Improvement timeline: <strong>{counselling.whenToReturn.expectedImprovementTimeline}</strong>
                </p>
                <div className="mt-2 space-y-1 text-sm text-[#4a5b52]">
                  <p className="font-bold text-teal-900">👨‍⚕️ Pharmacist Review If:</p>
                  <ul className="list-disc list-inside text-sm space-y-0.5">
                    {counselling.whenToReturn.pharmacistConsultTriggers.slice(0, 2).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                  <p className="font-bold text-rose-900 mt-2">🚨 Doctor Emergency If:</p>
                  <ul className="list-disc list-inside text-sm text-rose-800 space-y-0.5">
                    {counselling.whenToReturn.doctorEmergencyTriggers.slice(0, 2).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              </PillarCard>
            </div>
          ) : (
            /* View Mode 2: Clean Formal Patient Leaflet Document */
            <div className="max-w-4xl mx-auto space-y-6 text-sm text-[var(--foreground)] leading-relaxed bg-[var(--card-elev)] p-6 sm:p-8 rounded-3xl border border-[var(--health-ui-border)]">
              <div className="border-b border-[var(--health-ui-border)] pb-4">
                <h3 className="text-lg font-bold text-[var(--foreground)]">
                  Clinical Patient Leaflet: {counselling.brandNames[0]} ({counselling.genericName})
                </h3>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  Standard 12-Pillar Medication Administration Protocol · Afyvia Pharmacy
                </p>
              </div>

              <div className="space-y-4 divide-y divide-[var(--health-ui-border)]">
                <LeafletRow title="1. How to take" content={counselling.howToTake.technique} />
                <LeafletRow title="2. When to take" content={`${counselling.whenToTake.bestTimeOfDay} — ${counselling.whenToTake.circadianRationale}`} />
                <LeafletRow title="3. Frequency" content={`${counselling.howOftenToTake.frequencySchedule}. Maximum daily cap: ${counselling.howOftenToTake.maxDailyDose}`} />
                <LeafletRow title="4. Food & drink" content={`${counselling.foodAndDrink.summary} ${counselling.foodAndDrink.detailedGuidance}`} />
                <LeafletRow title="5. Storage" content={`${counselling.storage.temperatureRange}. ${counselling.storage.homeLocationAdvice}`} />
                <LeafletRow title="6. Special dosage form" content={counselling.specialDosageForm ? `${counselling.specialDosageForm.formName}: ${counselling.specialDosageForm.highlightedInstruction}` : "Standard oral tablet/capsule."} />
                <LeafletRow title="7. Side effects" content={`Common: ${counselling.sideEffects.expected.map(e => e.effect).join(", ")}. Red flags: ${counselling.sideEffects.emergencyRedFlags.join("; ")}`} />
                <LeafletRow title="8. Missed dose" content={`${counselling.missedDose.ruleOfThumb} ${counselling.missedDose.neverDoubleUpRule}`} />
                <LeafletRow title="9. Course completion" content={`${counselling.courseCompletion.rationale} ${counselling.courseCompletion.antimicrobialResistanceWarning || ""}`} />
                <LeafletRow title="10. Device protocol" content={counselling.device ? `${counselling.device.deviceName}: ${counselling.device.quickInstructions}` : "None required."} />
                <LeafletRow title="11. Safe handling" content={`${counselling.safeHandling.safeDisposal} ${counselling.safeHandling.neverShareMessage}`} />
                <LeafletRow title="12. Clinician return" content={`Expected recovery in ${counselling.whenToReturn.expectedImprovementTimeline}. Triggers: ${counselling.whenToReturn.pharmacistConsultTriggers.join(", ")}`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Special Dosage Form Tab */}
      {activeTab === "form" && specialFormGuide && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5">
            <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-base">
              <Pill className="h-5 w-5 text-[var(--brand)]" />
              {specialFormGuide.title}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">
              {specialFormGuide.shortDescription}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-[var(--foreground)]">Step-by-Step Technique:</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {specialFormGuide.steps.map((st) => (
                <div key={st.stepNumber} className="rounded-2xl border border-[var(--health-ui-border)] bg-[var(--card)] p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">
                      {st.stepNumber}
                    </span>
                    <h5 className="font-bold text-sm text-[var(--foreground)]">{st.title}</h5>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{st.instruction}</p>
                  {st.keyNote && (
                    <p className="mt-2 rounded-lg bg-teal-500/10 px-2 py-1 text-sm font-semibold text-[var(--foreground)] border border-teal-500/20">
                      💡 {st.keyNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <h5 className="font-bold text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Essential Do&apos;s
              </h5>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
                {specialFormGuide.crucialDoList.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <h5 className="font-bold text-sm text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-rose-600" /> Crucial Don&apos;ts
              </h5>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
                {specialFormGuide.crucialDontList.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Device Tab */}
      {activeTab === "device" && deviceGuide && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-base">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              {deviceGuide.title}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">
              {deviceGuide.shortDescription}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm text-[var(--foreground)]">Device Step-by-Step Instructions:</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {deviceGuide.steps.map((st) => (
                <div key={st.stepNumber} className="rounded-2xl border border-[var(--health-ui-border)] bg-[var(--card)] p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-700 text-sm font-bold text-white">
                      {st.stepNumber}
                    </span>
                    <h5 className="font-bold text-sm text-[var(--foreground)]">{st.title}</h5>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{st.instruction}</p>
                  {st.keyNote && (
                    <p className="mt-2 rounded-lg bg-cyan-500/10 px-2 py-1 text-sm font-semibold text-[var(--foreground)] border border-cyan-500/20">
                      💡 {st.keyNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PillarCard({
  pillarNumber,
  title,
  icon,
  accent,
  children,
}: {
  pillarNumber: number;
  title: string;
  icon: React.ReactNode;
  accent: "teal" | "indigo" | "amber" | "cyan" | "rose" | "purple";
  children: React.ReactNode;
}) {
  const accentStyles = {
    teal: "border-teal-500/30 bg-teal-500/5 hover:border-teal-500/60",
    indigo: "border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60",
    amber: "border-amber-500/30 bg-amber-700/5 hover:border-amber-500/60",
    cyan: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60",
    rose: "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60",
    purple: "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60",
  };

  const badgeStyles = {
    teal: "bg-teal-700 text-white",
    indigo: "bg-indigo-700 text-white",
    amber: "bg-amber-600 text-white",
    cyan: "bg-cyan-700 text-white",
    rose: "bg-rose-700 text-white",
    purple: "bg-purple-700 text-white",
  };

  return (
    <div className={`group rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:shadow-md ${accentStyles[accent]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-sm font-black shadow-xs ${badgeStyles[accent]}`}>
            {pillarNumber}
          </span>
          <h3 className="font-bold text-[var(--foreground)] text-sm sm:text-sm">{title}</h3>
        </div>
        <span className="text-[var(--muted)] group-hover:scale-110 transition">{icon}</span>
      </div>
      <div className="mt-3 text-[var(--muted)]">{children}</div>
    </div>
  );
}

function LeafletRow({ title, content }: { title: string; content: string }) {
  return (
    <div className="grid gap-2 pt-3 sm:grid-cols-12">
      <div className="font-bold text-[var(--brand)] sm:col-span-4">{title}</div>
      <div className="text-[var(--foreground)] sm:col-span-8">{content}</div>
    </div>
  );
}
