"use client";

import { AdminModal } from "./AdminModal";

import { useState, useTransition } from "react";
import {
  Phone,
  MessageSquare,
  Mail,
  Send,
  X,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  FileText,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { useTenantBrand } from "@/app/components/TenantBrand";

export type PatientContactTarget = {
  customerId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  medicineName?: string;
  prescriptionId?: string;
  refillRequestId?: string;
  dueDateStr?: string;
};

export type PrescriberContactTarget = {
  prescriptionId: string;
  customerName: string;
  medicineName: string;
  dosage?: string | null;
  rxReference?: string | null;
  lastFilledDateStr?: string;
  prescriber: string | null;
  prescriberPhone: string | null;
  prescriberEmail: string | null;
  prescriberFacility?: string | null;
  prescriberLicense?: string | null;
};

export function PatientContactModal({
  target,
  onClose,
}: {
  target: PatientContactTarget;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [pending, startTransition] = useTransition();
  const brand = useTenantBrand();

  const med = target.medicineName || "your prescription medication";
  const due = target.dueDateStr ? ` (due: ${target.dueDateStr})` : "";
  const firstName = target.customerName.split(" ")[0] || "there";

  const templates: Array<{ id: string; label: string; text: string }> = [
    {
      id: "due_soon",
      label: "Refill Due Soon",
      text: `Hello ${firstName}, this is a gentle reminder from ${brand.name} that your refill for ${med}${due} is due soon. To confirm pickup or home delivery, please tap here: /portal/refills or reply to this message.`,
    },
    {
      id: "ready_pickup",
      label: "Ready for Pickup",
      text: `Hello ${firstName}, good news! Your refill for ${med} is packaged and ready for collection at ${brand.name}. Please bring your prescription slip or show this message at the pickup counter.`,
    },
    {
      id: "out_delivery",
      label: "Out for Delivery",
      text: `Hello ${firstName}, your refill for ${med} has been dispatched with our delivery rider. Please ensure your contact phone is active for smooth handover.`,
    },
    {
      id: "renewal_needed",
      label: "Doctor Renewal Needed",
      text: `Hello ${firstName}, your prescription for ${med} has completed its authorized refills. We are contacting your prescriber for renewal, or you may consult your doctor to issue a new prescription.`,
    },
    {
      id: "adherence_check",
      label: "Wellness / Adherence Check",
      text: `Hello ${firstName}, the clinical pharmacy team at ${brand.name} is checking in on your ${med} therapy. How are you feeling, and do you need any guidance or a refill? We're here to help!`,
    },
  ];

  const [message, setMessage] = useState(templates[0].text);

  // Character & SMS count calculation
  const charCount = message.length;
  const smsSegments = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  // Generate wa.me link
  const cleanPhone = (target.phone || "").replace(/[^0-9]/g, "");
  const waPhone = cleanPhone.startsWith("0") ? `254${cleanPhone.slice(1)}` : cleanPhone;
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}` : null;

  function onSend() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/refills/reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: target.customerId,
            prescriptionId: target.prescriptionId,
            refillRequestId: target.refillRequestId,
            channel: channel === "email" ? "email" : channel === "whatsapp" ? "whatsapp" : "sms",
            subject: `Prescription Refill Update: ${med}`,
            body: message,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to send message");
        toast.success(`Message sent to ${target.customerName} via ${channel.toUpperCase()}`);
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send message");
      }
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(message);
    toast.success("Message copied to clipboard!");
  }

  return (
    <AdminModal label="Patient contact and follow-up" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center  p-3 sm:p-4  overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--admin-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold admin-text">Contact Patient Directly</h3>
              <p className="text-sm admin-soft">
                {target.customerName} · <strong className="font-mono">{target.phone || target.email || "No phone on file"}</strong>
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog" onClick={onClose}
            className="min-h-11 rounded-full p-1.5 admin-soft hover:bg-[var(--admin-inset)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Phone Call Banner */}
        {target.phone && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Direct Line: <strong className="font-mono">{target.phone}</strong>
              </span>
            </div>
            <a
              href={`tel:${target.phone}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
            >
              <Phone className="h-3 w-3" /> Call Patient
            </a>
          </div>
        )}

        {/* Template Selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold uppercase tracking-wider admin-soft flex items-center gap-1">
            <FileText className="h-3 w-3 text-emerald-600" /> Quick Clinical Templates
          </label>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setMessage(tpl.text)}
                className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] px-2.5 py-1 text-sm font-semibold admin-text hover:border-emerald-500/40 hover:bg-emerald-500/10 transition"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Channel Switcher */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold uppercase tracking-wider admin-soft">Dispatch Channel</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-bold transition ${
                channel === "whatsapp"
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                  : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-muted"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannel("sms")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-bold transition ${
                channel === "sms"
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                  : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-muted"
              }`}
            >
              <Phone className="h-3.5 w-3.5 text-blue-600" /> SMS Text
            </button>
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-bold transition ${
                channel === "email"
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                  : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-muted"
              }`}
            >
              <Mail className="h-3.5 w-3.5 text-purple-600" /> Email
            </button>
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold uppercase tracking-wider admin-soft">Message Body</label>
            <div className="flex items-center gap-2">
              <span className="text-sm admin-soft font-mono">
                {charCount} chars · {smsSegments} SMS {smsSegments === 1 ? "segment" : "segments"}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-11 text-sm font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
              >
                <Copy className="h-2.5 w-2.5" /> Copy
              </button>
            </div>
          </div>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 text-sm admin-text focus:border-[var(--admin-accent)] focus:outline-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--admin-border)]">
          {waUrl && channel === "whatsapp" ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in WhatsApp Web / App
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-2 text-sm font-bold admin-muted hover:bg-[var(--admin-inset-2)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !message.trim()}
              onClick={onSend}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-sm font-bold text-[var(--admin-btn-fg)] shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Sending…" : <><Send className="h-3.5 w-3.5" /> Dispatch Message</>}
            </button>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}

