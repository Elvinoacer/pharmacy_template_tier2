"use client";

import { AdminModal } from "./AdminModal";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  Pill,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  Package,
  Calendar,
  X,
  CreditCard,
  Truck,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate, formatDateTime } from "@/app/lib/time";
import { PatientContactModal, PrescriberContactModal } from "./RefillContactModal";

export type RefillReviewData = {
  refill: {
    id: string;
    medicineName: string;
    rxReference: string | null;
    customerName: string | null;
    phone: string | null;
    email: string | null;
    pickupPreference: "pickup" | "delivery";
    preferredDate: string | null;
    preferredTime: string | null;
    notes: string | null;
    status: string;
    source: string;
    createdAt: string;
    customerId: string | null;
    customer?: {
      id: string;
      fullName: string;
      phone: string | null;
      dateOfBirth: string | null;
      gender: string | null;
      emergencyContactName: string | null;
      emergencyContactPhone: string | null;
      caregivers: Array<{ caregiverName: string; caregiverPhone: string | null }>;
      user?: { email: string };
    } | null;
    prescription?: {
      id: string;
      medicineName: string;
      rxReference: string | null;
      dosage: string | null;
      schedule: string | null;
      quantity: number | null;
      daysSupply: number | null;
      refillsRemaining: number | null;
      lastFilledAt: string | null;
      nextRefillDue: string | null;
      prescriber: string | null;
      prescriberPhone: string | null;
      prescriberEmail: string | null;
      prescriberFacility: string | null;
      prescriberLicense: string | null;
      prescriberVerified: boolean;
      patientVerified: boolean;
      isUnclear: boolean;
      unitPrice: number | null;
      medication?: {
        id: string;
        currentStock: number;
        price: number;
        shelfLocation: string | null;
        medicationMaster?: { name: string; genericName?: string };
        lots?: Array<{ id: string; batchNumber: string; expiryDate: string; quantity: number }>;
      } | null;
      clarificationLogs?: Array<{ id: string; contactMethod: string; contactedTo: string; inquiryDetails: string; resolved: boolean }>;
      fills?: Array<{ id: string; fillNumber: number; filledAt: string; netAmount: number; status: string }>;
    } | null;
  };
  clinicalSafety?: {
    overallSafety: "safe" | "caution" | "warning" | "blocked";
    hasInteractions: boolean;
    hasDuplicates: boolean;
    interactions: Array<{ severity: string; drugA: string; drugB: string; description: string }>;
    duplicates: Array<{ medicineName: string; message: string }>;
  } | null;
  order?: {
    id: string;
    status: string;
    total: number;
    amountPaid: number;
    amountDue: number;
    payments?: Array<{ id: string; amount: number; provider: string; status: string }>;
  } | null;
};

