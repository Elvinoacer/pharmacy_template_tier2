"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  Stethoscope,
  AlertTriangle,
  FileText,
  PhoneCall,
  MessageSquare,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  Paperclip,
  Check,
  AlertCircle,
  HelpCircle,
  Plus,
  ArrowRight,
  Send,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  Package,
  Activity,
  Layers,
  Inbox,
  UploadCloud,
  QrCode,
  Users,
} from "lucide-react";
import {
  adminVerifyPrescriptionAction,
  adminFlagUnclearPrescriptionAction,
  adminLogClarificationAction,
  adminReviewPrescriptionAction,
  adminUpdatePrescriptionLifecycleStatusAction,
  adminConvertToDispensingOrderAction,
  type ActionState,
} from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import {
  INTAKE_CHANNEL_LABELS,
  PRIMARY_LIFECYCLE_STAGES,
  EXCEPTION_LIFECYCLE_STATUSES,
  LIFECYCLE_STATUS_LABELS,
} from "@/app/lib/prescription-lifecycle-shared";
import { formatDateTime, formatDate } from "@/app/lib/time";

export type ClarificationLogRow = {
  id: string;
  contactMethod: string;
  contactedTo: string;
  inquiryDetails: string;
  doctorResponse: string | null;
  resolved: boolean;
  createdAt: Date | string;
  staff?: { email: string } | null;
};

export type PrescriptionReviewData = {
  id: string;
  customerId: string;
  medicineName: string;
  dosage: string | null;
  schedule: string | null;
  quantity: number | null;
  daysSupply: number | null;
  refillsRemaining: number | null;
  unitPrice: number | null;
  status: string;
  lifecycleStatus: string | null;
  intakeChannel: string | null;
  patientVerified: boolean;
  patientVerifiedAt: Date | string | null;
  patientVerificationNotes: string | null;
  prescriber: string | null;
  prescriberLicense: string | null;
  prescriberPhone: string | null;
  prescriberEmail: string | null;
  prescriberFacility: string | null;
  prescriberVerified: boolean;
  prescriberVerifiedAt: Date | string | null;
  isUnclear: boolean;
  unclearReason: string | null;
  clarificationStatus: string;
  clarificationNotes: string | null;
  clarificationContactedAt: Date | string | null;
  clarificationResolvedAt: Date | string | null;
  reviewedAt: Date | string | null;
  reviewDecision: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  holdReason: string | null;
  attachmentUrls: string[];
  dispensingOrderId: string | null;
  dispatchedAt: Date | string | null;
  createdAt: Date | string;
  customer?: {
    id: string;
    fullName: string;
    phone: string | null;
    gender?: string | null;
    dateOfBirth?: Date | string | null;
    user?: { email: string } | null;
  } | null;
  medication?: {
    id: string;
    currentStock: number;
    price: number;
    medicationMaster?: { name: string } | null;
  } | null;
  reviewedBy?: { email: string } | null;
  clarificationLogs: ClarificationLogRow[];
};

function getChannelIcon(channelKey: string) {
  switch (channelKey) {
    case "whatsapp":
      return MessageSquare;
    case "email":
      return Inbox;
    case "patient_upload":
      return UploadCloud;
    case "doctor_referral":
      return Stethoscope;
    case "hospital_system":
      return Building2;
    case "electronic_prescription":
      return QrCode;
    case "phone_communication":
      return PhoneCall;
    case "in_person_consultation":
      return Users;
    default:
      return FileText;
  }
}

