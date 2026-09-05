"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Phone,
  PhoneCall,
  RefreshCw,
  HeartPulse,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  User,
  Pill,
  Send,
  Sparkles,
  FileText,
  Search,
  Filter,
  Plus,
  ShieldAlert,
  ChevronRight,
  X,
  Stethoscope,
  Building,
  MessageCircle,
  ExternalLink,
  MessageSquare,
  CheckCheck,
  Check,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { useTenantBrand } from "@/app/components/TenantBrand";
import { formatDate } from "@/app/lib/time";
import type {
  PendingOutreachItem,
  FollowUpCallReason,
  FollowUpCallOutcome,
  AdherenceBarrier,
  ClinicalAction,
} from "@/app/lib/services/adherence-outreach";
import type {
  ChronicCareSummary,
  ChronicMedicationItem,
} from "@/app/lib/services/chronic-care";

export function AdminAdherenceCommandCenter({
  initialOutreachQueue,
  initialOutreachHistory,
  initialCandidates,
  initialEnrollments,
  initialChronicData,
  initialLapsedPatients,
}: {
  initialOutreachQueue: PendingOutreachItem[];
  initialOutreachHistory: any[];
  initialCandidates: any[];
  initialEnrollments: any[];
  initialChronicData: {
    summary: ChronicCareSummary;
    chronicMedications: ChronicMedicationItem[];
    renewalNeededList: ChronicMedicationItem[];
  };
  initialLapsedPatients: any[];
}) {
  const [activeTab, setActiveTab] = useState<"outreach" | "sync" | "chronic" | "lapsed">("outreach");
  const [searchQuery, setSearchQuery] = useState("");
  const brand = useTenantBrand();

  // Outreach modal state
  const [callModalItem, setCallModalItem] = useState<PendingOutreachItem | null>(null);
  const [callOutcome, setCallOutcome] = useState<FollowUpCallOutcome>("reached_patient");
  const [callReason, setCallReason] = useState<FollowUpCallReason>("low_adherence");
  const [barrier, setBarrier] = useState<AdherenceBarrier>("none");
  const [clinicalAction, setClinicalAction] = useState<ClinicalAction>("education");
  const [callNotes, setCallNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [sendSummary, setSendSummary] = useState(true);
  const [selectedMessageTemplate, setSelectedMessageTemplate] = useState<string>("default");
  const [customOutreachText, setCustomOutreachText] = useState("");
  const [submittingCall, setSubmittingCall] = useState(false);

  // Prescriber renewal modal state
  const [renewalModalItem, setRenewalModalItem] = useState<ChronicMedicationItem | null>(null);
  const [additionalRefills, setAdditionalRefills] = useState(6);
  const [renewalContactMethod, setRenewalContactMethod] = useState("email");
  const [renewalNotes, setRenewalNotes] = useState("");
  const [submittingRenewal, setSubmittingRenewal] = useState(false);

  // Med Sync modal state
  const [syncModalCandidate, setSyncModalCandidate] = useState<any | null>(null);
  const [syncAnchorDay, setSyncAnchorDay] = useState(1);
  const [syncPlanData, setSyncPlanData] = useState<any | null>(null);
  const [loadingSyncPlan, setLoadingSyncPlan] = useState(false);
  const [submittingSync, setSubmittingSync] = useState(false);

  // Chronic condition category filter
  const [selectedCondition, setSelectedCondition] = useState<string>("all");

  async function openCallModal(item: PendingOutreachItem) {
    setCallModalItem(item);
    setCallReason(item.reason);
    setCallOutcome("reached_patient");
    setBarrier("none");
    setClinicalAction("education");
    setCallNotes("");
    setNextFollowUpDate("");
    setSendSummary(true);
    setSelectedMessageTemplate("default");

    const defaultMsg = `Hello ${item.customerName}, this is ${brand.name} following up regarding your ${
      item.medicineName || "medication regimen"
    }. We want to ensure your treatment is going smoothly and answer any questions you have.`;
    setCustomOutreachText(defaultMsg);
  }

  function handleTemplateChange(templateKey: string) {
    if (!callModalItem) return;
    setSelectedMessageTemplate(templateKey);
    const name = callModalItem.customerName;
    const med = callModalItem.medicineName || "prescribed treatment";

    if (templateKey === "missed_dose") {
      setCustomOutreachText(
        `Hello ${name}, ${brand.name} noticed you may have missed your recent dose of ${med}. Please check your portal at /portal/calendar to confirm your schedule or reply if you need assistance.`
      );
    } else if (templateKey === "refill_overdue") {
      setCustomOutreachText(
        `Hello ${name}, your refill for ${med} is overdue. Staying consistent on your therapy is important. Order your refill online at https://aetherpharmacy.com/portal/refills or reply to this message for free delivery.`
      );
    } else if (templateKey === "med_sync_invite") {
      setCustomOutreachText(
        `Hello ${name}, did you know ${brand.name} can align all your recurring medications to a single monthly pickup date? Check out Med Sync at /portal/sync to save time!`
      );
    } else {
      setCustomOutreachText(
        `Hello ${name}, this is ${brand.name} following up regarding your ${med}. We are here to support your health journey. Reach out anytime!`
      );
    }
  }

  async function handleLogCallSubmit() {
    if (!callModalItem) return;
    setSubmittingCall(true);
    try {
      const res = await fetch("/api/admin/adherence/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: callModalItem.customerId,
          prescriptionId: callModalItem.prescriptionId,
          reason: callReason,
          callOutcome,
          barrierIdentified: barrier,
          clinicalAction,
          notes: `${callNotes.trim()}${customOutreachText ? ` [Message sent: "${customOutreachText}"]` : ""}`,
          nextFollowUpDate: nextFollowUpDate || undefined,
          sendSummaryNotification: sendSummary,
        }),
      });

      if (!res.ok) throw new Error("Failed to log clinical call");
      toast.success("Clinical follow-up call & outreach recorded successfully.");
      setCallModalItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error logging call");
    } finally {
      setSubmittingCall(false);
    }
  }

  async function openSyncModal(candidate: any) {
    setSyncModalCandidate(candidate);
    setSyncAnchorDay(candidate.anchorDay || 1);
    setLoadingSyncPlan(true);
    try {
      const res = await fetch(
        `/api/admin/adherence/sync?customerId=${candidate.customerId}&anchorDay=${
          candidate.anchorDay || 1
        }`
      );
      const json = await res.json();
      setSyncPlanData(json.plan);
    } catch {
      toast.error("Failed to calculate sync plan");
    } finally {
      setLoadingSyncPlan(false);
    }
  }

  async function handleRecalculateSync(anchor: number) {
    setSyncAnchorDay(anchor);
    if (!syncModalCandidate) return;
    setLoadingSyncPlan(true);
    try {
      const res = await fetch(
        `/api/admin/adherence/sync?customerId=${syncModalCandidate.customerId}&anchorDay=${anchor}`
      );
      const json = await res.json();
      setSyncPlanData(json.plan);
    } catch {
      toast.error("Failed to recalculate sync plan");
    } finally {
      setLoadingSyncPlan(false);
    }
  }

  async function handleEnrollSyncSubmit() {
    if (!syncModalCandidate || !syncPlanData) return;
    setSubmittingSync(true);
    try {
      const res = await fetch("/api/admin/adherence/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: syncModalCandidate.customerId,
          anchorDay: syncAnchorDay,
          prescriptionIds: syncPlanData.medications.map((m: any) => m.prescriptionId),
          preferredPickup: "pickup",
          notes: "Enrolled by pharmacist via Med Sync command center",
        }),
      });
      if (!res.ok) throw new Error("Failed to enroll patient in Med Sync");
      toast.success("✨ Patient successfully enrolled in Med Sync!");
      setSyncModalCandidate(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving sync");
    } finally {
      setSubmittingSync(false);
    }
  }

  async function openRenewalModal(item: ChronicMedicationItem) {
    setRenewalModalItem(item);
    setAdditionalRefills(6);
    setRenewalContactMethod("email");
    setRenewalNotes(
      `Physician refill authorization request for ${item.medicineName} (${item.dosage || "standard"}). Patient is adherent and needs ongoing maintenance supply.`
    );
  }

  async function handleRenewalSubmit() {
    if (!renewalModalItem) return;
    setSubmittingRenewal(true);
    try {
      const res = await fetch("/api/admin/adherence/chronic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: renewalModalItem.prescriptionId,
          additionalRefillsRequested: additionalRefills,
          contactMethod: renewalContactMethod,
          inquiryDetails: renewalNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to request renewal");
      toast.success("Physician renewal inquiry dispatched and logged.");
      setRenewalModalItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error requesting renewal");
    } finally {
      setSubmittingRenewal(false);
    }
  }

  // Filter queues by global search bar
  const filteredOutreachQueue = initialOutreachQueue.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(q) ||
      (item.phone && item.phone.includes(q)) ||
      (item.medicineName && item.medicineName.toLowerCase().includes(q))
    );
  });

  const filteredChronicMeds = initialChronicData.chronicMedications.filter((m) => {
    if (selectedCondition !== "all" && m.chronicCondition !== selectedCondition) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.customerName.toLowerCase().includes(q) ||
      m.medicineName.toLowerCase().includes(q) ||
      (m.rxReference && m.rxReference.toLowerCase().includes(q)) ||
      (m.prescriber && m.prescriber.toLowerCase().includes(q))
    );
  });

  const filteredLapsedPatients = initialLapsedPatients.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(q) ||
      p.medicineName.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── SEARCH & CLINICAL FILTER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--admin-card)] p-3 sm:p-4 rounded-3xl border border-[var(--admin-border)] shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-soft)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, phone, drug name, or prescriber..."
            className="w-full rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-2)] pl-10 pr-4 py-2.5 text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-text-soft)] focus:border-[#0d6e5a] focus:bg-[var(--admin-card)] focus:outline-none"
          />
        </div>

        {/* Global navigation tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("outreach")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "outreach"
                ? "bg-[#0d6e5a] text-white shadow-xs"
                : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]"
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Outreach Queue ({initialOutreachQueue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sync")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "sync"
                ? "bg-[#0d6e5a] text-white shadow-xs"
                : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Med Sync ({initialEnrollments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("chronic")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "chronic"
                ? "bg-[#0d6e5a] text-white shadow-xs"
                : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]"
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>Chronic Care</span>
          </button>

          <button
            onClick={() => setActiveTab("lapsed")}
            className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "lapsed"
                ? "bg-[#0d6e5a] text-white shadow-xs"
                : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)]"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Lapse Matrix ({initialLapsedPatients.length})</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: FOLLOW-UP CALLS & OUTREACH ── */}
      {activeTab === "outreach" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden shadow-xs">
            <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3.5">Patient & Direct Dial</th>
                    <th className="px-4 py-3.5">Urgency & Clinical Trigger</th>
                    <th className="px-4 py-3.5">Adherence Score</th>
                    <th className="px-4 py-3.5">Medication Context</th>
                    <th className="px-4 py-3.5">Caregiver Linked</th>
                    <th className="px-4 py-3.5 text-right">Outreach Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f2]">
                  {filteredOutreachQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[var(--admin-text-soft)]">
                        🎉 No outstanding adherence follow-up calls in queue!
                      </td>
                    </tr>
                  ) : (
                    filteredOutreachQueue.map((item, idx) => {
                      const urgencyBadges: Record<string, string> = {
                        critical: "bg-rose-100 text-rose-800 border-rose-200",
                        high: "bg-amber-100 text-amber-800 border-amber-200",
                        medium: "bg-blue-100 text-blue-800 border-blue-200",
                        low: "bg-slate-100 text-slate-700 border-slate-200",
                      };

                      return (
                        <tr key={idx} className="hover:bg-[var(--admin-card-2)] transition">
                          <td className="px-4 py-4">
                            <Link
                              href={`/admin/customers/${item.customerId}`}
                              className="font-bold text-[var(--admin-text)] hover:text-[var(--admin-accent-text)] hover:underline block text-sm"
                            >
                              {item.customerName}
                            </Link>
                            {item.phone ? (
                              <a
                                href={`tel:${item.phone}`}
                                className="text-teal-700 font-mono font-semibold flex items-center gap-1 hover:underline text-xs mt-0.5"
                              >
                                <Phone className="h-3 w-3" />
                                <span>{item.phone}</span>
                              </a>
                            ) : (
                              <span className="text-[var(--admin-text-soft)] text-xs">{item.email}</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                                urgencyBadges[item.urgency]
                              }`}
                            >
                              {item.urgency}
                            </span>
                            <span className="block mt-1 font-semibold text-[var(--admin-text)]">
                              {item.reasonDescription}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-base font-extrabold ${
                                  item.adherenceRate >= 80
                                    ? "text-emerald-700"
                                    : item.adherenceRate >= 60
                                    ? "text-amber-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {item.adherenceRate}%
                              </span>
                              <span className="text-xs text-[var(--admin-text-soft)]">
                                ({item.streakDays}d streak)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-bold text-[var(--admin-text)] block">
                              {item.medicineName || "Active maintenance medications"}
                            </span>
                            {item.gapDays && item.gapDays > 0 ? (
                              <span className="text-xs font-extrabold text-rose-700">
                                Overdue by {item.gapDays} days
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--admin-text-soft)]">Ongoing regimen</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {item.caregivers.length > 0 ? (
                              item.caregivers.map((cg) => (
                                <div key={cg.id} className="text-xs text-[var(--admin-text-muted)]">
                                  <span className="font-bold text-[var(--admin-text)]">{cg.name}</span>
                                  {cg.phone && (
                                    <span className="block text-xs text-[var(--admin-text-soft)]">
                                      {cg.phone}
                                    </span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-[var(--admin-text-soft)]">No caregiver</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.phone && (
                                <a
                                  href={`https://wa.me/${item.phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-xl border border-emerald-300 bg-emerald-50 p-2 text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                                  title="Open WhatsApp Chat"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => openCallModal(item)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0d6e5a] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#095243] shadow-xs transition"
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                                <span>Log Call</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Call History Card */}
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 sm:p-6 shadow-xs">
            <h4 className="font-bold text-sm text-[var(--admin-text)] mb-3">Recent Outreach Call History</h4>
            <div className="divide-y divide-[#f0f4f2]">
              {initialOutreachHistory.length === 0 ? (
                <p className="text-xs text-[var(--admin-text-soft)] py-4">No recent outreach calls logged.</p>
              ) : (
                initialOutreachHistory.map((h) => (
                  <div key={h.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--admin-text)]">{h.customerName}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 capitalize">
                          {h.callOutcome.replace("_", " ")}
                        </span>
                        {h.medicineName && (
                          <span className="text-[var(--admin-accent-text)] font-semibold">· {h.medicineName}</span>
                        )}
                      </div>
                      <p className="text-[var(--admin-text-muted)] mt-1">{h.notes || "Call completed."}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--admin-text-soft)]">
                        <span>Staff: {h.staffEmail}</span>
                        <span>Date: {formatDate(new Date(h.createdAt))}</span>
                        {h.nextFollowUpDate && (
                          <span className="text-teal-700 font-bold">
                            Next follow-up: {formatDate(new Date(h.nextFollowUpDate))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MED SYNC MANAGER ── */}
      {activeTab === "sync" && (
        <div className="space-y-6">
          {/* Active Enrollments */}
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base text-[var(--admin-text)]">Active Med Sync Enrollments</h4>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Patients whose chronic medications are automatically aligned to a single recurring anchor date.
                </p>
              </div>
            </div>

            <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3.5">Patient</th>
                    <th className="px-4 py-3.5">Monthly Anchor Day</th>
                    <th className="px-4 py-3.5">Next Refill Batch Date</th>
                    <th className="px-4 py-3.5">Fulfillment</th>
                    <th className="px-4 py-3.5">Synced Prescriptions</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f2]">
                  {initialEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[var(--admin-text-soft)]">
                        No patients enrolled yet. Review candidates below to enroll multi-medication patients.
                      </td>
                    </tr>
                  ) : (
                    initialEnrollments.map((e) => (
                      <tr key={e.id} className="hover:bg-[var(--admin-card-2)] transition">
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/customers/${e.customerId}`}
                            className="font-bold text-[var(--admin-text)] hover:text-[var(--admin-accent-text)] hover:underline block text-sm"
                          >
                            {e.customerName}
                          </Link>
                          <span className="text-[var(--admin-text-muted)] block">{e.phone || e.email}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-2xl bg-teal-100 px-3 py-1 text-xs font-extrabold text-[var(--admin-accent-text)]">
                            Day {e.anchorDay} of month
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-[var(--admin-text)]">
                            {e.nextSyncDate ? formatDate(new Date(e.nextSyncDate)) : "Pending schedule"}
                          </span>
                        </td>
                        <td className="px-4 py-4 capitalize font-semibold text-[var(--admin-text-muted)]">
                          {e.preferredPickup}
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-extrabold text-[var(--admin-accent-text)]">{e.syncedMedications.length}</span>
                          <span className="text-[var(--admin-text-muted)]"> of {e.totalMedications} medications</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() =>
                              openSyncModal({
                                customerId: e.customerId,
                                fullName: e.customerName,
                                anchorDay: e.anchorDay,
                              })
                            }
                            className="rounded-xl border border-[var(--admin-border)] px-3 py-1.5 text-xs font-bold text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition"
                          >
                            Edit Sync
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sync Candidates */}
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-base text-[var(--admin-text)]">Med Sync Candidates</h4>
              <p className="text-xs text-[var(--admin-text-muted)]">
                Patients with 2 or more maintenance medications with misaligned refill due dates.
              </p>
            </div>

            <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3.5">Patient</th>
                    <th className="px-4 py-3.5">Active Maintenance Regimen</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f2]">
                  {initialCandidates
                    .filter((c) => c.isCandidate)
                    .slice(0, 10)
                    .map((c) => (
                      <tr key={c.customerId} className="hover:bg-[var(--admin-card-2)] transition">
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/customers/${c.customerId}`}
                            className="font-bold text-[var(--admin-text)] hover:text-[var(--admin-accent-text)] hover:underline block text-sm"
                          >
                            {c.fullName}
                          </Link>
                          <span className="text-[var(--admin-text-muted)] block">{c.phone || c.email}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-extrabold text-[var(--admin-text)]">
                            {c.activeMedicationCount} maintenance prescriptions
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.prescriptions.slice(0, 4).map((p: any) => (
                              <span
                                key={p.id}
                                className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {p.medicineName}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                            Misaligned Due Dates
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => openSyncModal(c)}
                            className="rounded-xl bg-[#0d6e5a] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#095243] shadow-2xs transition"
                          >
                            Calculate & Enroll
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CHRONIC CARE & PRESCRIBER RENEWALS ── */}
      {activeTab === "chronic" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-2xs">
              <p className="text-xs font-medium text-[var(--admin-text-muted)]">Chronic Patients</p>
              <p className="mt-1 text-3xl font-extrabold text-[var(--admin-text)]">
                {initialChronicData.summary.totalChronicPatients}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-2xs">
              <p className="text-xs font-medium text-[var(--admin-text-muted)]">Maintenance Prescriptions</p>
              <p className="mt-1 text-3xl font-extrabold text-[var(--admin-accent-text)]">
                {initialChronicData.summary.totalChronicPrescriptions}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-2xs">
              <p className="text-xs font-medium text-[var(--admin-text-muted)]">Synchronized in Med Sync</p>
              <p className="mt-1 text-3xl font-extrabold text-teal-700">
                {initialChronicData.summary.syncedPrescriptionsCount}
              </p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-2xs">
              <p className="text-xs font-bold text-amber-900">Physician Renewal Needed</p>
              <p className="mt-1 text-3xl font-extrabold text-amber-900">
                {initialChronicData.summary.renewalNeededCount}
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCondition("all")}
              className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
                selectedCondition === "all"
                  ? "bg-[#0d6e5a] text-white shadow-2xs"
                  : "bg-[var(--admin-card)] text-[var(--admin-text-muted)] border border-[var(--admin-border)] hover:bg-[var(--admin-card-2)]"
              }`}
            >
              All Categories ({initialChronicData.chronicMedications.length})
            </button>
            {initialChronicData.summary.conditionBreakdown
              .filter((c) => c.count > 0)
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCondition(c.id)}
                  className={`rounded-2xl px-3.5 py-1.5 text-xs font-bold transition ${
                    selectedCondition === c.id
                      ? "bg-[#0d6e5a] text-white shadow-2xs"
                      : "bg-[var(--admin-card)] text-[var(--admin-text-muted)] border border-[var(--admin-border)] hover:bg-[var(--admin-card-2)]"
                  }`}
                >
                  {c.name} ({c.count})
                </button>
              ))}
          </div>

          {/* Table */}
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden shadow-xs">
            <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3.5">Patient</th>
                    <th className="px-4 py-3.5">Chronic Medication</th>
                    <th className="px-4 py-3.5">Condition Category</th>
                    <th className="px-4 py-3.5">Refills Remaining</th>
                    <th className="px-4 py-3.5">Next Refill Due</th>
                    <th className="px-4 py-3.5">Prescriber Details</th>
                    <th className="px-4 py-3.5 text-right">Renewal Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f2]">
                  {filteredChronicMeds.map((med) => (
                    <tr key={med.prescriptionId} className="hover:bg-[var(--admin-card-2)] transition">
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/customers/${med.customerId}`}
                          className="font-bold text-[var(--admin-text)] hover:text-[var(--admin-accent-text)] hover:underline block text-sm"
                        >
                          {med.customerName}
                        </Link>
                        <span className="text-[var(--admin-text-muted)] block">{med.phone || med.email}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--admin-text)] text-sm">{med.medicineName}</span>
                          {med.isSynced && (
                            <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-bold text-[var(--admin-accent-text)]">
                              Synced (Day {med.syncAnchorDay})
                            </span>
                          )}
                        </div>
                        {med.dosage && (
                          <span className="text-xs text-[var(--admin-text-muted)] block">{med.dosage}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="capitalize font-semibold text-[var(--admin-text-muted)]">
                          {med.chronicCondition.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {med.refillsRemaining <= 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-800">
                            <AlertTriangle className="h-3 w-3" />
                            {med.refillsRemaining} remaining
                          </span>
                        ) : (
                          <span className="font-bold text-[var(--admin-text)]">{med.refillsRemaining} left</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-[var(--admin-text)]">
                          {med.nextRefillDue ? formatDate(new Date(med.nextRefillDue)) : "TBD"}
                        </span>
                        <span className="block text-xs text-[var(--admin-text-soft)]">
                          {med.daysRemaining}d supply remaining
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-[var(--admin-text)] block">
                          {med.prescriber || "Attending Doctor"}
                        </span>
                        {med.prescriberEmail && (
                          <span className="text-xs text-[var(--admin-text-soft)]">{med.prescriberEmail}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {med.needsPrescriberRenewal ? (
                          <button
                            onClick={() => openRenewalModal(med)}
                            className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-2xs transition"
                          >
                            Request Renewal
                          </button>
                        ) : (
                          <Link
                            href={`/admin/prescriptions/${med.prescriptionId}`}
                            className="rounded-xl border border-[var(--admin-border)] px-3 py-1.5 text-xs font-bold text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] transition"
                          >
                            Prescription Details
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: REFILL LAPSE MATRIX ── */}
      {activeTab === "lapsed" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden shadow-xs">
            <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-4 py-3.5">Patient</th>
                    <th className="px-4 py-3.5">Prescription</th>
                    <th className="px-4 py-3.5">Overdue Gap</th>
                    <th className="px-4 py-3.5">Non-Adherence Risk</th>
                    <th className="px-4 py-3.5">Adherence Score</th>
                    <th className="px-4 py-3.5 text-right">Rapid Intervention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f4f2]">
                  {filteredLapsedPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[var(--admin-text-soft)]">
                        🎉 No severe refill lapses detected! All chronic patients on schedule.
                      </td>
                    </tr>
                  ) : (
                    filteredLapsedPatients.map((p) => (
                      <tr key={p.prescriptionId} className="hover:bg-[var(--admin-card-2)] transition">
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/customers/${p.customerId}`}
                            className="font-bold text-[var(--admin-text)] hover:text-[var(--admin-accent-text)] hover:underline block text-sm"
                          >
                            {p.customerName}
                          </Link>
                          <span className="text-[var(--admin-text-muted)] block">{p.phone || p.email}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-[var(--admin-text)] block text-sm">
                            {p.medicineName}
                          </span>
                          <span className="text-xs text-[var(--admin-text-soft)]">
                            Prescriber: {p.prescriber || "General"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-extrabold text-rose-700 text-sm">
                            {p.gapDays} days overdue
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${
                              p.riskLevel === "severe"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {p.riskLevel} Risk
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-extrabold text-[var(--admin-text)]">{p.adherenceRate}%</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() =>
                              openCallModal({
                                customerId: p.customerId,
                                customerName: p.customerName,
                                phone: p.phone,
                                email: p.email,
                                preferredCommunication: "phone",
                                adherenceRate: p.adherenceRate,
                                streakDays: 0,
                                reason: "refill_lapse",
                                urgency: p.riskLevel === "severe" ? "critical" : "high",
                                reasonDescription: `Lapsed by ${p.gapDays} days on ${p.medicineName}`,
                                prescriptionId: p.prescriptionId,
                                medicineName: p.medicineName,
                                caregivers: p.caregivers,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0d6e5a] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#095243] shadow-xs transition"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>Intervene</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: LOG FOLLOW-UP CALL & DISPATCH OUTREACH ── */}
      {callModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[var(--admin-card)] p-6 shadow-2xl border border-[var(--admin-border)] max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--admin-accent-text)]">
                  Pharmacist Clinical Outreach
                </span>
                <h3 className="font-extrabold text-lg text-[var(--admin-text)]">
                  {callModalItem.customerName}
                </h3>
              </div>
              <button
                onClick={() => setCallModalItem(null)}
                className="rounded-full p-1 text-[var(--admin-text-soft)] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-teal-50 p-3.5 text-xs text-[var(--admin-accent-text)] border border-teal-100">
              <span className="font-bold block">Clinical Trigger: {callModalItem.reasonDescription}</span>
              <div className="mt-1 flex items-center gap-4 text-[var(--admin-text-muted)]">
                {callModalItem.phone && (
                  <a href={`tel:${callModalItem.phone}`} className="hover:underline font-mono text-teal-800 font-bold">
                    📞 {callModalItem.phone}
                  </a>
                )}
                {callModalItem.email && <span>✉️ {callModalItem.email}</span>}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">Call / Contact Outcome</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value as any)}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 bg-[var(--admin-card)] text-[var(--admin-text)] focus:border-[#0d6e5a]"
                >
                  <option value="reached_patient">Reached Patient</option>
                  <option value="reached_caregiver">Reached Designated Caregiver / Family</option>
                  <option value="voicemail">Left Voicemail Message</option>
                  <option value="busy_no_answer">Busy / No Answer</option>
                  <option value="wrong_number">Wrong Number</option>
                  <option value="refused">Patient Declined Outreach</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">
                  Primary Adherence Barrier Identified
                </label>
                <select
                  value={barrier}
                  onChange={(e) => setBarrier(e.target.value as any)}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 bg-[var(--admin-card)] text-[var(--admin-text)] focus:border-[#0d6e5a]"
                >
                  <option value="none">No Barrier / Routine Educational Check-in</option>
                  <option value="side_effects">Experiencing Medication Side Effects</option>
                  <option value="cost">Financial / High Drug Cost Barrier</option>
                  <option value="regimen_complexity">Regimen Complexity / Confusing Schedule</option>
                  <option value="forgetfulness">Forgetfulness / Busy Routine</option>
                  <option value="feeling_better">Felt Better & Stopped Treatment Early</option>
                  <option value="transport">Transportation / Pickup Inconvenience</option>
                  <option value="other">Other Clinical Barrier</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">
                  Pharmacist Intervention & Action Taken
                </label>
                <select
                  value={clinicalAction}
                  onChange={(e) => setClinicalAction(e.target.value as any)}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 bg-[var(--admin-card)] text-[var(--admin-text)] focus:border-[#0d6e5a]"
                >
                  <option value="education">Provided Medication Education & Compliance Counseling</option>
                  <option value="adjusted_schedule">Adjusted Daily Reminder Time / Dose Slot</option>
                  <option value="enrolled_sync">Enrolled in Refill Synchronization (Med Sync)</option>
                  <option value="prescriber_consult">Initiated Prescriber Consultation for Regimen Change</option>
                  <option value="generic_substitution">Arranged Generic / Affordable Alternative</option>
                  <option value="scheduled_followup">Scheduled Next Follow-Up Call</option>
                  <option value="none">General Consultation Documented</option>
                </select>
              </div>

              {/* Message template selector */}
              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">
                  Automated Outreach Template Preview
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => handleTemplateChange("default")}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                      selectedMessageTemplate === "default"
                        ? "bg-[#0d6e5a] text-white"
                        : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]"
                    }`}
                  >
                    General Care
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange("missed_dose")}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                      selectedMessageTemplate === "missed_dose"
                        ? "bg-[#0d6e5a] text-white"
                        : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]"
                    }`}
                  >
                    Missed Dose
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange("refill_overdue")}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                      selectedMessageTemplate === "refill_overdue"
                        ? "bg-[#0d6e5a] text-white"
                        : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]"
                    }`}
                  >
                    Refill Overdue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTemplateChange("med_sync_invite")}
                    className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                      selectedMessageTemplate === "med_sync_invite"
                        ? "bg-[#0d6e5a] text-white"
                        : "bg-[var(--admin-card-2)] text-[var(--admin-text-muted)] border border-[var(--admin-border)]"
                    }`}
                  >
                    Med Sync Invite
                  </button>
                </div>
                <textarea
                  value={customOutreachText}
                  onChange={(e) => setCustomOutreachText(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 text-[var(--admin-text)] focus:border-[#0d6e5a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">Clinical Pharmacist Notes</label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g. Advised patient on taking with meals, side effects discussed..."
                  rows={2}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 text-[var(--admin-text)] focus:border-[#0d6e5a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 bg-[var(--admin-card)] text-[var(--admin-text)] focus:border-[#0d6e5a]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={() => setCallModalItem(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogCallSubmit}
                disabled={submittingCall}
                className="rounded-xl bg-[#0d6e5a] px-4 py-2 text-xs font-bold text-white hover:bg-[#095243] shadow-2xs transition"
              >
                {submittingCall ? "Recording Call…" : "Save Clinical Record & Send Summary"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: MED SYNC ENROLLMENT ── */}
      {syncModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[var(--admin-card)] p-6 shadow-2xl border border-[var(--admin-border)] max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--admin-accent-text)]">
                  Med Sync Builder
                </span>
                <h3 className="font-extrabold text-lg text-[var(--admin-text)]">
                  {syncModalCandidate.fullName}
                </h3>
              </div>
              <button
                onClick={() => setSyncModalCandidate(null)}
                className="rounded-full p-1 text-[var(--admin-text-soft)] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">
                  Select Synchronized Monthly Anchor Day
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 5, 10, 15, 20, 25].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleRecalculateSync(d)}
                      className={`rounded-2xl p-2.5 text-center border font-bold ${
                        syncAnchorDay === d
                          ? "bg-[#0d6e5a] text-white border-[#0d6e5a] shadow-2xs"
                          : "bg-[var(--admin-card)] text-[var(--admin-text)] border-[var(--admin-border)] hover:bg-[var(--admin-card-2)]"
                      }`}
                    >
                      Day {d}
                    </button>
                  ))}
                </div>
              </div>

              {loadingSyncPlan ? (
                <div className="py-8 text-center text-[var(--admin-text-soft)]">Calculating bridge short-fills…</div>
              ) : syncPlanData ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-teal-50 p-3.5 border border-teal-100">
                    <span className="font-bold text-[var(--admin-accent-text)] block">
                      Target First Unified Refill Date
                    </span>
                    <span className="text-sm font-extrabold text-[var(--admin-text)]">
                      {formatDate(new Date(syncPlanData.targetSyncDate))}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-[var(--admin-text)] block">Prescriptions to Align</span>
                    {syncPlanData.medications.map((m: any) => (
                      <div
                        key={m.prescriptionId}
                        className="rounded-2xl border border-[var(--admin-border)] p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-[var(--admin-text)] block">{m.medicineName}</span>
                          <span className="text-xs text-[var(--admin-text-muted)]">
                            Current supply: {m.currentDaysRemaining}d · Bridge: +{m.bridgeQuantity}{" "}
                            units ({m.bridgeDaysNeeded}d)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[var(--admin-text)]">
                            ${m.syncedMonthlyCost.toFixed(2)}/mo
                          </span>
                          {m.bridgeCost > 0 && (
                            <span className="block text-xs text-amber-700 font-bold">
                              +${m.bridgeCost.toFixed(2)} bridge
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-black/5 pt-3 flex items-center justify-between font-bold text-xs">
                    <span>One-Time Bridge Alignment Total:</span>
                    <span>${syncPlanData.totalBridgeCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between font-extrabold text-sm text-[var(--admin-accent-text)]">
                    <span>Ongoing Monthly Total:</span>
                    <span>${syncPlanData.totalMonthlyCost.toFixed(2)}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={() => setSyncModalCandidate(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEnrollSyncSubmit}
                disabled={submittingSync || !syncPlanData}
                className="rounded-xl bg-[#0d6e5a] px-4 py-2 text-xs font-bold text-white hover:bg-[#095243] shadow-2xs transition"
              >
                {submittingSync ? "Enrolling…" : "Confirm Med Sync Enrollment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: PHYSICIAN RENEWAL REQUEST ── */}
      {renewalModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[var(--admin-card)] p-6 shadow-2xl border border-[var(--admin-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Physician Refill Authorization
                </span>
                <h3 className="font-extrabold text-lg text-[var(--admin-text)]">
                  {renewalModalItem.medicineName}
                </h3>
              </div>
              <button
                onClick={() => setRenewalModalItem(null)}
                className="rounded-full p-1 text-[var(--admin-text-soft)] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 text-amber-900">
                <p className="font-semibold">
                  Patient: <strong>{renewalModalItem.customerName}</strong>
                </p>
                <p className="mt-0.5">
                  Attending Prescriber: <strong>{renewalModalItem.prescriber || "General Physician"}</strong>
                </p>
                <p className="text-xs mt-1 text-amber-800 font-bold">
                  Remaining refills: {renewalModalItem.refillsRemaining}
                </p>
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">
                  Additional Maintenance Refills Requested
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={additionalRefills}
                  onChange={(e) => setAdditionalRefills(parseInt(e.target.value, 10) || 6)}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 text-[var(--admin-text)] focus:border-[#0d6e5a]"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">Prescriber Contact Channel</label>
                <select
                  value={renewalContactMethod}
                  onChange={(e) => setRenewalContactMethod(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 bg-[var(--admin-card)] text-[var(--admin-text)] focus:border-[#0d6e5a]"
                >
                  <option value="email">Prescriber Email Inquiry</option>
                  <option value="phone">Direct Clinic Telephone</option>
                  <option value="whatsapp">Doctor WhatsApp Channel</option>
                  <option value="fax">Electronic Fax</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[var(--admin-text)] mb-1">
                  Clinical Inquiry Message
                </label>
                <textarea
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--admin-border)] p-2.5 text-[var(--admin-text)] focus:border-[#0d6e5a]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={() => setRenewalModalItem(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenewalSubmit}
                disabled={submittingRenewal}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-2xs transition"
              >
                {submittingRenewal ? "Dispatching…" : "Dispatch Physician Renewal Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
