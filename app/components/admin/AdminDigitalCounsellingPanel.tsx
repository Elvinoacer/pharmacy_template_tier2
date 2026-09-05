"use client";

import React, { useState } from "react";
import type { MedicationCounsellingProfile } from "@/app/lib/medication-counselling";
import {
  ShieldCheck,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
  PhoneCall,
  Clock,
  Sparkles,
  Utensils,
  Thermometer,
  RotateCcw,
  BookOpen,
  Check,
} from "lucide-react";

export function AdminDigitalCounsellingPanel({
  counselling,
  prescriptionId,
  customerName,
  customerPhone,
}: {
  counselling: MedicationCounsellingProfile;
  prescriptionId: string;
  customerName?: string | null;
  customerPhone?: string | null;
}) {
  const [checkedPillars, setCheckedPillars] = useState<Record<number, boolean>>({
    1: true, // How to take
    2: true, // When to take
    3: true, // Frequency
    4: true, // Food rules
    5: true, // Storage
    9: true, // Course completion
  });

  const [copiedText, setCopiedText] = useState(false);

  const togglePillar = (num: number) => {
    setCheckedPillars((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const handleCheckAll = () => {
    const all: Record<number, boolean> = {};
    for (let i = 1; i <= 12; i++) {
      all[i] = true;
    }
    setCheckedPillars(all);
  };

  const completedCount = Object.values(checkedPillars).filter(Boolean).length;
  const percentage = Math.round((completedCount / 12) * 100);

  const shareSummary = `📋 *Aether Pharmacy — Digital Medication Counselling Leaflet*\n\nPatient: ${customerName || "Customer"}\nMedication: *${counselling.brandNames[0]} (${counselling.genericName})*\n\n1. *How to take:* ${counselling.howToTake.technique}\n2. *When:* ${counselling.whenToTake.bestTimeOfDay}\n3. *Food:* ${counselling.foodAndDrink.summary}\n4. *Storage:* ${counselling.storage.temperatureRange}\n5. *Missed Dose:* ${counselling.missedDose.ruleOfThumb}\n6. *Course Completion:* ${counselling.courseCompletion.rationale}\n\n🔗 *Full 12-Pillar Interactive Leaflet:* https://aetherpharmacy.com/health/counselling/${counselling.medicineKey}\n\nCall/WhatsApp us if you experience unexpected side effects.`;

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(shareSummary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const whatsappUrl = customerPhone
    ? `https://wa.me/${customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(shareSummary)}`
    : null;

  return (
    <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-surface)] p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-bold text-xs admin-heading sm:text-sm">
              Pharmacist Digital Patient Counselling Checklist
            </h3>
            <p className="text-xs admin-muted">
              Verify and check off the 12 clinical counselling pillars before dispensing to {customerName || "patient"}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCheckAll}
            className="btn-admin-secondary text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold"
          >
            <Check className="h-3.5 w-3.5" /> Verify All 12
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="btn-admin-secondary text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedText ? "Copied!" : "Copy Leaflet Summary"}
          </button>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Share2 className="h-3.5 w-3.5" /> Send via WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-bold text-[var(--admin-text)] dark:text-emerald-300">
          {completedCount} / 12 ({percentage}%)
        </span>
      </div>

      {/* 12-Pillar Verification Grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PillarCheckItem
          number={1}
          title="1. Administration Technique"
          detail={counselling.howToTake.technique}
          checked={Boolean(checkedPillars[1])}
          onToggle={() => togglePillar(1)}
        />
        <PillarCheckItem
          number={2}
          title="2. Timing & Circadian"
          detail={counselling.whenToTake.bestTimeOfDay}
          checked={Boolean(checkedPillars[2])}
          onToggle={() => togglePillar(2)}
        />
        <PillarCheckItem
          number={3}
          title="3. Dosing Frequency & Caps"
          detail={counselling.howOftenToTake.frequencySchedule}
          checked={Boolean(checkedPillars[3])}
          onToggle={() => togglePillar(3)}
        />
        <PillarCheckItem
          number={4}
          title="4. Food & Drink Rules"
          detail={counselling.foodAndDrink.summary}
          checked={Boolean(checkedPillars[4])}
          onToggle={() => togglePillar(4)}
        />
        <PillarCheckItem
          number={5}
          title="5. Storage & Child Safety"
          detail={counselling.storage.temperatureRange}
          checked={Boolean(checkedPillars[5])}
          onToggle={() => togglePillar(5)}
        />
        <PillarCheckItem
          number={6}
          title="6. Special Dosage Form"
          detail={counselling.specialDosageForm?.formName || "Standard tablet/capsule"}
          checked={Boolean(checkedPillars[6])}
          onToggle={() => togglePillar(6)}
        />
        <PillarCheckItem
          number={7}
          title="7. Expected Side Effects"
          detail={counselling.sideEffects.expected.map((e) => e.effect).slice(0, 2).join(", ")}
          checked={Boolean(checkedPillars[7])}
          onToggle={() => togglePillar(7)}
        />
        <PillarCheckItem
          number={8}
          title="8. Missed Dose Protocol"
          detail={counselling.missedDose.neverDoubleUpRule}
          checked={Boolean(checkedPillars[8])}
          onToggle={() => togglePillar(8)}
        />
        <PillarCheckItem
          number={9}
          title="9. Course Completion & AMR"
          detail={counselling.courseCompletion.importance === "critical" ? "Critical: Finish entire antibiotic course" : "Adherence advised"}
          checked={Boolean(checkedPillars[9])}
          onToggle={() => togglePillar(9)}
        />
        <PillarCheckItem
          number={10}
          title="10. Device Protocol"
          detail={counselling.device?.deviceName || "No device needed"}
          checked={Boolean(checkedPillars[10])}
          onToggle={() => togglePillar(10)}
        />
        <PillarCheckItem
          number={11}
          title="11. Safe Disposal & Hygiene"
          detail={counselling.safeHandling.safeDisposal}
          checked={Boolean(checkedPillars[11])}
          onToggle={() => togglePillar(11)}
        />
        <PillarCheckItem
          number={12}
          title="12. Clinician Return Triggers"
          detail={`Improvement in ${counselling.whenToReturn.expectedImprovementTimeline}`}
          checked={Boolean(checkedPillars[12])}
          onToggle={() => togglePillar(12)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--admin-border)] pt-3 text-xs admin-muted">
        <span>
          Verification Status: <strong className={completedCount === 12 ? "text-emerald-600 font-bold" : ""}>{completedCount} / 12 pillars checked.</strong>
        </span>
        <a
          href={`/health/counselling/${counselling.medicineKey}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-bold admin-accent-text hover:underline"
        >
          Open Public Patient Leaflet <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function PillarCheckItem({
  number,
  title,
  detail,
  checked,
  onToggle,
}: {
  number: number;
  title: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer rounded-xl border p-3 transition ${
        checked
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 shadow-2xs"
          : "border-[var(--admin-border)] bg-[var(--admin-inset)] opacity-60 hover:opacity-100"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold">{title}</p>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="rounded-sm accent-emerald-600 cursor-pointer"
        />
      </div>
      <p className="mt-1 line-clamp-2 text-xs opacity-80">{detail}</p>
    </div>
  );
}