export function PrescriptionReviewCockpit({
  rx,
}: {
  rx: PrescriptionReviewData;
}) {
  const [activeTab, setActiveTab] = useState<"review" | "verification" | "clarification" | "attachments">("review");
  const [isPending, setIsPending] = useState(false);

  // Verification form state
  const [patientVerified, setPatientVerified] = useState(rx.patientVerified);
  const [patientNotes, setPatientNotes] = useState(rx.patientVerificationNotes || "");
  const [prescriberVerified, setPrescriberVerified] = useState(rx.prescriberVerified);
  const [prescriber, setPrescriber] = useState(rx.prescriber || "");
  const [prescriberLicense, setPrescriberLicense] = useState(rx.prescriberLicense || "");
  const [prescriberPhone, setPrescriberPhone] = useState(rx.prescriberPhone || "");
  const [prescriberEmail, setPrescriberEmail] = useState(rx.prescriberEmail || "");
  const [prescriberFacility, setPrescriberFacility] = useState(rx.prescriberFacility || "");

  // Clarification form state
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [contactMethod, setContactMethod] = useState("phone");
  const [contactedTo, setContactedTo] = useState(rx.prescriber || rx.prescriberPhone || "");
  const [inquiryDetails, setInquiryDetails] = useState(rx.unclearReason || "");
  const [doctorResponse, setDoctorResponse] = useState("");
  const [resolveClarification, setResolveClarification] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "rejected" | "on_hold">("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [holdReason, setHoldReason] = useState("");

  const currentLifecycle = rx.lifecycleStatus || (rx.status === "on_hold" ? "on_hold" : "received");
  const currentStageMeta = LIFECYCLE_STATUS_LABELS[currentLifecycle as keyof typeof LIFECYCLE_STATUS_LABELS] || LIFECYCLE_STATUS_LABELS.received;
  const isExceptionStatus = EXCEPTION_LIFECYCLE_STATUSES.includes(currentLifecycle as any);
  const channelMeta = INTAKE_CHANNEL_LABELS[rx.intakeChannel as keyof typeof INTAKE_CHANNEL_LABELS] || INTAKE_CHANNEL_LABELS.in_person_consultation;
  const ChannelIcon = getChannelIcon(rx.intakeChannel || "in_person_consultation");

  // Handle Save Verification
  async function handleSaveVerification(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData();
    fd.append("prescriptionId", rx.id);
    fd.append("patientVerified", patientVerified ? "true" : "false");
    fd.append("patientNotes", patientNotes);
    fd.append("prescriberVerified", prescriberVerified ? "true" : "false");
    fd.append("prescriber", prescriber);
    fd.append("prescriberLicense", prescriberLicense);
    fd.append("prescriberPhone", prescriberPhone);
    fd.append("prescriberEmail", prescriberEmail);
    fd.append("prescriberFacility", prescriberFacility);

    const res = await adminVerifyPrescriptionAction({} as ActionState, fd);
    setIsPending(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.success || "Verification details updated.");
      window.location.reload();
    }
  }

  // Handle Log Clarification
  async function handleLogClarification(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData();
    fd.append("prescriptionId", rx.id);
    fd.append("contactMethod", contactMethod);
    fd.append("contactedTo", contactedTo);
    fd.append("inquiryDetails", inquiryDetails);
    fd.append("doctorResponse", doctorResponse);
    fd.append("resolved", resolveClarification ? "true" : "false");

    const res = await adminLogClarificationAction({} as ActionState, fd);
    setIsPending(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.success || "Prescriber communication logged.");
      setShowClarifyModal(false);
      window.location.reload();
    }
  }

  // Handle Review Decision Submit
  async function handleReviewDecision(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData();
    fd.append("prescriptionId", rx.id);
    fd.append("decision", reviewDecision);
    fd.append("notes", reviewNotes);
    fd.append("rejectionReason", rejectionReason);
    fd.append("holdReason", holdReason);

    const res = await adminReviewPrescriptionAction({} as ActionState, fd);
    setIsPending(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.success || "Review decision recorded.");
      setShowReviewModal(false);
      window.location.reload();
    }
  }

  // Handle Convert to Dispensing Order
  async function handleConvertToDispensingOrder() {
    if (!confirm("Convert this approved prescription into a commercial dispensing order? Stock will be allocated.")) return;
    setIsPending(true);
    const fd = new FormData();
    fd.append("prescriptionId", rx.id);
    fd.append("markDispatched", "false");
    fd.append("markPaid", "false");

    const res = await adminConvertToDispensingOrderAction({} as ActionState, fd);
    setIsPending(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.success || "Prescription converted to Dispensing Order.");
      window.location.reload();
    }
  }

  // Handle Lifecycle Quick Transition
  async function handleTransitionStatus(targetStatus: string) {
    setIsPending(true);
    const fd = new FormData();
    fd.append("prescriptionId", rx.id);
    fd.append("newStatus", targetStatus);

    const res = await adminUpdatePrescriptionLifecycleStatusAction({} as ActionState, fd);
    setIsPending(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success(res.success || `Status updated to ${targetStatus}.`);
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Prescription Lifecycle Stepper & Header Cockpit ── */}
      <div className="rounded-3xl border border-[var(--admin-border)] bg-gradient-to-b from-[var(--admin-card)] to-[var(--admin-inset)] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--admin-border)] pb-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold shadow-sm ${currentStageMeta.badgeClass}`}>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                {currentStageMeta.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-1 text-xs font-semibold admin-text">
                <ChannelIcon className="h-3.5 w-3.5 text-emerald-600" />
                Intake: <strong>{channelMeta.label}</strong>
              </span>
              {rx.isUnclear && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <HelpCircle className="h-3.5 w-3.5" /> Unclear Script
                </span>
              )}
            </div>
            <p className="text-xs admin-soft">{currentStageMeta.description}</p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowReviewModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/20 transition hover:brightness-110 active:scale-95"
            >
              <ShieldCheck className="h-4 w-4" /> Professional Review
            </button>

            {!rx.dispensingOrderId ? (
              <button
                type="button"
                onClick={handleConvertToDispensingOrder}
                disabled={Boolean(isPending || (rx.medication && rx.medication.currentStock < (rx.quantity || 1)))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                <ShoppingBag className="h-4 w-4" /> Convert to Dispensing Order
              </button>
            ) : (
              <Link
                href={`/admin/orders/${rx.dispensingOrderId}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 transition hover:bg-blue-500/20"
              >
                <ShoppingBag className="h-4 w-4" /> View Dispensing Order #{rx.dispensingOrderId.slice(0, 8)}
              </Link>
            )}
          </div>
        </div>

        {/* ── Interactive Progression Pipeline Stepper ── */}
        {!isExceptionStatus ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider admin-soft inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-600" /> Lifecycle Stage Stepper (Click stage to advance)
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Step {currentStageMeta.stepIndex} of {PRIMARY_LIFECYCLE_STAGES.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
              {PRIMARY_LIFECYCLE_STAGES.map((stage, idx) => {
                const stageInfo = LIFECYCLE_STATUS_LABELS[stage];
                const currentIndex = currentStageMeta.stepIndex;
                const isCurrent = stage === currentLifecycle;
                const isCompleted = stageInfo.stepIndex < currentIndex;

                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => handleTransitionStatus(stage)}
                    disabled={isPending}
                    className={`relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition ${
                      isCurrent
                        ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-sm"
                        : isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15"
                        : "border-[var(--admin-border)] bg-[var(--admin-card)] opacity-60 hover:opacity-100 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isCurrent
                          ? "bg-emerald-600 text-white shadow-sm"
                          : isCompleted
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-black/10 admin-soft"
                      }`}>
                        {isCompleted ? "✓" : idx + 1}
                      </span>
                      <span className={`text-xs font-bold ${isCurrent ? "text-emerald-800 dark:text-emerald-300" : "admin-text"}`}>
                        {stageInfo.label}
                      </span>
                    </div>
                    <span className="text-xs admin-soft leading-tight line-clamp-2">
                      {stageInfo.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Exception & Hold Banner */
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Prescription is currently {currentStageMeta.label}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Reason: <strong>{rx.holdReason || rx.rejectionReason || currentStageMeta.description}</strong>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleTransitionStatus("under_review")}
                    className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95"
                  >
                    Re-open for Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransitionStatus("approved")}
                    className="rounded-xl border border-amber-600/40 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-[var(--admin-card)] active:scale-95"
                  >
                    Direct Approve for Dispensing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Unclear Prescription Alert (if flagged) ── */}
      {rx.isUnclear && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Prescription Ambiguity / Unclear Order
                </h4>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                  Flagged reason: <strong>{rx.unclearReason || "Pharmacist clarification required"}</strong>
                  {rx.clarificationStatus === "contacted" && " · Doctor contacted, awaiting response"}
                  {rx.clarificationStatus === "resolved" && " · Clarification resolved"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowClarifyModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95 shrink-0 shadow-sm"
            >
              <PhoneCall className="h-3.5 w-3.5" /> Contact Doctor for Clarification
            </button>
          </div>
        </div>
      )}

      {/* ── Cockpit Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--admin-border)] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("review")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
            activeTab === "review"
              ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] ring-2 ring-[var(--admin-accent)]/20"
              : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Clinical Summary &amp; Review
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("verification")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
            activeTab === "verification"
              ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] ring-2 ring-[var(--admin-accent)]/20"
              : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" /> Patient &amp; Prescriber Verification
          {(!rx.patientVerified || !rx.prescriberVerified) && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("clarification")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
            activeTab === "clarification"
              ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] ring-2 ring-[var(--admin-accent)]/20"
              : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Doctor Communications ({rx.clarificationLogs.length})
        </button>

        {rx.attachmentUrls.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("attachments")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
              activeTab === "attachments"
                ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] ring-2 ring-[var(--admin-accent)]/20"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
            }`}
          >
            <Paperclip className="h-3.5 w-3.5" /> Scans &amp; Attachments ({rx.attachmentUrls.length})
          </button>
        )}
      </div>

      {/* ── Tab 1: Review & Summary ── */}
      {activeTab === "review" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-4">
                <div>
                  <h3 className="text-sm font-bold admin-text">Prescription Intake Record</h3>
                  <p className="text-xs admin-soft">Origin, dosing formula, and duration</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <ChannelIcon className="h-3.5 w-3.5" /> {channelMeta.label}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 text-xs">
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
                  <span className="text-xs font-bold uppercase admin-soft block mb-1">Medication</span>
                  <span className="font-extrabold text-sm admin-text">{rx.medicineName}</span>
                </div>
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
                  <span className="text-xs font-bold uppercase admin-soft block mb-1">Dosage &amp; Frequency</span>
                  <span className="font-bold admin-text">{rx.dosage || "1 dose"}</span>
                  {rx.schedule && <p className="text-xs admin-soft mt-0.5">{rx.schedule}</p>}
                </div>
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
                  <span className="text-xs font-bold uppercase admin-soft block mb-1">Total Quantity</span>
                  <span className="font-extrabold text-sm admin-text">{rx.quantity ?? 1} units</span>
                  <p className="text-xs admin-soft mt-0.5">{rx.daysSupply ?? 30} days course supply</p>
                </div>
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
                  <span className="text-xs font-bold uppercase admin-soft block mb-1">Refills Authorized</span>
                  <span className="font-bold admin-text">{rx.refillsRemaining ?? 0} refills left</span>
                </div>
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
                  <span className="text-xs font-bold uppercase admin-soft block mb-1">Received On</span>
                  <span className="font-bold admin-text">{formatDateTime(rx.createdAt)}</span>
                </div>
                <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5">
                  <span className="text-xs font-bold uppercase admin-soft block mb-1">Catalogue Stock</span>
                  <span className={`font-bold inline-flex items-center gap-1 ${
                    rx.medication && rx.medication.currentStock >= (rx.quantity || 1)
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      rx.medication && rx.medication.currentStock >= (rx.quantity || 1)
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`} />
                    {rx.medication ? `${rx.medication.currentStock} in stock` : "Not catalogue linked"}
                  </span>
                </div>
              </div>
            </div>

            {/* Pharmacist Review Notes */}
            {rx.reviewNotes && (
              <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h3>Pharmacist Clinical Review Notes</h3>
                </div>
                <p className="text-xs admin-text leading-relaxed whitespace-pre-wrap rounded-2xl bg-[var(--admin-inset)] p-4 border border-[var(--admin-border)]">
                  {rx.reviewNotes}
                </p>
                {rx.reviewedBy && (
                  <p className="text-xs admin-soft">
                    Recorded by <strong>{rx.reviewedBy.email}</strong> on {rx.reviewedAt ? formatDateTime(rx.reviewedAt) : "—"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Side Verification Badges */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold admin-text">Verification Badges</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-[var(--admin-inset)] p-3 border border-[var(--admin-border)]">
                  <span className="font-semibold admin-text inline-flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" /> Patient Identity
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                    rx.patientVerified ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700"
                  }`}>
                    {rx.patientVerified ? "✓ Verified" : "Pending"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[var(--admin-inset)] p-3 border border-[var(--admin-border)]">
                  <span className="font-semibold admin-text inline-flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 text-emerald-600" /> Prescriber Credentials
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                    rx.prescriberVerified ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700"
                  }`}>
                    {rx.prescriberVerified ? "✓ Verified" : "Pending"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[var(--admin-inset)] p-3 border border-[var(--admin-border)]">
                  <span className="font-semibold admin-text inline-flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4 text-emerald-600" /> Clinical Clarity
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                    !rx.isUnclear ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700"
                  }`}>
                    {!rx.isUnclear ? "✓ Clear Order" : "Flagged Unclear"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("verification")}
                className="w-full rounded-2xl bg-[var(--admin-inset)] py-2.5 text-xs font-bold admin-accent-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)] transition"
              >
                Open Verification Panel →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Verification Panel ── */}
      {activeTab === "verification" && (
        <form onSubmit={handleSaveVerification} className="grid gap-5 lg:grid-cols-2">
          {/* Patient verification card */}
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-3">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold admin-text">Patient Identity &amp; Record Verification</h3>
                <p className="text-xs admin-soft">Verify patient identity, allergies, and contact file</p>
              </div>
            </div>

            {rx.customer && (
              <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 text-xs space-y-1.5">
                <p className="font-extrabold text-sm admin-text">{rx.customer.fullName}</p>
                <p className="admin-muted">Phone: <strong>{rx.customer.phone || "—"}</strong> · Gender: {rx.customer.gender || "—"}</p>
                {rx.customer.dateOfBirth && <p className="admin-soft">DOB: {formatDate(rx.customer.dateOfBirth)}</p>}
                {rx.customer.user?.email && <p className="admin-soft font-mono">{rx.customer.user.email}</p>}
              </div>
            )}

            <div className="flex items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
              <label className="flex items-center gap-3 cursor-pointer text-xs font-bold admin-text">
                <input
                  type="checkbox"
                  checked={patientVerified}
                  onChange={(e) => setPatientVerified(e.target.checked)}
                  className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Confirm patient identity &amp; clinical file verified</span>
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold admin-muted mb-1 block">Patient Verification Notes</label>
              <textarea
                rows={3}
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Confirmed ID with photo ID, verified no known penicillin allergies..."
                className="input-admin text-xs resize-y"
              />
            </div>
          </div>

          {/* Prescriber verification card */}
          <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[var(--admin-border)] pb-3">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold admin-text">Prescriber Credentials Verification</h3>
                <p className="text-xs admin-soft">Practitioner registration, board license, and clinic file</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold admin-muted mb-1 block">Prescriber Name</label>
                <input
                  value={prescriber}
                  onChange={(e) => setPrescriber(e.target.value)}
                  placeholder="e.g. Dr. Jane Mutua, MD"
                  className="input-admin text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold admin-muted mb-1 block">KMPDC / Medical License #</label>
                  <input
                    value={prescriberLicense}
                    onChange={(e) => setPrescriberLicense(e.target.value)}
                    placeholder="KMPDC-A48291"
                    className="input-admin text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold admin-muted mb-1 block">Hospital / Facility</label>
                  <input
                    value={prescriberFacility}
                    onChange={(e) => setPrescriberFacility(e.target.value)}
                    placeholder="e.g. Nairobi Hospital"
                    className="input-admin text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold admin-muted mb-1 block">Contact Phone</label>
                  <input
                    value={prescriberPhone}
                    onChange={(e) => setPrescriberPhone(e.target.value)}
                    placeholder="+254 7..."
                    className="input-admin text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold admin-muted mb-1 block">Email</label>
                  <input
                    value={prescriberEmail}
                    onChange={(e) => setPrescriberEmail(e.target.value)}
                    placeholder="doctor@hospital.org"
                    className="input-admin text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
                <label className="flex items-center gap-3 cursor-pointer text-xs font-bold admin-text">
                  <input
                    type="checkbox"
                    checked={prescriberVerified}
                    onChange={(e) => setPrescriberVerified(e.target.checked)}
                    className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Prescriber license &amp; medical credentials verified</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn-admin w-full text-xs font-bold py-2.5 rounded-xl shadow-sm"
            >
              {isPending ? "Saving..." : "Save Verification Credentials"}
            </button>
          </div>
        </form>
      )}

      {/* ── Tab 3: Prescriber Communications ── */}
      {activeTab === "clarification" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold admin-text">Prescriber Communication &amp; Clarification Log</h3>
              <p className="text-xs admin-soft">Record doctor phone calls, WhatsApp messages, and dosage resolutions</p>
            </div>
            <button
              type="button"
              onClick={() => setShowClarifyModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Log Doctor Contact
            </button>
          </div>

          {rx.clarificationLogs.length === 0 ? (
            <div className="rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-10 text-center shadow-sm">
              <PhoneCall className="mx-auto h-10 w-10 text-emerald-600 opacity-60" />
              <h4 className="mt-3 text-sm font-bold admin-text">No Doctor Communications Recorded</h4>
              <p className="mt-1 text-xs admin-soft max-w-md mx-auto">
                Log phone discussions, WhatsApp inquiries, or dosage clarifications with the prescribing doctor.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rx.clarificationLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 text-xs space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs admin-text capitalize inline-flex items-center gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5 text-emerald-600" /> {log.contactMethod} with {log.contactedTo}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      log.resolved ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700"
                    }`}>
                      {log.resolved ? "✓ Resolved" : "Awaiting response"}
                    </span>
                  </div>
                  <p className="admin-text leading-relaxed">
                    <strong>Inquiry:</strong> {log.inquiryDetails}
                  </p>
                  {log.doctorResponse && (
                    <div className="rounded-xl bg-[var(--admin-inset)] p-3 border border-[var(--admin-border)]">
                      <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Doctor's response / instruction:
                      </p>
                      <p className="admin-text mt-0.5">{log.doctorResponse}</p>
                    </div>
                  )}
                  <p className="text-xs admin-soft">
                    Logged on {formatDateTime(log.createdAt)} {log.staff && `by ${log.staff.email}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Attachments ── */}
      {activeTab === "attachments" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold admin-text">Prescription Source Files &amp; Scans</h3>
            <p className="text-xs admin-soft">Physical script scans, WhatsApp photos, or electronic referral PDFs</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {rx.attachmentUrls.map((url, i) => (
              <div key={i} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 text-xs space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold admin-text">Source Document #{i + 1}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Open Document <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="truncate font-mono text-xs admin-soft bg-[var(--admin-inset)] p-2.5 rounded-xl border border-[var(--admin-border)]">
                  {url}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Doctor Clarification Modal ── */}
      {showClarifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <PhoneCall className="h-5 w-5" />
                <h3 className="text-sm font-bold admin-text">Log Doctor Clarification</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClarifyModal(false)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogClarification} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold admin-muted mb-1 block">Contact Method</label>
                  <select
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="input-admin text-xs"
                  >
                    <option value="phone">Phone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="email">Email</option>
                    <option value="in_person">In-Person Consultation</option>
                    <option value="fax">Fax / Inter-clinic</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold admin-muted mb-1 block">Practitioner Contacted</label>
                  <input
                    value={contactedTo}
                    onChange={(e) => setContactedTo(e.target.value)}
                    placeholder="Dr. Full Name / Phone"
                    className="input-admin text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold admin-muted mb-1 block">Clarification Question / Ambiguity</label>
                <textarea
                  rows={2}
                  value={inquiryDetails}
                  onChange={(e) => setInquiryDetails(e.target.value)}
                  placeholder="Requested dosage clarification for 500mg vs 250mg, illegible frequency..."
                  className="input-admin text-xs resize-y"
                  required
                />
              </div>

              <div>
                <label className="font-semibold admin-muted mb-1 block">Doctor's Response / Instructions</label>
                <textarea
                  rows={2}
                  value={doctorResponse}
                  onChange={(e) => setDoctorResponse(e.target.value)}
                  placeholder="Doctor confirmed 500mg twice daily after food..."
                  className="input-admin text-xs resize-y"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--admin-inset)] p-3 border border-[var(--admin-border)]">
                <label className="flex items-center gap-2 cursor-pointer font-bold admin-text">
                  <input
                    type="checkbox"
                    checked={resolveClarification}
                    onChange={(e) => setResolveClarification(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mark ambiguity as resolved (remove unclear hold)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setShowClarifyModal(false)}
                  className="btn-admin-secondary text-xs px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-admin text-xs px-4 py-2 rounded-xl"
                >
                  {isPending ? "Recording..." : "Save Communication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Professional Review Modal ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
                <h3 className="text-sm font-bold admin-text">Pharmacist Professional Review</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewDecision} className="space-y-4 text-xs">
              <div>
                <label className="font-bold admin-muted mb-2 block">Select Clinical Review Decision</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("approved")}
                    className={`rounded-2xl border p-3 text-center font-bold transition ${
                      reviewDecision === "approved"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/40"
                        : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-text"
                    }`}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("on_hold")}
                    className={`rounded-2xl border p-3 text-center font-bold transition ${
                      reviewDecision === "on_hold"
                        ? "border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/40"
                        : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-text"
                    }`}
                  >
                    ⏸ Place On Hold
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("rejected")}
                    className={`rounded-2xl border p-3 text-center font-bold transition ${
                      reviewDecision === "rejected"
                        ? "border-rose-500 bg-rose-500/20 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/40"
                        : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-text"
                    }`}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>

              {reviewDecision === "rejected" && (
                <div>
                  <label className="font-bold text-rose-600 mb-1 block">Clinical Rejection Rationale *</label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contraindicated with current medications, illegal dose, unauthorized practitioner..."
                    className="input-admin text-xs border-rose-500/40"
                    required
                  />
                </div>
              )}

              {reviewDecision === "on_hold" && (
                <div>
                  <label className="font-bold text-amber-600 mb-1 block">Reason for Clinical Hold *</label>
                  <textarea
                    rows={2}
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Awaiting doctor clarification on dosage, waiting for inventory stock..."
                    className="input-admin text-xs border-amber-500/40"
                    required
                  />
                </div>
              )}

              <div>
                <label className="font-semibold admin-muted mb-1 block">Pharmacist Clinical Notes</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Verification completed, patient counseled on administration schedule..."
                  className="input-admin text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="btn-admin-secondary text-xs px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-admin text-xs px-5 py-2.5 rounded-xl shadow-sm font-bold"
                >
                  {isPending ? "Recording..." : "Confirm Review Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
