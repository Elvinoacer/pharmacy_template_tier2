"use client";

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
} from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { MpesaStkPanel } from "@/app/components/payments/MpesaStkPanel";

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
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState("");
  const [medicationId, setMedicationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "daraja" | "card">("cash");
  const [createRx, setCreateRx] = useState(false);
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [stkOrder, setStkOrder] = useState<{
    orderId: string;
    phone: string;
  } | null>(null);

  const selected = medications.find((m) => m.id === medicationId);
  const total = selected ? selected.price * quantity : 0;

  void _customers;

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
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
        setCreateRx(false);
        setAutoDispatch(true);
        setMpesaPhone("");
      }
    }
    if (state?.error) toast.error(state.error);
  }, [state, mpesaPhone]);

  // OTC defaults to auto-dispatch; Rx-ish holds can stay unchecked.
  useEffect(() => {
    if (selected?.overTheCounter) setAutoDispatch(true);
  }, [selected?.id, selected?.overTheCounter]);

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
              setTimeout(() => window.location.reload(), 800);
            }}
            onClose={() => {
              setStkOrder(null);
              window.location.reload();
            }}
          />
          <p className="mt-2 text-[10px] text-teal-800">
            {autoDispatch
              ? "On success this counter sale auto-marks as dispatched (uncheck above next time to hold stock for later handoff)."
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
          <div className="admin-alert-success">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
          </div>
        )}

        <input type="hidden" name="source" value="counter" />
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        <input type="hidden" name="autoDispatch" value={autoDispatch ? "on" : "off"} />
        <input
          type="hidden"
          name="fulfillment"
          value={autoDispatch ? "immediate" : "reserve"}
        />

        <div>
          <label className="label-admin">Customer (optional — leave blank for walk-in)</label>
          <CustomerPicker
            value={customerId}
            onChange={setCustomerId}
            variant="admin"
            placeholder="Search customer or leave blank for walk-in…"
          />
          <p className="mt-1 text-[10px] admin-soft">
            If left blank and an email is given below, a customer account is created automatically
            and an onboarding email is sent.
          </p>
        </div>

        {!customerId && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label-admin">Walk-in name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input name="customerName" placeholder="Jane Doe" className="input-admin pl-9" />
              </div>
            </div>
            <div>
              <label className="label-admin">Email (for receipt + invite)</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input
                  name="customerEmail"
                  type="email"
                  placeholder="jane@example.com"
                  className="input-admin pl-9"
                />
              </div>
            </div>
            <div>
              <label className="label-admin">Phone</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input
                  name="customerPhone"
                  type="tel"
                  placeholder="+254 712 345 678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  className="input-admin pl-9"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label-admin">Medication *</label>
          <select
            name="medicationId"
            required
            value={medicationId}
            onChange={(e) => {
              setMedicationId(e.target.value);
              const m = medications.find((x) => x.id === e.target.value);
              if (m?.prescriptionRequired) setCreateRx(true);
            }}
            className="input-admin"
          >
            <option value="">Select medication…</option>
            {medications.map((m) => (
              <option key={m.id} value={m.id} disabled={m.stockQty <= 0}>
                {m.name} — KES {m.price} ({m.stockQty} in stock)
                {m.overTheCounter ? " · OTC" : " · Rx"}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Quantity *</label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="quantity"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="input-admin pl-9"
              />
            </div>
          </div>
          <div>
            <label className="label-admin">Coupon code (optional)</label>
            <div className="relative">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="couponCode"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="SUMMER25"
                className="input-admin pl-9 font-mono uppercase"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label-admin">Dosage (optional)</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="dosage" placeholder="1 tablet twice daily" className="input-admin pl-9" />
          </div>
        </div>

        <div>
          <label className="label-admin">Payment method</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "cash", label: "Cash (mark paid)" },
                { value: "daraja", label: "M-Pesa STK" },
                { value: "card", label: "Card (pending)" },
              ] as const
            ).map((m) => (
              <label
                key={m.value}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                  paymentMethod === m.value
                    ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text"
                    : "border-[var(--admin-border)] admin-muted"
                }`}
              >
                <input
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
            <label className="label-admin">M-Pesa phone (customer)</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="mpesaPhone"
                type="tel"
                required
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="07XX XXX XXX — customer enters PIN"
                className="input-admin pl-9"
              />
            </div>
            <p className="mt-1 text-[10px] admin-soft">
              You start the push; the customer only enters their PIN. We confirm via webhook or status poll.
            </p>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2.5 text-xs admin-muted">
          <input
            type="checkbox"
            checked={autoDispatch}
            onChange={(e) => setAutoDispatch(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded"
          />
          <span>
            <span className="font-semibold admin-text">Mark as dispatched on payment</span>
            <span className="mt-0.5 block text-[10px] admin-soft">
              On for OTC counter sales (customer leaves with meds). Uncheck for paid reservations /
              remote holds that you will dispatch later.
            </span>
          </span>
        </label>

        {selected?.prescriptionRequired && (
          <label className="flex cursor-pointer items-center gap-2 text-xs admin-muted">
            <input
              type="checkbox"
              name="createPrescription"
              checked={createRx}
              onChange={(e) => setCreateRx(e.target.checked)}
              className="h-3.5 w-3.5 rounded"
            />
            Also create a prescription record for this customer
          </label>
        )}
        {createRx && <input type="hidden" name="createPrescription" value="on" />}

        <div className="rounded-xl bg-[var(--admin-inset)] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs admin-muted">Total</p>
            <p className="text-lg font-bold admin-text">
              <DollarSign className="inline h-4 w-4" /> KES {total.toLocaleString()}
            </p>
          </div>
          <p className="mt-1 text-[10px] admin-soft">
            {paymentMethod === "cash"
              ? autoDispatch
                ? "Cash + dispatched immediately — counted in revenue."
                : "Cash paid, held until you mark dispatched."
              : paymentMethod === "daraja"
                ? "Creates the order, then opens STK so the customer can PIN-confirm."
                : "Stays pending until marked paid."}
          </p>
        </div>

        <button
          type="submit"
          disabled={pending || Boolean(stkOrder)}
          className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
        >
          {pending ? (
            <>
              <span className="typing-dot" /> Recording…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />{" "}
              {paymentMethod === "daraja" ? "Create order & prepare STK" : "Record sale"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
