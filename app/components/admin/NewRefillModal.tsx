"use client";

import { AdminModal } from "./AdminModal";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Pill,
  Phone,
  User,
  Calendar,
  Clock,
  Truck,
  Store,
  Search,
  Check,
  Sparkles,
  MessageSquare,
  Users,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { adminCreateInboundRefillAction } from "@/app/actions/admin";

type SearchedCustomer = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
};

type CustomerPrescription = {
  id: string;
  medicineName: string;
  rxReference: string | null;
  dosage: string | null;
  schedule: string | null;
  refillsRemaining: number;
  daysSupply: number;
  daysRemaining: number;
  statusLabel: string;
  currentStock: number | null;
  unitPrice: number;
};

export function NewRefillModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Intake channel
  const [source, setSource] = useState<"phone" | "staff" | "whatsapp" | "website">("phone");
  const [pickupPreference, setPickupPreference] = useState<"pickup" | "delivery">("pickup");

  // Customer search & selection
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<SearchedCustomer | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Active prescriptions of selected customer
  const [customerRxs, setCustomerRxs] = useState<CustomerPrescription[]>([]);
  const [selectedRx, setSelectedRx] = useState<CustomerPrescription | null>(null);
  const [loadingRxs, setLoadingRxs] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [rxReference, setRxReference] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");

  // Debounced customer search
  useEffect(() => {
    if (!searchQuery.trim() || selectedCustomer) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}&limit=6`);
        const json = await res.json();
        if (json.customers) {
          setSearchResults(json.customers);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCustomer]);

  // Load customer prescriptions when customer is selected
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerRxs([]);
      setSelectedRx(null);
      return;
    }
    async function fetchRxs() {
      try {
        setLoadingRxs(true);
        const res = await fetch(`/api/admin/customers/prescriptions?customerId=${selectedCustomer!.id}`);
        const json = await res.json();
        if (json.prescriptions) {
          setCustomerRxs(json.prescriptions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRxs(false);
      }
    }
    fetchRxs();
  }, [selectedCustomer]);

  function handleSelectCustomer(c: SearchedCustomer) {
    setSelectedCustomer(c);
    setCustomerName(c.fullName);
    setPhone(c.phone || "");
    setEmail(c.email || "");
    setSearchResults([]);
  }

  function handleClearCustomer() {
    setSelectedCustomer(null);
    setSelectedRx(null);
    setCustomerRxs([]);
    setCustomerName("");
    setPhone("");
    setEmail("");
    setMedicineName("");
    setRxReference("");
    setSearchQuery("");
  }

  function handleSelectRx(rx: CustomerPrescription) {
    setSelectedRx(rx);
    setMedicineName(rx.medicineName);
    setRxReference(rx.rxReference || "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!medicineName.trim()) {
      toast.error("Medicine name is required.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("medicineName", medicineName);
      if (selectedCustomer) formData.append("customerId", selectedCustomer.id);
      if (customerName) formData.append("customerName", customerName);
      if (phone) formData.append("phone", phone);
      if (email) formData.append("email", email);
      if (selectedRx) formData.append("prescriptionId", selectedRx.id);
      if (rxReference) formData.append("rxReference", rxReference);
      formData.append("pickupPreference", pickupPreference);
      if (preferredDate) formData.append("preferredDate", preferredDate);
      if (preferredTime) formData.append("preferredTime", preferredTime);
      if (notes) formData.append("notes", notes);
      formData.append("source", source);

      try {
        const res = await adminCreateInboundRefillAction({}, formData);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(res.success || `Refill request recorded for ${medicineName}.`);
        onClose();
        router.refresh();
      } catch {
        toast.error("Failed to create refill request.");
      }
    });
  }

  return (
    <AdminModal label="New refill request" onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center  p-3 sm:p-4  overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--admin-border)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold admin-text">Record Inbound Refill Request</h3>
              <p className="text-xs admin-soft">Fast intake for Phone callers, Counter Walk-ins &amp; WhatsApp</p>
            </div>
          </div>
          <button
            aria-label="Close dialog" onClick={onClose}
            className="rounded-full p-1.5 admin-soft hover:bg-[var(--admin-inset)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Intake Channel Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider admin-soft">Intake Channel</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "phone", label: "Phone Call", icon: Phone, color: "text-blue-600" },
                { id: "staff", label: "Walk-in Counter", icon: Store, color: "text-emerald-600" },
                { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-emerald-500" },
                { id: "website", label: "Direct Intake", icon: Sparkles, color: "text-purple-600" },
              ].map((item) => {
                const Icon = item.icon;
                const active = source === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSource(item.id as any)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                      active
                        ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] text-[var(--admin-text)] ring-2 ring-[var(--admin-accent)]/20"
                        : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-muted hover:border-[var(--admin-border-2)]"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient Quick Search / Auto-Fill */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">
                Existing Patient Lookup (Optional)
              </label>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {!selectedCustomer ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type patient name or phone to auto-fill active prescriptions…"
                  className="input-admin pl-9 text-xs"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="typing-dot" />
                  </div>
                )}

                {/* Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-xl overflow-hidden divide-y divide-[var(--admin-border)]">
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full p-2.5 text-left text-xs hover:bg-[var(--admin-hover)] flex items-center justify-between transition"
                      >
                        <div>
                          <strong className="admin-text">{c.fullName}</strong>
                          <p className="text-xs admin-soft font-mono">{c.phone || c.email || "No direct contact"}</p>
                        </div>
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          Select Patient
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                    {selectedCustomer.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold admin-text">{selectedCustomer.fullName}</h4>
                    <p className="text-xs admin-soft font-mono">{selectedCustomer.phone || selectedCustomer.email}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white/40 px-2 py-0.5 rounded-full">
                  Profile Linked
                </span>
              </div>
            )}
          </div>

          {/* Active Prescriptions Quick Picker */}
          {selectedCustomer && (
            <div className="space-y-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Pill className="h-3 w-3" /> Select from Patient's Active Prescriptions:
              </label>

              {loadingRxs ? (
                <p className="text-xs admin-soft py-2">Loading active prescriptions…</p>
              ) : customerRxs.length === 0 ? (
                <p className="text-xs admin-soft py-1">No active maintenance prescriptions found on file. Enter details manually below.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {customerRxs.map((rx) => {
                    const isSelected = selectedRx?.id === rx.id;
                    return (
                      <button
                        key={rx.id}
                        type="button"
                        onClick={() => handleSelectRx(rx)}
                        className={`text-left rounded-xl border p-2.5 text-xs transition ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/30"
                            : "border-[var(--admin-border)] bg-[var(--admin-card)] hover:border-emerald-500/40"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <strong className="font-bold admin-text">{rx.medicineName}</strong>
                          <span className={`text-xs font-bold px-1.5 py-0.2 rounded-full ${rx.refillsRemaining > 0 ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}`}>
                            {rx.refillsRemaining} left
                          </span>
                        </div>
                        <p className="text-xs admin-soft mt-0.5">{rx.dosage || "Standard regimen"} · Rx {rx.rxReference || "—"}</p>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-emerald-700 font-semibold">{rx.statusLabel}</span>
                          {rx.currentStock !== null && (
                            <span className="admin-soft">{rx.currentStock} in stock</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Patient Details Row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">Patient Full Name *</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="e.g. Grace Wanjiku"
                className="input-admin text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">Phone Number *</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="e.g. 0712345678"
                className="input-admin text-xs font-mono"
              />
            </div>
          </div>

          {/* Medicine & Prescription Reference */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">Medicine Name *</label>
              <input
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                required
                placeholder="e.g. Amlodipine 5mg"
                className="input-admin text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">Rx Reference / Number</label>
              <input
                value={rxReference}
                onChange={(e) => setRxReference(e.target.value)}
                placeholder="e.g. RX-9482"
                className="input-admin text-xs font-mono"
              />
            </div>
          </div>

          {/* Fulfillment & Date Preferences */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">Fulfillment Method</label>
              <select
                value={pickupPreference}
                onChange={(e) => setPickupPreference(e.target.value as any)}
                className="input-admin text-xs"
              >
                <option value="pickup">Branch Pickup</option>
                <option value="delivery">Home Delivery</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">Preferred Date</label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="input-admin text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider admin-soft">Time Window</label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="input-admin text-xs"
              >
                <option value="">Any time</option>
                <option value="Morning (8:00 AM - 12:00 PM)">Morning (8am - 12pm)</option>
                <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12pm - 4pm)</option>
                <option value="Evening (4:00 PM - 8:00 PM)">Evening (4pm - 8pm)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider admin-soft">Staff / Delivery Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Patient requests 60-day supply; delivery to Kilimani address"
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-2.5 text-xs admin-text focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--admin-border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-2 text-xs font-bold admin-muted hover:bg-[var(--admin-inset-2)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : <><Plus className="h-3.5 w-3.5" /> Save Inbound Refill Request</>}
            </button>
          </div>
        </form>
      </div>
    </AdminModal>
  );
}
