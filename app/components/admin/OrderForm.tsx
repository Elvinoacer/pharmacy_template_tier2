"use client";

import { useId } from "react";

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import {
  Hash,
  DollarSign,
  User,
  Mail,
  Phone,
  Tag,
  AlertCircle,
  Check,
  Save,
  FileText,
  Printer,
  Lock,
  Stethoscope,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { MpesaStkPanel } from "@/app/components/payments/MpesaStkPanel";
import { ClinicalSafetyAlert } from "@/app/components/admin/ClinicalSafetyAlert";
import { ReceiptModal } from "@/app/components/admin/ReceiptModal";
import type { ClinicalSafetyReport } from "@/app/lib/services/clinical-safety";

type Medication = {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  overTheCounter: boolean;
  prescriptionRequired?: boolean;
};

type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
};

export default function OrderForm({
  action,
  medications,
  customers: _customers,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  medications: Medication[];
  customers?: Customer[];
}) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState("");
  const [medicationId, setMedicationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [billingUnit, setBillingUnit] = useState("UNIT");
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "daraja" | "card">("cash");
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [mpesaPhone, setMpesaPhone] = useState("");
  
  // Prescription validation state
  const [rxMode, setRxMode] = useState<"new" | "existing">("new");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [prescriberLicense, setPrescriberLicense] = useState("");
  const [rxReference, setRxReference] = useState("");
  const [refillsRemaining, setRefillsRemaining] = useState(0);
  const [daysSupply, setDaysSupply] = useState(30);
  const [patientNationalId, setPatientNationalId] = useState("");

  const [stkOrder, setStkOrder] = useState<{
    orderId: string;
    phone: string;
  } | null>(null);

  // Clinical safety & receipt states
  const [clinicalReport, setClinicalReport] = useState<ClinicalSafetyReport | null>(null);
  const [clinicalLoading, setClinicalLoading] = useState(false);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const selected = medications.find((m) => m.id === medicationId);
  const isRx = Boolean(selected?.prescriptionRequired && !selected?.overTheCounter);
  const total = selected ? selected.price * quantity : 0;

  void _customers;

  // Real-time clinical safety screening
  useEffect(() => {
    if (!medicationId) {
      setClinicalReport(null);
      return;
    }

    setClinicalLoading(true);
    fetch("/api/admin/clinical-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicationId,
        customerId: customerId || undefined,
        quantity,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.report) {
          setClinicalReport(data.report);
        }
      })
      .catch(() => {})
      .finally(() => setClinicalLoading(false));
  }, [medicationId, customerId, quantity]);

  // Reset form on success
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      if (state.orderId) {
        setLastCreatedOrderId(state.orderId);
      }
      if (state.startStk && state.orderId) {
        setStkOrder({
          orderId: state.orderId,
          phone: state.stkPhone || mpesaPhone,
        });
      } else {
        setCustomerId("");
        setMedicationId("");
        setQuantity(1);
        setCouponCode("");
        setPaymentMethod("cash");
        setAutoDispatch(true);
        setMpesaPhone("");
        setPrescriber("");
        setPrescriberLicense("");
        setRxReference("");
        setRefillsRemaining(0);
        setPatientNationalId("");
        setPrescriptionId("");
        setClinicalReport(null);
      }
    }
    if (state?.error) toast.error(state.error);
  }, [state, mpesaPhone]);

  return (
    <div className="space-y-4">
      {stkOrder && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
          <p className="mb-2 text-xs font-semibold text-teal-900">
            Order {stkOrder.orderId.slice(0, 8).toUpperCase()} — complete M-Pesa
          </p>
          <MpesaStkPanel
            orderId={stkOrder.orderId}
            defaultPhone={stkOrder.phone}
            staffMode
            autoStart={Boolean(stkOrder.phone)}
            onSuccess={() => {
              toast.success(
                autoDispatch
                  ? "Paid & dispatched"
                  : "Paid — held for later dispatch",
              );
              setLastCreatedOrderId(stkOrder.orderId);
              setReceiptModalOpen(true);
            }}
            onClose={() => {
              setStkOrder(null);
              window.location.reload();
            }}
          />
          <p className="mt-2 text-xs text-teal-800">
            {autoDispatch
              ? "On success this counter sale auto-marks as dispatched with FEFO lot deduction."
              : "On success the order stays paid/reserved until you mark dispatched."}
          </p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="admin-alert-error">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
          </div>
        )}

        {state?.success && !stkOrder && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold">{state.success}</span>
              </div>
              {lastCreatedOrderId && (
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Send Receipt</span>
                </button>
              )}
            </div>
          </div>
        )}

        <input type="hidden" name="source" value="counter" />
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="prescriptionId" value={prescriptionId} />
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        <input type="hidden" name="billingUnit" value={billingUnit} />
        <input type="hidden" name="autoDispatch" value={autoDispatch ? "on" : "off"} />
        <input
          type="hidden"
          name="fulfillment"
          value={autoDispatch ? "immediate" : "reserve"}
        />

        {/* ── Patient Identification ── */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="label-admin font-bold text-xs flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span>Patient / Customer {isRx ? "*" : "(optional for walk-in)"}</span>
            </label>
            {isRx && (
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                Patient Required for Rx Dispense
              </span>
            )}
          </div>

          <CustomerPicker
            value={customerId}
            onChange={setCustomerId}
            variant="admin"
            placeholder="Search registered patient or leave blank for walk-in…"
          />

          {!customerId && (
            <div className="grid gap-3 sm:grid-cols-3 pt-1">
              <div>
                <label htmlFor={`${fieldPrefix}-1`} className="label-admin text-xs">Walk-in Patient Name {isRx ? "*" : ""}</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                  <input id={`${fieldPrefix}-1`}
                    name="customerName"
                    required={isRx}
                    placeholder="e.g. Jane Doe"
                    className="input-admin pl-9 text-xs"
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`${fieldPrefix}-2`} className="label-admin text-xs">Patient Phone {isRx ? "*" : ""}</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                  <input id={`${fieldPrefix}-2`}
                    name="customerPhone"
                    type="tel"
                    required={isRx}
                    placeholder="+254 712 345 678"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    className="input-admin pl-9 text-xs"
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`${fieldPrefix}-3`} className="label-admin text-xs">Patient Email (Receipt/Invite)</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                  <input id={`${fieldPrefix}-3`}
                    name="customerEmail"
                    type="email"
                    placeholder="jane@example.com"
                    className="input-admin pl-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Medication Selection ── */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 space-y-3">
          <label htmlFor={`${fieldPrefix}-4`} className="label-admin font-bold text-xs">Select Medication *</label>
          <select id={`${fieldPrefix}-4`}
            name="medicationId"
            required
            value={medicationId}
            onChange={(e) => {
              setMedicationId(e.target.value);
            }}
            className="input-admin text-xs"
          >
            <option value="">Select medication from catalogue…</option>
            {medications.map((m) => (
              <option key={m.id} value={m.id} disabled={m.stockQty <= 0}>
                {m.name} — KES {m.price} ({m.stockQty} in stock)
                {m.prescriptionRequired && !m.overTheCounter ? " · [Rx Required]" : " · [OTC]"}
              </option>
            ))}
          </select>

          {/* Real-time Clinical Safety & Generic Alternatives */}
          {medicationId && (
            <div className="mt-3">
              <ClinicalSafetyAlert
                report={clinicalReport}
                loading={clinicalLoading}
                onSelectAlternative={(alt) => setMedicationId(alt.id)}
              />
            </div>
          )}
        </div>

        {/* ── Prescription Dispensing Validation Panel (Auto-displayed for Rx) ── */}
        {isRx && (
          <div className="rounded-2xl border-2 border-blue-500/40 bg-blue-50/50 p-4 space-y-4 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <h3 className="font-bold text-xs text-blue-950 dark:text-blue-200">
                  Prescription Dispensing &amp; Validation (Required for Rx)
                </h3>
              </div>
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                Certified Fill #1
              </span>
            </div>

            <p className="text-xs text-blue-900/90 dark:text-blue-300">
              This medication requires a valid prescription. Completing this sale will automatically create and link the <strong>Prescription</strong>, record <strong>PrescriptionFill #1</strong>, and deduct stock exactly once via FEFO lot allocation.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor={`${fieldPrefix}-5`} className="label-admin text-xs">Prescribing Doctor / Clinician *</label>
                <input id={`${fieldPrefix}-5`}
                  name="prescriber"
                  required
                  value={prescriber}
                  onChange={(e) => setPrescriber(e.target.value)}
                  placeholder="e.g. Dr. John Doe"
                  className="input-admin text-xs"
                />
              </div>

              <div>
                <label htmlFor={`${fieldPrefix}-6`} className="label-admin text-xs">Prescriber License / KMPDC #</label>
                <input id={`${fieldPrefix}-6`}
                  name="prescriberLicense"
                  value={prescriberLicense}
                  onChange={(e) => setPrescriberLicense(e.target.value)}
                  placeholder="e.g. KMPDC-REG-8421"
                  className="input-admin text-xs font-mono"
                />
              </div>

              <div>
                <label htmlFor={`${fieldPrefix}-7`} className="label-admin text-xs">Prescription Ref / Serial #</label>
                <input id={`${fieldPrefix}-7`}
                  name="rxReference"
                  value={rxReference}
                  onChange={(e) => setRxReference(e.target.value)}
                  placeholder={`RX-${new Date().getFullYear()}-XXXX`}
                  className="input-admin text-xs font-mono"
                />
              </div>

              <div>
                <label htmlFor={`${fieldPrefix}-8`} className="label-admin text-xs">Authorized Refills (0 for one-time)</label>
                <input id={`${fieldPrefix}-8`}
                  name="refillsRemaining"
                  type="number"
                  min="0"
                  max="12"
                  value={refillsRemaining}
                  onChange={(e) => setRefillsRemaining(Math.max(0, Number(e.target.value)))}
                  className="input-admin text-xs"
                />
              </div>

              <div>
                <label htmlFor={`${fieldPrefix}-9`} className="label-admin text-xs">Days Supply</label>
                <input id={`${fieldPrefix}-9`}
                  name="daysSupply"
                  type="number"
                  min="1"
                  value={daysSupply}
                  onChange={(e) => setDaysSupply(Math.max(1, Number(e.target.value)))}
                  className="input-admin text-xs"
                />
              </div>

              <div>
                <label htmlFor={`${fieldPrefix}-10`} className="label-admin text-xs">Patient National ID / Passport</label>
                <input id={`${fieldPrefix}-10`}
                  name="patientNationalId"
                  value={patientNationalId}
                  onChange={(e) => setPatientNationalId(e.target.value)}
                  placeholder="e.g. 12345678"
                  className="input-admin text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Controlled Substance Compliance Banner ── */}
        {clinicalReport?.isControlledDrug && (
          <div className="rounded-2xl border border-purple-500/40 bg-purple-50/70 p-4 space-y-2 dark:bg-purple-950/20">
            <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900 dark:text-purple-300">
              <Lock className="h-3.5 w-3.5 text-purple-700" />
              <span>Controlled Substance Compliance (DDA / Kenya PPB Schedule)</span>
            </div>
            <p className="text-xs text-purple-900/90 dark:text-purple-300">
              Entry will be automatically logged to the regulatory <strong>Controlled Drugs Register</strong>. Ensure doctor license and patient national ID are verified.
            </p>
          </div>
        )}

        {/* ── Quantity & Dispensing Units ── */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`${fieldPrefix}-11`} className="label-admin">Quantity *</label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input id={`${fieldPrefix}-11`}
                  name="quantity"
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="input-admin pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor={`${fieldPrefix}-12`} className="label-admin">Dispensing Unit (Broken Pack Support)</label>
              <select id={`${fieldPrefix}-12`}
                value={billingUnit}
                onChange={(e) => setBillingUnit(e.target.value)}
                className="input-admin text-xs"
              >
                <option value="TABLET">Tablets</option>
                <option value="CAPSULE">Capsules</option>
                <option value="BOTTLE">Bottles</option>
                <option value="STRIP">Strips</option>
                <option value="PACK">Packs</option>
                <option value="BOX">Boxes</option>
                <option value="AMPOULE">Ampoules</option>
                <option value="ML">mL</option>
                <option value="UNIT">Units</option>
              </select>
            </div>

            <div>
              <label htmlFor={`${fieldPrefix}-13`} className="label-admin">Coupon Code (optional)</label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input id={`${fieldPrefix}-13`}
                  name="couponCode"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER25"
                  className="input-admin pl-9 font-mono uppercase text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldPrefix}-14`} className="label-admin">Dosage &amp; Administration Instructions</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input id={`${fieldPrefix}-14`}
                name="dosage"
                placeholder="e.g. 1 tablet twice daily with food for 5 days"
                className="input-admin pl-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldPrefix}-15`} className="label-admin">
              Pharmacist Dispenser Note &amp; Counselling {isRx ? "*" : "(optional)"}
            </label>
            <textarea id={`${fieldPrefix}-15`}
              name="dispenserNote"
              rows={2}
              required={isRx}
              placeholder="Condition observed, counselling provided, validity notes…"
              className="input-admin resize-y text-xs"
            />
            <p className="mt-1 text-xs admin-soft">
              Clinical note from the dispenser — permanently recorded on the dispensing register and printed on the patient receipt.
            </p>
          </div>

          <div>
            <label htmlFor={`${fieldPrefix}-16`} className="label-admin">Customer Reason (if known)</label>
            <select id={`${fieldPrefix}-16`} name="reason" className="input-admin text-xs" defaultValue="">
              <option value="">— none —</option>
              <option value="for known condition">For a known condition</option>
              <option value="recommended by pharmacist">Recommended by pharmacist</option>
              <option value="returning customer">Returning customer</option>
              <option value="self care">Self-care / minor symptom</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* ── Payment Method & Settlement ── */}
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 space-y-3">
          <div>
            <label htmlFor={`${fieldPrefix}-17`} className="label-admin">Payment Method</label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "cash", label: "Cash (mark paid)" },
                  { value: "daraja", label: "M-Pesa STK Push" },
                  { value: "card", label: "Card (pending settlement)" },
                ] as const
              ).map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                    paymentMethod === m.value
                      ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text shadow-2xs"
                      : "border-[var(--admin-border)] admin-muted"
                  }`}
                >
                  <input id={`${fieldPrefix}-17`}
                    type="radio"
                    name="paymentMethodRadio"
                    checked={paymentMethod === m.value}
                    onChange={() => setPaymentMethod(m.value)}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {paymentMethod === "daraja" && (
            <div>
              <label htmlFor={`${fieldPrefix}-18`} className="label-admin">M-Pesa Phone (Customer)</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input id={`${fieldPrefix}-18`}
                  name="mpesaPhone"
                  type="tel"
                  required
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="07XX XXX XXX — customer enters PIN"
                  className="input-admin pl-9 text-xs"
                />
              </div>
              <p className="mt-1 text-xs admin-soft">
                Staff triggers the push; customer confirms with PIN on handset.
              </p>
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3.5 py-2.5 text-xs admin-muted">
            <input
              type="checkbox"
              checked={autoDispatch}
              onChange={(e) => setAutoDispatch(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded"
            />
            <span>
              <span className="font-bold admin-text">Mark as dispensed / dispatched immediately</span>
              <span className="mt-0.5 block text-xs admin-soft">
                Checked for counter sales (patient leaves with medicines now). Uncheck for paid remote reservations to dispatch later.
              </span>
            </span>
          </label>

          <div className="rounded-xl bg-[var(--admin-inset)] p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold admin-muted">Total Payable</p>
              <p className="text-xl font-black admin-text">
                KES {total.toLocaleString()}
              </p>
            </div>
            <p className="mt-1 text-xs admin-soft">
              {isRx
                ? "Prescription Fill #1 will be created and unified with this order with single stock deduction."
                : "Standard counter sale will be recorded and added to revenue."}
            </p>
          </div>

          <button
            type="submit"
            disabled={pending || Boolean(stkOrder)}
            className="btn-admin-primary w-full !rounded-xl py-3 text-xs font-bold shadow-md disabled:opacity-50"
          >
            {pending ? (
              <>
                <span className="typing-dot" /> Recording &amp; Dispensing…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />{" "}
                {paymentMethod === "daraja"
                  ? "Create Prescription & Prepare STK"
                  : isRx
                    ? "Authorize Rx & Complete Dispensing"
                    : "Record Counter Sale"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Printable Official Receipt Modal ── */}
      <ReceiptModal
        orderId={lastCreatedOrderId}
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
      />
    </div>
  );
}
