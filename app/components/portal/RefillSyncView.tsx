"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Calendar,
  CheckCircle2,
  Package,
  Truck,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Info,
  Clock,
  Pill,
  XCircle,
  HelpCircle,
  TrendingUp,
  Award,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate } from "@/app/lib/time";
import type { PatientSyncPlan } from "@/app/lib/services/refill-sync";

export function RefillSyncView({
  initialPlan,
}: {
  initialPlan: PatientSyncPlan;
}) {
  const [plan, setPlan] = useState<PatientSyncPlan>(initialPlan);
  const [selectedAnchorDay, setSelectedAnchorDay] = useState<number>(
    initialPlan.targetAnchorDay || 1
  );
  const [selectedPrescriptionIds, setSelectedPrescriptionIds] = useState<string[]>(() => {
    return initialPlan.medications.map((m) => m.prescriptionId);
  });
  const [preferredPickup, setPreferredPickup] = useState<"pickup" | "delivery">("pickup");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  // Recalculate plan when anchor day changes
  async function handleAnchorChange(newDay: number) {
    setSelectedAnchorDay(newDay);
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/sync?anchorDay=${newDay}`);
      if (!res.ok) throw new Error("Failed to recalculate sync plan");
      const json: PatientSyncPlan = await res.json();
      setPlan(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating anchor date");
    } finally {
      setLoading(false);
    }
  }

  function togglePrescription(id: string) {
    setSelectedPrescriptionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function selectAllPrescriptions() {
    setSelectedPrescriptionIds(plan.medications.map((m) => m.prescriptionId));
  }

  async function handleEnroll() {
    if (selectedPrescriptionIds.length === 0) {
      toast.error("Please select at least one prescription to synchronize.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorDay: selectedAnchorDay,
          prescriptionIds: selectedPrescriptionIds,
          preferredPickup,
          notes: "Patient portal sync enrollment",
        }),
      });

      if (!res.ok) throw new Error("Failed to save sync enrollment");
      toast.success("✨ You're enrolled in Med Sync! All selected medications are now aligned.");
      setPlan((prev) => ({ ...prev, isEnrolled: true, enrollmentStatus: "active" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enroll in Med Sync");
    } finally {
      setSubmitting(false);
    }
  }

  const anchorDays = [1, 5, 10, 15, 20, 25];

  const selectedMedications = plan.medications.filter((m) =>
    selectedPrescriptionIds.includes(m.prescriptionId)
  );

  const totalBridgeCost = selectedMedications.reduce((acc, m) => acc + m.bridgeCost, 0);
  const totalMonthlyCost = selectedMedications.reduce((acc, m) => acc + m.syncedMonthlyCost, 0);

  return (
    <div className="space-y-8">
      {/* ── HERO BANNER ── */}
      <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-900 via-[#0d6e5a] to-emerald-950 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-teal-100 backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              Med Sync · Refill Synchronization Program
            </span>
            {plan.isEnrolled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-xs font-bold text-emerald-200 backdrop-blur-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Active Enrollment
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            All Your Maintenance Medications. <br className="hidden sm:inline" />
            One Single Monthly Pickup.
          </h2>

          <p className="text-sm sm:text-base text-teal-50/90 leading-relaxed max-w-2xl">
            Never make multiple trips or juggle different refill dates again. We align all your recurring chronic treatments to one convenient anchor date each month.
          </p>
        </div>
      </div>

      {/* ── BEFORE VS AFTER COMPARISON CARDS ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/30 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <XCircle className="h-4 w-4 text-rose-600" />
            <span>Without Med Sync (Fragmented)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-[#5a6b62]">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>3 to 4 separate pharmacy trips or deliveries every month</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Easy to accidentally run out of one vital medication</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>Frequent last-minute rush calls to physician for renewals</span>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>With Med Sync (Synchronized)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-[#5a6b62]">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>1 single scheduled monthly pickup or delivery on your chosen day</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>All medications pre-packaged and reviewed by pharmacist together</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Proactive doctor refill renewals handled by pharmacy in advance</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── 3-STEP CONFIGURATION & SUMMARY ── */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* LEFT 2 COLS: CONFIGURATION */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: CHOOSE ANCHOR DAY */}
          <div className="rounded-3xl border border-[#e3ebe6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0d6e5a] text-xs font-extrabold text-white shadow-2xs">
                1
              </span>
              <div>
                <h3 className="text-base font-bold text-[#0c1a14]">
                  Select your Monthly Anchor Day
                </h3>
                <p className="text-xs text-[#5a6b62]">
                  Choose which day of the month is most convenient for pickup or delivery.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {anchorDays.map((day) => {
                const isSelected = selectedAnchorDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => handleAnchorChange(day)}
                    disabled={loading}
                    className={`rounded-2xl p-3 text-center transition border ${
                      isSelected
                        ? "border-[#0d6e5a] bg-teal-50 text-[#0d6e5a] font-extrabold ring-2 ring-[#0d6e5a]/25 shadow-2xs"
                        : "border-[#e3ebe6] bg-white text-[#0c1a14] hover:border-[#ccd7d1] hover:bg-[#fafcfb]"
                    }`}
                  >
                    <span className="block text-lg font-bold">Day {day}</span>
                    <span className="block text-[10px] text-[#5a6b62]">of month</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-[#fafcfb] p-3.5 text-xs text-[#5a6b62] border border-[#e3ebe6]">
              <Calendar className="h-4 w-4 text-[#0d6e5a] shrink-0" />
              <span>
                Target first synchronized refill date:{" "}
                <strong className="text-[#0c1a14]">
                  {formatDate(new Date(plan.targetSyncDate))}
                </strong>
              </span>
            </div>
          </div>

          {/* STEP 2: SELECT MEDICATIONS */}
          <div className="rounded-3xl border border-[#e3ebe6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0d6e5a] text-xs font-extrabold text-white shadow-2xs">
                  2
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#0c1a14]">
                    Select Maintenance Medications
                  </h3>
                  <p className="text-xs text-[#5a6b62]">
                    Choose which ongoing prescriptions to bundle together.
                  </p>
                </div>
              </div>

              <button
                onClick={selectAllPrescriptions}
                className="text-xs font-bold text-[#0d6e5a] hover:underline"
              >
                Select All
              </button>
            </div>

            <div className="space-y-3">
              {plan.medications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e3ebe6] p-8 text-center text-xs text-[#8a9a92]">
                  No active prescriptions found. Contact your pharmacy to add ongoing medications.
                </div>
              ) : (
                plan.medications.map((med) => {
                  const isChecked = selectedPrescriptionIds.includes(med.prescriptionId);

                  return (
                    <div
                      key={med.prescriptionId}
                      onClick={() => togglePrescription(med.prescriptionId)}
                      className={`cursor-pointer rounded-2xl border p-4 transition flex items-start justify-between gap-3 ${
                        isChecked
                          ? "border-[#0d6e5a] bg-teal-50/35 shadow-2xs"
                          : "border-[#e3ebe6] bg-white opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-1 h-4 w-4 rounded text-[#0d6e5a] focus:ring-[#0d6e5a]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#0c1a14]">{med.medicineName}</h4>
                            {med.isSynced && (
                              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-[#0d6e5a]">
                                Synced
                              </span>
                            )}
                          </div>
                          {med.dosage && (
                            <p className="text-xs text-[#5a6b62] mt-0.5">{med.dosage}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#5a6b62]">
                            <span>
                              Current Supply:{" "}
                              <strong className="text-[#0c1a14]">
                                {med.currentDaysRemaining > 0
                                  ? `${med.currentDaysRemaining} days remaining`
                                  : "Refill due now"}
                              </strong>
                            </span>
                            {med.bridgeDaysNeeded > 0 && (
                              <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                Bridge short-fill: +{med.bridgeQuantity} units ({med.bridgeDaysNeeded} days)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#0c1a14]">
                          ${med.syncedMonthlyCost.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-[#8a9a92]">per month (30d)</span>
                        {med.bridgeCost > 0 && (
                          <span className="block text-[10px] text-amber-700 font-semibold mt-1">
                            +${med.bridgeCost.toFixed(2)} bridge
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* STEP 3: PICKUP OR DELIVERY */}
          <div className="rounded-3xl border border-[#e3ebe6] bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0d6e5a] text-xs font-extrabold text-white shadow-2xs">
                3
              </span>
              <div>
                <h3 className="text-base font-bold text-[#0c1a14]">
                  Fulfillment Preference
                </h3>
                <p className="text-xs text-[#5a6b62]">
                  How would you like to receive your monthly synchronized order?
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPreferredPickup("pickup")}
                className={`rounded-2xl p-4 text-left border transition flex items-start gap-3 ${
                  preferredPickup === "pickup"
                    ? "border-[#0d6e5a] bg-teal-50/40 text-[#0c1a14] ring-2 ring-[#0d6e5a]/25 shadow-2xs"
                    : "border-[#e3ebe6] bg-white text-[#5a6b62] hover:border-[#ccd7d1]"
                }`}
              >
                <Package className="h-5 w-5 text-[#0d6e5a] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-sm text-[#0c1a14]">Pharmacy Pickup</span>
                  <span className="block text-xs text-[#5a6b62]">
                    Ready at main branch counter on day {selectedAnchorDay}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPreferredPickup("delivery")}
                className={`rounded-2xl p-4 text-left border transition flex items-start gap-3 ${
                  preferredPickup === "delivery"
                    ? "border-[#0d6e5a] bg-teal-50/40 text-[#0c1a14] ring-2 ring-[#0d6e5a]/25 shadow-2xs"
                    : "border-[#e3ebe6] bg-white text-[#5a6b62] hover:border-[#ccd7d1]"
                }`}
              >
                <Truck className="h-5 w-5 text-[#0d6e5a] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-sm text-[#0c1a14]">Free Monthly Delivery</span>
                  <span className="block text-xs text-[#5a6b62]">
                    Dispatched automatically to your address on day {selectedAnchorDay}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COL: SUMMARY CARD & ENROLLMENT CTA */}
        <div>
          <div className="sticky top-6 rounded-3xl border border-[#e3ebe6] bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="font-bold text-base text-[#0c1a14]">Synchronization Summary</h3>
              <Sparkles className="h-4 w-4 text-[#0d6e5a]" />
            </div>

            <div className="space-y-3.5 text-xs text-[#5a6b62]">
              <div className="flex items-center justify-between">
                <span>Selected Medications</span>
                <span className="font-bold text-[#0c1a14]">{selectedMedications.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Monthly Anchor Day</span>
                <span className="font-bold text-[#0d6e5a]">Day {selectedAnchorDay} of month</span>
              </div>
              <div className="flex items-center justify-between">
                <span>First Synced Refill Date</span>
                <span className="font-bold text-[#0c1a14]">
                  {formatDate(new Date(plan.targetSyncDate))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fulfillment Preference</span>
                <span className="font-bold capitalize text-[#0c1a14]">{preferredPickup}</span>
              </div>

              <div className="border-t border-black/5 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span>One-time Bridge Short-Fill Cost</span>
                  <span className="font-bold text-[#0c1a14]">${totalBridgeCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#0c1a14]">Ongoing Monthly Total</span>
                  <span className="font-bold text-[#0d6e5a]">${totalMonthlyCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-teal-50/70 p-4 border border-teal-100 text-xs text-[#0d6e5a] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Pharmacy Clinical Guarantee</span>
              </div>
              <p className="text-[11px] text-[#5a6b62] leading-normal">
                Our clinical pharmacist monitors drug interactions, safety, and contacts your physician before refills expire so you never miss a treatment cycle.
              </p>
            </div>

            <button
              type="button"
              onClick={handleEnroll}
              disabled={submitting || selectedMedications.length === 0}
              className="btn-primary w-full justify-center text-sm py-3.5 font-bold shadow-xs"
            >
              {submitting ? (
                "Saving Enrollment…"
              ) : plan.isEnrolled ? (
                "Update My Med Sync"
              ) : (
                <>
                  <span>Enroll in Med Sync</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