export function RefillReviewCockpit({
  refillId,
  onClose,
  onUpdated,
}: {
  refillId: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<RefillReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [contactPatientModal, setContactPatientModal] = useState(false);
  const [contactPrescriberModal, setContactPrescriberModal] = useState(false);

  const [markPreparing, setMarkPreparing] = useState(true);
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "daraja" | "card">("cash");
  const [approvalNotes, setApprovalNotes] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/refills/review?id=${refillId}`);
        const json = await res.json();
        if (active && res.ok && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [refillId]);

  function handleApprove() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/refills/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: refillId,
            markPreparing,
            markPaid,
            paymentMethod,
            notes: approvalNotes || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Failed to approve refill");
        }
        toast.success(`Refill approved and order created.`);
        onClose();
        if (onUpdated) onUpdated();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Approval failed");
      }
    });
  }

  function handleStatusUpdate(newStatus: string) {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", refillId);
        formData.append("status", newStatus);
        const res = await fetch("/api/admin/refills/update", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Failed to update status");
        }
        toast.success(`Refill marked as ${newStatus.replace("_", " ")}`);
        onClose();
        if (onUpdated) onUpdated();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  if (loading) {
    return (
      <AdminModal label="Review refill request" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center  p-4 ">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-8 text-center space-y-3">
          <Pill className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-xs font-semibold admin-muted">Loading Refill Review Cockpit…</p>
        </div>
      </AdminModal>
    );
  }

  if (!data || !data.refill) {
    return (
      <AdminModal label="Review refill request" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center  p-4 ">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 text-center space-y-4 max-w-sm">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
          <p className="text-sm font-bold admin-text">Refill request not found</p>
          <button onClick={onClose} className="btn-secondary text-xs">Close</button>
        </div>
      </AdminModal>
    );
  }

  const { refill, clinicalSafety } = data;
  const rx = refill.prescription;
  const customer = refill.customer;
  const medStock = rx?.medication?.currentStock ?? null;
  const reqQty = rx?.quantity ?? 1;
  const isOutOfStock = medStock !== null && medStock < reqQty;
  const refillsRemaining = rx?.refillsRemaining ?? 0;

  return (
    <>
      <AdminModal label="Review refill request" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center  p-2 sm:p-4  overflow-y-auto">
        <div className="relative w-full max-w-4xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-inset)] px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold admin-text">Pharmacist Refill Review Cockpit</h2>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 capitalize">
                    {refill.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs admin-soft">
                  Submitted {formatDateTime(refill.createdAt)} via <strong className="capitalize">{refill.source}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 admin-soft hover:bg-[var(--admin-hover)] transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Scroll Area */}
          <div className="overflow-y-auto p-5 space-y-4">
            {/* Top Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setContactPatientModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-1.5 text-xs font-bold admin-text hover:bg-[var(--admin-hover)] transition shadow-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> Contact Patient
                </button>
                {rx?.prescriber && (
                  <button
                    type="button"
                    onClick={() => setContactPrescriberModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-1.5 text-xs font-bold admin-text hover:bg-[var(--admin-hover)] transition shadow-sm"
                  >
                    <Stethoscope className="h-3.5 w-3.5 text-blue-600" /> Contact Prescriber (Authorization)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold admin-soft">Pickup Preference:</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-black/10 px-2 py-0.5 text-xs font-bold capitalize admin-text">
                  {refill.pickupPreference === "delivery" ? <Truck className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                  {refill.pickupPreference}
                </span>
              </div>
            </div>

            {/* Clinical Safety & Interactions Alert */}
            {clinicalSafety && clinicalSafety.interactions.length > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Clinical Safety Alert: {clinicalSafety.interactions.length} Potential Interaction(s)</span>
                </div>
                <ul className="space-y-1 text-xs text-rose-800 dark:text-rose-200">
                  {clinicalSafety.interactions.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="font-semibold uppercase text-xs rounded bg-rose-500/20 px-1 py-0.2">{it.severity}</span>
                      <span><strong>{it.drugA}</strong> interacts with <strong>{it.drugB}</strong>: {it.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Grid 2 Column */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Patient Identity & Record */}
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Patient Identity
                  </span>
                  {customer && (
                    <a
                      href={`/admin/customers/${customer.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      CRM Profile <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="admin-soft">Full Name:</span>
                    <strong className="admin-text">{customer?.fullName || refill.customerName || "Guest"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="admin-soft">Phone Contact:</span>
                    <span className="font-mono font-semibold admin-text">{refill.phone || customer?.phone || "—"}</span>
                  </div>
                  {customer?.user?.email && (
                    <div className="flex justify-between">
                      <span className="admin-soft">Email:</span>
                      <span className="admin-text">{customer.user.email}</span>
                    </div>
                  )}
                  {customer?.dateOfBirth && (
                    <div className="flex justify-between">
                      <span className="admin-soft">DOB / Age:</span>
                      <span className="admin-text">{formatDate(customer.dateOfBirth)}</span>
                    </div>
                  )}
                  {customer?.caregivers && customer.caregivers.length > 0 && (
                    <div className="flex justify-between pt-1 border-t border-[var(--admin-border)]">
                      <span className="admin-soft">Active Caregiver:</span>
                      <span className="font-semibold text-emerald-700">{customer.caregivers[0].caregiverName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription & Prescriber Spec */}
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" /> Prescription Authorization
                  </span>
                  {rx && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${refillsRemaining > 0 ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}`}>
                      {refillsRemaining} Refills Left
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="admin-soft">Medication:</span>
                    <strong className="admin-text">{rx?.medicineName || refill.medicineName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="admin-soft">Dosage & Regimen:</span>
                    <span className="admin-text">{rx?.dosage || "As Directed"} · {rx?.schedule || "Standard"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="admin-soft">Prescriber:</span>
                    <span className="font-semibold admin-text">{rx?.prescriber || "Staff Prescribed"}</span>
                  </div>
                  {rx?.prescriberLicense && (
                    <div className="flex justify-between">
                      <span className="admin-soft">License / Clinic:</span>
                      <span className="font-mono text-xs admin-text">{rx.prescriberLicense} ({rx.prescriberFacility || "Clinic"})</span>
                    </div>
                  )}
                  {rx?.lastFilledAt && (
                    <div className="flex justify-between pt-1 border-t border-[var(--admin-border)]">
                      <span className="admin-soft">Last Dispensed:</span>
                      <span className="admin-text">{formatDate(rx.lastFilledAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory Stock & Lots Check */}
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider admin-soft flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-emerald-600" /> Inventory Stock &amp; Batch Allocation
                </span>
                <span className={`text-xs font-bold ${isOutOfStock ? "text-rose-600" : "text-emerald-600"}`}>
                  {medStock !== null ? `${medStock} units on hand (Needed: ${reqQty})` : "Catalogue unlinked"}
                </span>
              </div>

              {isOutOfStock && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Warning: Stock on hand ({medStock}) is below the required fill quantity ({reqQty}). Receiving inventory or adjusting quantity is recommended before dispensing.</span>
                </div>
              )}

              {rx?.medication?.lots && rx.medication.lots.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold admin-soft">FEFO Batches in Stock:</p>
                  <div className="flex flex-wrap gap-2">
                    {rx.medication.lots.map((lot) => (
                      <div key={lot.id} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] px-2.5 py-1 text-xs">
                        <span className="font-mono font-bold admin-text">{lot.batchNumber}</span>
                        <span className="admin-soft ml-1.5">(Exp: {formatDate(lot.expiryDate)} · {lot.quantity} left)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Approval & Order Options */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Refill Approval &amp; Dispensing Workflow
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] p-2.5">
                  <input
                    type="checkbox"
                    checked={markPreparing}
                    onChange={(e) => setMarkPreparing(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--admin-border)] text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold admin-text">Move immediately to "Preparing"</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] p-2.5">
                  <input
                    type="checkbox"
                    checked={markPaid}
                    onChange={(e) => setMarkPaid(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--admin-border)] text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold admin-text">Mark Paid at Counter</span>
                </label>
              </div>

              {markPaid && (
                <div className="flex items-center gap-2">
                  <span className="text-xs admin-soft">Payment Method:</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs admin-text"
                  >
                    <option value="cash">Cash Counter</option>
                    <option value="daraja">M-Pesa (Till / PayBill)</option>
                    <option value="card">Card / Terminal</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold admin-soft">Dispenser / Pharmacist Notes</label>
                <input
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Patient counseled on taking with food; 30d course verified"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-2 text-xs admin-text focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-border)] bg-[var(--admin-inset)] px-5 py-3.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStatusUpdate("ready_for_pickup")}
                disabled={pending}
                className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-500/20 transition disabled:opacity-50"
              >
                Mark Ready for Pickup
              </button>
              <button
                type="button"
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={pending}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-500/20 transition disabled:opacity-50"
              >
                Cancel / Reject Refill
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-4 py-2 text-xs font-bold admin-muted hover:bg-[var(--admin-hover)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:brightness-110 transition disabled:opacity-50"
              >
                {pending ? "Processing…" : <><CheckCircle2 className="h-4 w-4" /> Approve Refill &amp; Create Order</>}
              </button>
            </div>
          </div>
        </div>
      </AdminModal>

      {contactPatientModal && (
        <PatientContactModal
          target={{
            customerId: customer?.id || refill.customerId || "",
            customerName: customer?.fullName || refill.customerName || "Patient",
            phone: refill.phone || customer?.phone || null,
            email: customer?.user?.email || refill.email || null,
            medicineName: rx?.medicineName || refill.medicineName,
            prescriptionId: rx?.id,
            refillRequestId: refill.id,
            dueDateStr: rx?.nextRefillDue ? formatDate(rx.nextRefillDue) : undefined,
          }}
          onClose={() => setContactPatientModal(false)}
        />
      )}

      {contactPrescriberModal && rx && (
        <PrescriberContactModal
          target={{
            prescriptionId: rx.id,
            customerName: customer?.fullName || refill.customerName || "Patient",
            medicineName: rx.medicineName,
            dosage: rx.dosage,
            rxReference: rx.rxReference,
            lastFilledDateStr: rx.lastFilledAt ? formatDate(rx.lastFilledAt) : undefined,
            prescriber: rx.prescriber,
            prescriberPhone: rx.prescriberPhone,
            prescriberEmail: rx.prescriberEmail,
            prescriberFacility: rx.prescriberFacility,
            prescriberLicense: rx.prescriberLicense,
          }}
          onClose={() => setContactPrescriberModal(false)}
        />
      )}
    </>
  );
}
