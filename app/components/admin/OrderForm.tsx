"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Hash, DollarSign, User, Mail, Phone, Tag, AlertCircle, Check, Save } from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";

type Medication = {
  id: string;
  name: string;
  price: number;
  stockQty: number;
  overTheCounter: boolean;
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

  const selected = medications.find((m) => m.id === medicationId);
  const total = selected ? selected.price * quantity : 0;

  void _customers;

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      <input type="hidden" name="source" value="counter" />
      <input type="hidden" name="customerId" value={customerId} />

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
          and an invite email is sent so they can complete their profile.
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
              <input name="customerEmail" type="email" placeholder="jane@example.com" className="input-admin pl-9" />
            </div>
          </div>
          <div>
            <label className="label-admin">Phone</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input name="customerPhone" type="tel" placeholder="+254 712 345 678" className="input-admin pl-9" />
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
          onChange={(e) => setMedicationId(e.target.value)}
          className="input-admin"
        >
          <option value="">Select medication…</option>
          {medications.map((m) => (
            <option key={m.id} value={m.id} disabled={m.stockQty <= 0}>
              {m.name} — KES {m.price} ({m.stockQty} in stock){m.overTheCounter ? " · OTC" : ""}
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

      {/* Total preview */}
      <div className="rounded-xl bg-[var(--admin-inset)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs admin-muted">Total</p>
          <p className="text-lg font-bold admin-text">
            <DollarSign className="inline h-4 w-4" /> KES {total.toLocaleString()}
          </p>
        </div>
        <p className="mt-1 text-[10px] admin-soft">
          Payment is recorded as pending. Customer can pay via M-Pesa (Daraja STK push)
          from /portal/orders, or staff can mark as cash / waived.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Recording…</> : <><Save className="h-4 w-4" /> Record sale</>}
      </button>
    </form>
  );
}

