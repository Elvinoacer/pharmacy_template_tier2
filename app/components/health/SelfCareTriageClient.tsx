"use client";

import { useState, useMemo } from "react";
import { useTenantHref } from "../TenantLink";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  Pill,
  Home,
  ChevronRight,
  Filter,
  Check,
  HelpCircle,
  Stethoscope,
  PhoneCall,
  Share2,
  Copy,
} from "lucide-react";
import {
  SELF_CARE_CONDITIONS_DATA,
  OTC_CATEGORIES_GUIDANCE,
  type SelfCareCondition,
} from "@/app/lib/otc-guidance";
import { pharmacy } from "@/app/lib/data";

const CATEGORY_EMOJIS: Record<string, string> = {
  "pain-relief": "🧠",
  "cold-flu": "🫁",
  "allergy-treatments": "🌿",
  "digestive-health": "🫄",
  "first-aid": "🩹",
  "topical-treatments": "🧴",
  "skin-care": "✨",
  antiseptics: "🧪",
  "wound-care": "🩹",
  "oral-care": "👄",
  "feminine-hygiene": "🌸",
  "baby-care": "👶",
  "medical-consumables": "🩺",
  "nutritional-products": "⚡",
};

export default function SelfCareTriageClient() {
  const contactHref = useTenantHref("/contact");
  const [activeTab, setActiveTab] = useState<"matrix" | "quiz">("matrix");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeConditionId, setActiveConditionId] = useState<string>(
    SELF_CARE_CONDITIONS_DATA[0]?.id || ""
  );
  const [copied, setCopied] = useState(false);

  // Quick Screener Quiz state
  const [quizSeverity, setQuizSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [quizDuration, setQuizDuration] = useState<"short" | "medium" | "long">("short");
  const [quizRedFlags, setQuizRedFlags] = useState<boolean>(false);
  const [quizSpecialPop, setQuizSpecialPop] = useState<boolean>(false);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of SELF_CARE_CONDITIONS_DATA) {
      map.set(c.categorySlug, c.categoryName);
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, []);

  const filteredConditions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return SELF_CARE_CONDITIONS_DATA.filter((cond) => {
      const matchesCategory =
        selectedCategory === "all" || cond.categorySlug === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        cond.conditionName.toLowerCase().includes(q) ||
        cond.description.toLowerCase().includes(q) ||
        cond.selfCareSigns.some((s) => s.toLowerCase().includes(q)) ||
        cond.recommendedOtcTypes.some((r) => r.toLowerCase().includes(q)) ||
        cond.emergencyRedFlags.some((e) => e.toLowerCase().includes(q))
      );
    });
  }, [searchTerm, selectedCategory]);

  const activeCondition: SelfCareCondition | undefined = useMemo(() => {
    return (
      filteredConditions.find((c) => c.id === activeConditionId) ||
      filteredConditions[0] ||
      SELF_CARE_CONDITIONS_DATA[0]
    );
  }, [filteredConditions, activeConditionId]);

  const activeCategoryGuidance = activeCondition
    ? OTC_CATEGORIES_GUIDANCE[activeCondition.categorySlug]
    : null;

  // Compute Quick Quiz Triage Outcome
  const quizOutcome = useMemo(() => {
    if (quizRedFlags || quizSeverity === "severe") {
      return {
        tier: 3,
        badge: "🔴 Emergency / Urgent Care",
        title: "Seek Immediate Medical Attention",
        bg: "border-rose-300 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 text-rose-950",
        btnColor: "bg-rose-600 hover:bg-rose-700 text-white",
        desc: "Your symptoms indicate potential red-flag warning signs or severe intensity. Do not attempt home self-care. Please proceed to an emergency department or urgent care facility immediately.",
        actionUrl: "/contact",
        actionText: "Emergency Contacts & Directions",
      };
    }
    if (quizDuration === "long" || quizSeverity === "moderate" || quizSpecialPop) {
      return {
        tier: 2,
        badge: "🟡 Pharmacist / GP Review",
        title: "Consult a Pharmacist or Doctor",
        bg: "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 text-amber-950",
        btnColor: "bg-amber-700 hover:bg-amber-800 text-white",
        desc: "Symptoms lasting over 7 days, moderate discomfort, or patients with underlying conditions/pregnancy should be evaluated by a healthcare professional before starting or continuing OTC treatments.",
        actionUrl: "/contact",
        actionText: "Talk to a Pharmacist",
      };
    }
    return {
      tier: 1,
      badge: "🟢 Safe for OTC Self-Care",
      title: "Appropriate for Home Self-Care",
      bg: "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 text-emerald-950",
      btnColor: "bg-teal-800 hover:bg-teal-900 text-white",
      desc: "Mild, short-term symptoms without red flags are suitable for home self-care with non-prescription OTC products, rest, and hydration. Re-evaluate if not improved within 3–7 days.",
      actionUrl: "/medicines",
      actionText: "Browse Recommended OTC Medicines",
    };
  }, [quizSeverity, quizDuration, quizRedFlags, quizSpecialPop]);

  const copySummary = () => {
    if (!activeCondition) return;
    const text = `Afyvia Pharmacy Self-Care Guidance for ${activeCondition.conditionName}:\n\n` +
      `🟢 Self-Care Appropriate: ${activeCondition.selfCareSigns.join(", ")}\n` +
      `💊 Recommended OTC: ${activeCondition.recommendedOtcTypes.join(", ")}\n` +
      `🟡 Consult Pharmacist if: ${activeCondition.pharmacistConsultTriggers.join(", ")}\n` +
      `🔴 Seek Immediate Care (Red Flags): ${activeCondition.emergencyRedFlags.join(", ")}\n` +
      `Expected Recovery: ${activeCondition.expectedRecovery}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Top Switcher: Interactive Quiz vs. Condition Explorer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-[#d2dfd8] bg-white p-2.5 shadow-sm">
        <div className="flex w-full sm:w-auto items-center p-1 bg-[#f0faf6] rounded-2xl border border-[#0d6e5a]/15">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "matrix"
                ? "bg-teal-800 text-white shadow-sm"
                : "text-[#084c3f] hover:text-teal-900"
            }`}
          >
            <Stethoscope className="h-3.5 w-3.5" /> Condition & Symptom Library
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "quiz"
                ? "bg-teal-800 text-white shadow-sm"
                : "text-[#084c3f] hover:text-teal-900"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" /> 30-Second Self-Care Quiz
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#5a6b62] px-3">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Licensed Pharmacist Clinical Protocols</span>
        </div>
      </div>

      {/* VIEW A: 30-Second Interactive Self-Care Quiz */}
      {activeTab === "quiz" && (
        <div className="rounded-3xl border border-[#0d6e5a]/20 bg-white p-6 md:p-8 shadow-sm space-y-8">
          <div>
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
              Interactive Triage Screener
            </span>
            <h2
              className="mt-2 text-2xl font-bold text-[#0c1a14] md:text-3xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Is Your Symptom Safe for Home Self-Care?
            </h2>
            <p className="mt-1 text-sm text-[#5a6b62]">
              Answer 4 quick clinical questions to determine whether you should use OTC medicine or seek professional care.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Questions Left */}
            <div className="space-y-6">
              {/* Question 1: Severity */}
              <div className="rounded-2xl bg-[#f8faf9] p-4 border border-[#e3ebe6]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
                  1. How severe is your symptom / pain?
                </label>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuizSeverity("mild")}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizSeverity === "mild"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    🟢 Mild
                    <span className="block mt-0.5 text-[10px] font-normal text-[#8a9a92]">Tolerable / minor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizSeverity("moderate")}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizSeverity === "moderate"
                        ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    🟡 Moderate
                    <span className="block mt-0.5 text-[10px] font-normal text-[#8a9a92]">Disrupts daily tasks</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizSeverity("severe")}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizSeverity === "severe"
                        ? "border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-600/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    🔴 Severe
                    <span className="block mt-0.5 text-[10px] font-normal text-[#8a9a92]">Unbearable / extreme</span>
                  </button>
                </div>
              </div>

              {/* Question 2: Duration */}
              <div className="rounded-2xl bg-[#f8faf9] p-4 border border-[#e3ebe6]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
                  2. How long have you experienced these symptoms?
                </label>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuizDuration("short")}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizDuration === "short"
                        ? "border-teal-700 bg-teal-50 text-teal-950 ring-2 ring-teal-700/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    ⏱️ &lt; 3 Days
                    <span className="block mt-0.5 text-[10px] font-normal text-[#8a9a92]">Recent onset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizDuration("medium")}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizDuration === "medium"
                        ? "border-teal-700 bg-teal-50 text-teal-950 ring-2 ring-teal-700/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    ⏳ 3–7 Days
                    <span className="block mt-0.5 text-[10px] font-normal text-[#8a9a92]">Standard OTC limit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizDuration("long")}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizDuration === "long"
                        ? "border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-600/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    ⚠️ &gt; 7 Days
                    <span className="block mt-0.5 text-[10px] font-normal text-[#8a9a92]">Prolonged symptom</span>
                  </button>
                </div>
              </div>

              {/* Question 3: Red Flags */}
              <div className="rounded-2xl bg-[#f8faf9] p-4 border border-[#e3ebe6]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
                  3. Are you experiencing any &ldquo;Red Flag&rdquo; symptoms?
                </label>
                <p className="mt-1 text-[11px] text-[#5a6b62]">
                  (e.g., chest pressure, trouble breathing, blood in stool/vomit, sudden worst headache, or infant &lt;3 months with fever)
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuizRedFlags(false)}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      !quizRedFlags
                        ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    ✅ No Red Flags
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizRedFlags(true)}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizRedFlags
                        ? "border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-600/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    🚨 Yes, Has Red Flags
                  </button>
                </div>
              </div>

              {/* Question 4: Special Populations */}
              <div className="rounded-2xl bg-[#f8faf9] p-4 border border-[#e3ebe6]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
                  4. Patient Profile
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setQuizSpecialPop(false)}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      !quizSpecialPop
                        ? "border-teal-700 bg-teal-50 text-teal-950 ring-2 ring-teal-700/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    Healthy Adult / Older Child
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizSpecialPop(true)}
                    className={`rounded-xl p-3 text-center font-semibold transition border ${
                      quizSpecialPop
                        ? "border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-600/20"
                        : "border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-slate-50"
                    }`}
                  >
                    Pregnant / Infant / Chronic Illness
                  </button>
                </div>
              </div>
            </div>

            {/* Live Triage Outcome Right */}
            <div
              className={`flex flex-col justify-between rounded-3xl border-2 p-6 shadow-md transition-all duration-300 md:p-8 ${quizOutcome.bg}`}
            >
              <div>
                <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-white shadow-xs border">
                  {quizOutcome.badge}
                </span>
                <h3
                  className="mt-3 text-2xl font-bold"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {quizOutcome.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed">
                  {quizOutcome.desc}
                </p>

                <div className="mt-6 space-y-3 rounded-2xl bg-white/90 p-4 border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a6b62]">Severity:</span>
                    <strong className="capitalize">{quizSeverity}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a6b62]">Duration:</span>
                    <strong>{quizDuration === "short" ? "< 3 Days" : quizDuration === "medium" ? "3–7 Days" : "> 7 Days"}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5a6b62]">Red Flags:</span>
                    <strong className={quizRedFlags ? "text-rose-600" : "text-emerald-700"}>
                      {quizRedFlags ? "Present" : "None detected"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-black/10 flex flex-col sm:flex-row gap-3">
                <Link
                  href={quizOutcome.actionUrl}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold text-center shadow-sm transition ${quizOutcome.btnColor}`}
                >
                  {quizOutcome.actionText} →
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveTab("matrix")}
                  className="btn-ghost !py-3 !px-4 text-xs font-semibold"
                >
                  Explore Condition Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: Condition & Symptom Library */}
      {activeTab === "matrix" && (
        <div className="space-y-8">
          {/* Search & Filter Bar */}
          <div className="rounded-3xl border border-[#0d6e5a]/15 bg-gradient-to-b from-white to-[#f4f9f6] p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5a6b62]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search symptom or condition (e.g., headache, fever, dry cough, acid reflux, rash, burn, diarrhea, colic)..."
                  className="w-full rounded-2xl border border-[#d2dfd8] bg-white py-3.5 pl-12 pr-4 text-sm text-[#0c1a14] placeholder:text-[var(--muted)] shadow-inner focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`rounded-full px-3.5 py-1.5 font-semibold transition shrink-0 ${
                    selectedCategory === "all"
                      ? "bg-teal-800 text-white shadow-sm"
                      : "border border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-[#eef5f1]"
                  }`}
                >
                  ✨ All ({SELF_CARE_CONDITIONS_DATA.length})
                </button>
                {categories.map((c) => {
                  const emoji = CATEGORY_EMOJIS[c.slug] || "💊";
                  return (
                    <button
                      key={c.slug}
                      onClick={() => setSelectedCategory(c.slug)}
                      className={`rounded-full px-3.5 py-1.5 font-semibold transition shrink-0 flex items-center gap-1.5 ${
                        selectedCategory === c.slug
                          ? "bg-teal-800 text-white shadow-sm"
                          : "border border-[#d2dfd8] bg-white text-[#5a6b62] hover:bg-[#eef5f1]"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Grid: Condition Selector (Left) + 3-Tier Clinical Triage Matrix (Right) */}
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Column: Condition List */}
            <div className="space-y-3 lg:col-span-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
                  Select Condition ({filteredConditions.length})
                </h2>
                <span className="text-[11px] text-[#8a9a92]">Click to inspect</span>
              </div>

              {filteredConditions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d2dfd8] bg-white p-8 text-center text-sm text-[#5a6b62]">
                  No conditions match &ldquo;{searchTerm}&rdquo;. Try clearing your search or explore the quiz above.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                  {filteredConditions.map((cond) => {
                    const isActive = activeCondition?.id === cond.id;
                    const emoji = CATEGORY_EMOJIS[cond.categorySlug] || "💊";
                    return (
                      <button
                        key={cond.id}
                        onClick={() => setActiveConditionId(cond.id)}
                        className={`w-full rounded-2xl p-4 text-left transition ${
                          isActive
                            ? "border-2 border-teal-700 bg-teal-50/70 shadow-md ring-2 ring-teal-700/10"
                            : "border border-[#e3ebe6] bg-white hover:border-teal-300 hover:bg-[#fbfdfc] shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0d6e5a]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#084c3f]">
                              {emoji} {cond.categoryName}
                            </span>
                            <h3 className="mt-1.5 font-bold text-[#0c1a14] text-sm">
                              {cond.conditionName}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5a6b62]">
                              {cond.description}
                            </p>
                          </div>
                          <ChevronRight
                            className={`h-5 w-5 shrink-0 mt-1 transition ${
                              isActive ? "text-teal-700 translate-x-1" : "text-[var(--muted)]"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick AI Check-In Banner */}
              <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-purple-50/40 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-purple-600 p-2.5 text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-950 text-sm">
                      Need custom symptom analysis?
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-purple-800">
                      Use our interactive AI triage check-in to describe what you feel and get step-by-step guidance.
                    </p>
                    <Link
                      href={`/how-do-you-feel${
                        activeCondition
                          ? `?starter=${encodeURIComponent(activeCondition.conditionName)}`
                          : ""
                      }`}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-900 hover:underline"
                    >
                      Start AI Symptom Check →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 3-Tier Clinical Evaluation Matrix */}
            {activeCondition && (
              <div className="space-y-6 lg:col-span-8">
                {/* Condition Header Card with Copy / Share */}
                <div className="rounded-3xl border border-[#e3ebe6] bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
                        {activeCondition.categoryName}
                      </span>
                      <h1
                        className="mt-2 text-2xl font-bold text-[#0c1a14] md:text-3xl"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        {activeCondition.conditionName}
                      </h1>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-2xl bg-[#f0faf6] px-3.5 py-2 text-xs font-semibold text-[#084c3f] border border-[#0d6e5a]/15">
                        <Clock className="h-3.5 w-3.5 text-teal-700" />
                        <span>Recovery: {activeCondition.expectedRecovery}</span>
                      </div>
                      <button
                        onClick={copySummary}
                        className="flex items-center gap-1 rounded-2xl border border-[#d2dfd8] bg-white px-3 py-2 text-xs font-semibold text-[#5a6b62] hover:bg-[#eef5f1] transition"
                        title="Copy care summary"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">
                    {activeCondition.description}
                  </p>
                </div>

                {/* 3-Tier Triage Level Cards */}
                <div className="grid gap-5">
                  {/* Level 1: 🟢 Appropriate for Self-Care */}
                  <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-emerald-700 p-2.5 text-white shadow-md">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                          Tier 1 · At-Home Care
                        </span>
                        <h3 className="text-lg font-bold text-emerald-950">
                          Appropriate for Self-Care
                        </h3>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
                          Indications for Self-Care:
                        </h4>
                        <ul className="mt-2.5 space-y-2">
                          {activeCondition.selfCareSigns.map((sign, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-[#2c3e35]">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                              <span>{sign}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0c1a14]">
                          Recommended OTC Non-Prescription Classes:
                        </h4>
                        <ul className="mt-2.5 space-y-2">
                          {activeCondition.recommendedOtcTypes.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-[#2c3e35]">
                              <Pill className="h-3.5 w-3.5 shrink-0 text-emerald-700 mt-0.5" />
                              <span className="font-semibold text-emerald-950">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {activeCondition.homeMeasures.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-white/80 p-3.5">
                        <div className="flex items-start gap-2 text-xs text-[#2c3e35]">
                          <Home className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
                          <div>
                            <strong className="text-emerald-950">Supportive Non-Drug Measures: </strong>
                            {activeCondition.homeMeasures.join(" · ")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Level 2: 🟡 Consult a Pharmacist or GP Soon */}
                  <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-amber-700 p-2.5 text-white shadow-md">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                          Tier 2 · Professional Review
                        </span>
                        <h3 className="text-lg font-bold text-amber-950">
                          When to Consult a Pharmacist or GP
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-amber-900">
                        Schedule a consultation or speak with our clinical staff if you observe any of the following:
                      </p>
                      <ul className="mt-3 grid gap-2 md:grid-cols-2">
                        {activeCondition.pharmacistConsultTriggers.map((trig, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-xl bg-white/90 p-2.5 text-xs text-amber-950 border border-amber-200/50"
                          >
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span>{trig}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Level 3: 🔴 Immediate Medical / Emergency Attention */}
                  <div className="rounded-3xl border-2 border-rose-300 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-rose-700 p-2.5 text-white shadow-md">
                        <AlertOctagon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                          Tier 3 · Urgent / Emergency Care
                        </span>
                        <h3 className="text-lg font-bold text-rose-950">
                          When to Seek Immediate Medical Attention (Red Flags)
                        </h3>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-rose-900">
                        DO NOT attempt home self-care. Seek urgent clinical care or hospital emergency services if:
                      </p>
                      <ul className="mt-3 grid gap-2 md:grid-cols-2">
                        {activeCondition.emergencyRedFlags.map((flag, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-xl bg-white/90 p-2.5 text-xs font-semibold text-rose-950 border border-rose-200/80"
                          >
                            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Pharmacist Tips & Direct OTC Shopping Hub */}
                {activeCategoryGuidance && (
                  <div className="rounded-3xl border border-[#d2dfd8] bg-white p-6 shadow-sm">
                    <h3
                      className="text-base font-bold text-[#0c1a14]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      Pharmacist Clinical Tips for {activeCondition.categoryName}
                    </h3>
                    <ul className="mt-3 space-y-2 text-xs text-[#5a6b62]">
                      {activeCategoryGuidance.pharmacistTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#e3ebe6] pt-4">
                      <div>
                        <span className="text-xs text-[#8a9a92]">Featured Brands:</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {activeCategoryGuidance.featuredBrands.map((b) => (
                            <span
                              key={b}
                              className="rounded-full bg-[#f4f7f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#0c1a14]"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/medicines/${activeCondition.categorySlug}`}
                          className="btn-primary !py-2 !px-4 text-xs font-semibold"
                        >
                          Shop {activeCondition.categoryName} OTC Products <ArrowRight className="inline ml-1 h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={contactHref}
                          className="btn-ghost !py-2 !px-4 text-xs font-semibold"
                        >
                          Ask a Pharmacist
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