export function PrescriberContactModal({
  target,
  onClose,
}: {
  target: PrescriberContactTarget;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<string>("phone");
  const [contactedTo, setContactedTo] = useState<string>(
    target.prescriber || target.prescriberFacility || "Attending Prescriber",
  );
  const [pending, startTransition] = useTransition();

  const defaultInquiry = `PRESCRIPTION REFILL AUTHORIZATION REQUEST\n──────────────────────────────────────\nPatient: ${target.customerName}\nMedication: ${target.medicineName} (${target.dosage || "Standard Dose"})\nRx Reference: ${target.rxReference || "On File"}\nLast Dispensed: ${target.lastFilledDateStr || "N/A"}\nRefills Remaining: 0 (Authorized course completed)\nClinic/Facility: ${target.prescriberFacility || "Clinic"}\n\nCLINICAL INQUIRY:\nPatient has requested a refill continuation for their chronic maintenance therapy. Please confirm if 1-3 additional refills are authorized, or specify if a clinical reassessment / updated prescription is required.`;

  const [inquiry, setInquiry] = useState(defaultInquiry);
  const [doctorResponse, setDoctorResponse] = useState("");
  const [resolved, setResolved] = useState(false);

  // WhatsApp link if phone exists
  const cleanPhone = (target.prescriberPhone || "").replace(/[^0-9]/g, "");
  const waPhone = cleanPhone.startsWith("0") ? `254${cleanPhone.slice(1)}` : cleanPhone;
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(inquiry)}` : null;

  function onSave() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/refills/prescriber", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prescriptionId: target.prescriptionId,
            contactMethod: method,
            contactedTo,
            inquiryDetails: inquiry,
            doctorResponse,
            resolved,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to record prescriber contact");
        toast.success(`Prescriber inquiry recorded for ${target.medicineName}`);
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to record inquiry");
      }
    });
  }

  return (
    <AdminModal label="Patient contact and follow-up" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center  p-3 sm:p-4  overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-[var(--admin-border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold admin-text">Prescriber Refill Authorization</h3>
              <p className="text-sm admin-soft">{target.prescriber || "Doctor"} · {target.prescriberFacility || "Clinic"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 rounded-full p-1.5 admin-soft hover:bg-[var(--admin-inset)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Doctor Info Card */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="admin-soft">Attending Doctor:</span>
            <strong className="admin-text">{target.prescriber || "Doctor on file"}</strong>
          </div>
          {target.prescriberPhone && (
            <div className="flex justify-between items-center">
              <span className="admin-soft">Direct Phone:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono admin-text font-bold">{target.prescriberPhone}</span>
                <a
                  href={`tel:${target.prescriberPhone}`}
                  className="rounded-lg bg-blue-600 px-2.5 py-0.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  Call Now
                </a>
              </div>
            </div>
          )}
          {target.prescriberLicense && (
            <div className="flex justify-between">
              <span className="admin-soft">License / Reg:</span>
              <span className="font-mono admin-text">{target.prescriberLicense}</span>
            </div>
          )}
        </div>

        {/* Method Switcher */}
        <div className="space-y-1">
          <label className="text-sm font-bold uppercase tracking-wider admin-soft">Contact Method</label>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {(["phone", "whatsapp", "email", "in_person"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl border py-2 px-2 font-bold capitalize transition ${
                  method === m
                    ? "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                    : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-muted"
                }`}
              >
                {m.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Inquiry Text */}
        <div className="space-y-1">
          <label className="text-sm font-bold uppercase tracking-wider admin-soft">Inquiry / Authorization Details</label>
          <textarea
            rows={5}
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 text-sm admin-text focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>

        {/* Doctor Response / Resolution */}
        <div className="space-y-1">
          <label className="text-sm font-bold uppercase tracking-wider admin-soft">Doctor Response / Verbal Authorization Note</label>
          <input
            value={doctorResponse}
            onChange={(e) => setDoctorResponse(e.target.value)}
            placeholder="e.g. Dr. Kamau authorized 3 additional refills via telephone consult"
            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2 text-sm admin-text focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Resolved Checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
          <input
            type="checkbox"
            checked={resolved}
            onChange={(e) => setResolved(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--admin-border)] text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
            Prescriber Renewal Authorized &amp; Resolved
          </span>
        </label>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--admin-border)]">
          {waUrl && method === "whatsapp" ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <ExternalLink className="h-3 w-3" /> Send on WhatsApp
            </a>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-2 text-sm font-bold admin-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending || !inquiry.trim()}
              onClick={onSave}
              className="min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Clarification Log"}
            </button>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}
