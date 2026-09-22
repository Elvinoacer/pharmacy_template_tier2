"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  Phone,
  MessageSquare,
  Stethoscope,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Users,
  Search,
  ArrowUpDown,
  FileCheck,
  Send,
  X,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDate } from "@/app/lib/time";
import {
  PatientContactModal,
  PrescriberContactModal,
  type PatientContactTarget,
  type PrescriberContactTarget,
} from "./RefillContactModal";
import type { MissingRefillPatientItem } from "@/app/lib/services/refills";

export function RefillMissingPatientsTable({
  patients,
}: {
  patients: MissingRefillPatientItem[];
}) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [patientContact, setPatientContact] = useState<PatientContactTarget | null>(null);
  const [prescriberContact, setPrescriberContact] = useState<PrescriberContactTarget | null>(null);

  // Clinical Intervention Modal
  const [interveneTarget, setInterveneTarget] = useState<MissingRefillPatientItem | null>(null);
  const [interventionType, setInterventionType] = useState<string>("adherence_counseling");
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [notifyCaregiver, setNotifyCaregiver] = useState<boolean>(true);
  const [pending, startTransition] = useTransition();

  const filtered = patients.filter((p) => {
    if (riskFilter !== "all" && p.riskLevel !== riskFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(q) ||
      p.medicineName.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      (p.prescriber && p.prescriber.toLowerCase().includes(q))
    );
  });

  function handleSaveIntervention() {
    if (!interveneTarget) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/refills/intervene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prescriptionId: interveneTarget.prescriptionId,
            customerId: interveneTarget.customerId,
            interventionType,
            clinicalNotes,
            notifyCaregiver,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to record intervention");
        toast.success(`Clinical intervention logged for ${interveneTarget.customerName}`);
        setInterveneTarget(null);
        setClinicalNotes("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to record intervention");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Risk Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Lapsed Patients", count: patients.length },
            { id: "severe", label: "Severe (>14d gap)", count: patients.filter((p) => p.riskLevel === "severe").length, color: "text-rose-700 bg-rose-500/15" },
            { id: "moderate", label: "Moderate (7-14d gap)", count: patients.filter((p) => p.riskLevel === "moderate").length, color: "text-amber-700 bg-amber-500/15" },
            { id: "mild", label: "Mild (3-7d gap)", count: patients.filter((p) => p.riskLevel === "mild").length, color: "text-yellow-700 bg-yellow-500/15" },
          ].map((chip) => {
            const active = riskFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setRiskFilter(chip.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                  active
                    ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
                    : "border border-[var(--admin-border)] bg-[var(--admin-card)] admin-muted hover:bg-[var(--admin-inset)]"
                }`}
              >
                <span>{chip.label}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-sm font-bold ${active ? "bg-white/20 text-white" : chip.color || "bg-black/5 admin-soft"}`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full min-w-0 sm:min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, medicine, phone…"
            className="input-admin min-h-11 pl-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-sm">
        <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-inset)]/60 text-sm font-bold uppercase tracking-wider admin-soft">
                <th className="py-3 px-3.5">Patient &amp; Contact</th>
                <th className="py-3 px-3">Medication</th>
                <th className="py-3 px-3">Therapy Gap</th>
                <th className="py-3 px-3">Adherence PDC</th>
                <th className="py-3 px-3">Caregiver / Doctor</th>
                <th className="py-3 px-3.5 text-right">Clinical Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center admin-soft">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/50 mb-2" />
                    <p className="font-bold text-sm">No missing refill lapses found</p>
                    <p className="text-sm mt-0.5">All active chronic patients are currently on-schedule</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isSevere = row.riskLevel === "severe";
                  const isModerate = row.riskLevel === "moderate";

                  return (
                    <tr
                      key={row.prescriptionId}
                      className="group transition hover:bg-[var(--admin-hover)]"
                    >
                      {/* Patient */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-sm ${
                            isSevere
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          }`}>
                            {row.customerName.charAt(0)}
                          </div>
                          <div>
                            <strong className="admin-text font-bold block">{row.customerName}</strong>
                            <span className="font-mono text-sm admin-soft block">{row.phone || "No phone"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Medication */}
                      <td className="py-3 px-3">
                        <strong className="admin-text font-bold block">{row.medicineName}</strong>
                        <span className="text-sm admin-soft block">{row.dosage || "Standard Dose"}</span>
                      </td>

                      {/* Therapy Gap */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className={`inline-flex items-center gap-1 font-bold text-sm ${
                            isSevere ? "text-rose-600" : isModerate ? "text-amber-600" : "text-yellow-600"
                          }`}>
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {row.gapDays} days without medication
                          </span>
                          <span className="block text-sm admin-soft font-mono">
                            Due date was: {formatDate(row.nextRefillDue)}
                          </span>
                        </div>
                      </td>

                      {/* PDC Adherence Meter */}
                      <td className="py-3 px-3">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold admin-text">{row.adherenceRate}% PDC</span>
                            <span className={`font-bold uppercase text-sm ${
                              isSevere ? "text-rose-600" : "text-amber-600"
                            }`}>
                              {row.riskLevel} risk
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[var(--admin-inset)] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isSevere ? "bg-rose-500" : isModerate ? "bg-amber-500" : "bg-yellow-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, row.adherenceRate))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Caregivers & Prescriber */}
                      <td className="py-3 px-3">
                        <div className="text-sm space-y-0.5">
                          {row.caregivers.length > 0 ? (
                            <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <Users className="h-3 w-3" />
                              <span>{row.caregivers[0].name}</span>
                            </div>
                          ) : (
                            <span className="admin-soft block">No caregiver registered</span>
                          )}
                          <span className="admin-soft block">Dr: {row.prescriber || "Unassigned"}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Log Intervention */}
                          <button
                            onClick={() => {
                              setInterveneTarget(row);
                              setClinicalNotes(`Clinical call with patient regarding ${row.gapDays}-day lapse in ${row.medicineName} therapy.`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-accent)] px-2.5 py-1 text-sm font-bold text-[var(--admin-btn-fg)] shadow-sm hover:brightness-110 transition"
                          >
                            <HeartHandshake className="h-3 w-3" /> Intervene
                          </button>

                          {/* 💬 Patient Contact */}
                          <button
                            title="Contact Patient directly"
                            onClick={() =>
                              setPatientContact({
                                customerId: row.customerId,
                                customerName: row.customerName,
                                phone: row.phone,
                                email: row.email,
                                medicineName: row.medicineName,
                                prescriptionId: row.prescriptionId,
                                dueDateStr: formatDate(row.nextRefillDue) || undefined,
                              })
                            }
                            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] p-1.5 admin-muted hover:border-emerald-500 hover:text-emerald-600 transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>

                          {/* 🩺 Prescriber Contact */}
                          <button
                            title="Contact Prescriber"
                            onClick={() =>
                              setPrescriberContact({
                                prescriptionId: row.prescriptionId,
                                customerName: row.customerName,
                                medicineName: row.medicineName,
                                dosage: row.dosage,
                                rxReference: row.rxReference,
                                lastFilledDateStr: formatDate(row.lastFilledAt) || undefined,
                                prescriber: row.prescriber,
                                prescriberPhone: row.prescriberPhone,
                                prescriberEmail: null,
                                prescriberFacility: null,
                                prescriberLicense: null,
                              })
                            }
                            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] p-1.5 admin-muted hover:border-blue-500 hover:text-blue-600 transition"
                          >
                            <Stethoscope className="h-3.5 w-3.5" />
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

      {/* Clinical Intervention Modal */}
      {interveneTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 shadow-sm">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold admin-text">Clinical Adherence Intervention</h3>
                  <p className="text-sm admin-soft">
                    {interveneTarget.customerName} · {interveneTarget.medicineName} ({interveneTarget.gapDays}d lapse)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInterveneTarget(null)}
                className="rounded-full p-1.5 admin-soft hover:bg-[var(--admin-inset)] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Strategy Selector */}
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wider admin-soft">Intervention Action</label>
              <select
                value={interventionType}
                onChange={(e) => setInterventionType(e.target.value)}
                className="input-admin min-h-11 text-sm"
              >
                <option value="adherence_counseling">Adherence &amp; Side-Effect Counseling Call</option>
                <option value="financial_generic_switch">Affordability / Generic Substitution Consultation</option>
                <option value="direct_delivery_dispatch">Direct Emergency Home Delivery Arrangement</option>
                <option value="prescriber_appointment_escalation">Prescriber Review &amp; Renewal Escalation</option>
                <option value="discontinued_by_physician">Medication Discontinued / Switched by Physician</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wider admin-soft">Clinical Notes &amp; Outcome</label>
              <textarea
                rows={4}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Document patient reasons for lapse, counseling provided, or agreed next steps…"
                className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 text-sm admin-text focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </div>

            {/* Caregiver CC */}
            {interveneTarget.caregivers.length > 0 && (
              <label className="flex items-center gap-2.5 cursor-pointer rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                <input
                  type="checkbox"
                  checked={notifyCaregiver}
                  onChange={(e) => setNotifyCaregiver(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--admin-border)] text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-sm">
                  <strong className="font-bold text-emerald-900 dark:text-emerald-200 block">
                    Copy Registered Caregiver
                  </strong>
                  <span className="text-sm admin-soft block">
                    Send WhatsApp summary to {interveneTarget.caregivers[0].name} ({interveneTarget.caregivers[0].phone || "on file"})
                  </span>
                </div>
              </label>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
              <button
                type="button"
                onClick={() => setInterveneTarget(null)}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-2 text-sm font-bold admin-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !clinicalNotes.trim()}
                onClick={handleSaveIntervention}
                className="min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-sm font-bold text-[var(--admin-btn-fg)] shadow-sm hover:brightness-110 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save Clinical Intervention"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient & Prescriber Modals */}
      {patientContact && (
        <PatientContactModal
          target={patientContact}
          onClose={() => setPatientContact(null)}
        />
      )}
      {prescriberContact && (
        <PrescriberContactModal
          target={prescriberContact}
          onClose={() => setPrescriberContact(null)}
        />
      )}
    </div>
  );
}
