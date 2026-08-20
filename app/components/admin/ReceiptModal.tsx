"use client";

import { useEffect, useState } from "react";
import {
  Printer,
  Mail,
  MessageSquare,
  X,
  Check,
  AlertCircle,
  FileText,
  Building,
  User,
  Pill,
  Send,
  Download,
  Share2,
  Copy,
  Receipt,
  Tag,
  Phone,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/app/components/Toaster";
import type { PharmacyReceiptData } from "@/app/lib/services/receipt";

export function ReceiptModal({
  orderId,
  isOpen,
  onClose,
}: {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState<PharmacyReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"thermal" | "a4" | "label">("thermal");
  const [copied, setCopied] = useState(false);

  // Send state
  const [sendChannel, setSendChannel] = useState<"email" | "sms" | "whatsapp">("email");
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    setLoading(true);
    fetch(`/api/admin/receipts?orderId=${encodeURIComponent(orderId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.receipt) {
          setReceipt(data.receipt);
          setRecipient(data.receipt.customer.email || data.receipt.customer.phone || "");
        } else {
          toast.error(data.error || "Failed to load receipt.");
        }
      })
      .catch(() => {
        toast.error("Network error loading receipt.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, orderId]);

  // Handle ESC key to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !orderId) return null;

  async function handleSendReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient.trim()) {
      toast.error("Recipient address / phone number is required.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/receipts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          channel: sendChannel,
          recipient: recipient.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Receipt dispatched successfully.");
      } else {
        toast.error(data.error || "Failed to send receipt.");
      }
    } catch {
      toast.error("Error sending receipt.");
    } finally {
      setSending(false);
    }
  }

  function handleCopySummary() {
    if (!receipt) return;
    const text =
      `*${receipt.pharmacy.name} — Dispensing Receipt*\n` +
      `Receipt No: ${receipt.receiptNumber}\n` +
      `Date: ${receipt.createdAt}\n` +
      `Patient: ${receipt.customer.fullName}\n` +
      `Items: ${receipt.items.map((i) => `${i.quantity}x ${i.name} (KES ${i.totalPrice.toLocaleString()})`).join(", ")}\n` +
      `Total Paid: KES ${receipt.amountPaid.toLocaleString()} (${receipt.paymentMethod}${receipt.mpesaReceipt ? ` - Ref: ${receipt.mpesaReceipt}` : ""})\n` +
      `Helpline: ${receipt.pharmacy.phone}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Receipt text copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-3.5 bg-[var(--admin-card-2)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold admin-text">Dispensing &amp; Sales Receipt</h2>
              <p className="text-[11px] admin-soft">
                {receipt ? `${receipt.receiptNumber} · ${receipt.customer.fullName}` : "Loading details…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {receipt && (
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-xs font-semibold admin-muted transition hover:admin-accent-text"
                title="Copy receipt text summary"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[var(--admin-hover)] hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Toolbar */}
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-inset)] px-5 py-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveView("thermal")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "thermal"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-black dark:text-white"
                  : "admin-muted hover:text-[var(--admin-text)]"
              }`}
            >
              80mm POS Slip
            </button>
            <button
              type="button"
              onClick={() => setActiveView("a4")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "a4"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-black dark:text-white"
                  : "admin-muted hover:text-[var(--admin-text)]"
              }`}
            >
              Full Invoice (A4)
            </button>
            <button
              type="button"
              onClick={() => setActiveView("label")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "label"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-black dark:text-white"
                  : "admin-muted hover:text-[var(--admin-text)]"
              }`}
            >
              <Tag className="h-3 w-3" />
              <span>Container Label</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || !receipt}
            className="btn-admin-primary inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print {activeView === "label" ? "Sticker" : "Slip"}</span>
          </button>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-5 scroll-admin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm admin-soft">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--admin-accent)] border-t-transparent" />
              <span className="mt-3 font-medium">Generating formatted receipt &amp; dispensing records…</span>
            </div>
          ) : !receipt ? (
            <div className="py-12 text-center text-sm text-rose-500">
              Receipt data could not be found for order #{orderId.slice(0, 8)}.
            </div>
          ) : activeView === "thermal" ? (
            /* ── 80mm Thermal POS Receipt Layout ── */
            <div className="receipt-print-area mx-auto max-w-[340px] rounded-xl border border-slate-300 bg-white p-5 text-slate-950 shadow-md font-mono text-xs">
              <div className="border-b border-dashed border-slate-400 pb-3 text-center">
                <h1 className="text-base font-black tracking-tight uppercase">{receipt.pharmacy.name}</h1>
                <p className="text-[10px] text-slate-600 mt-0.5">{receipt.pharmacy.address}</p>
                <p className="text-[10px] text-slate-600">Tel: {receipt.pharmacy.phone}</p>
                <p className="text-[9px] text-slate-500 mt-1">
                  KRA PIN: {receipt.pharmacy.taxPin}
                </p>
                <div className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                  {receipt.orderType}
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 py-2.5 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt:</span>
                  <span className="font-bold">{receipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{receipt.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold text-right truncate max-w-[180px]">{receipt.customer.fullName}</span>
                </div>
                {receipt.prescriber && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Prescriber:</span>
                    <span>{receipt.prescriber}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border-b border-dashed border-slate-400 py-2.5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-slate-200">
                  <span>Item / Qty</span>
                  <span>Total</span>
                </div>
                <div className="divide-y divide-slate-100 pt-1">
                  {receipt.items.map((item) => (
                    <div key={item.id} className="py-1.5 text-[11px]">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{item.name}</span>
                        <span>KES {item.totalPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>
                          {item.quantity} {item.billingUnit} @ {item.unitPrice.toLocaleString()}
                        </span>
                        {item.batchNumber && <span>Lot: {item.batchNumber}</span>}
                      </div>
                      {item.dosageInstructions && (
                        <p className="mt-0.5 text-[10px] italic text-emerald-800">
                          Dir: {item.dosageInstructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="py-2.5 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>KES {receipt.subtotal.toLocaleString()}</span>
                </div>
                {receipt.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-KES {receipt.discountTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-slate-800 pt-1 text-slate-950">
                  <span>TOTAL PAID:</span>
                  <span>KES {receipt.amountPaid.toLocaleString()}</span>
                </div>
                <div className="pt-1.5 flex justify-between text-[10px] text-slate-600">
                  <span>Method: {receipt.paymentMethod}</span>
                  {receipt.mpesaReceipt && <span className="font-bold">Ref: {receipt.mpesaReceipt}</span>}
                </div>
              </div>

              {/* Dispenser & Counselling Note */}
              <div className="border-t border-dashed border-slate-400 pt-3 text-center text-[10px] text-slate-500 space-y-1">
                {receipt.dispenserNote && (
                  <div className="rounded bg-slate-50 p-1.5 text-left text-[10px] text-slate-700 border border-slate-200">
                    <strong>Counsel:</strong> {receipt.dispenserNote}
                  </div>
                )}
                {receipt.dispensedBy && (
                  <p className="font-medium text-slate-800">
                    Dispensed by: {receipt.dispensedBy.name} ({receipt.dispensedBy.role})
                  </p>
                )}
                <p className="text-[9px] text-slate-400 pt-1">
                  Medicines dispensed are non-returnable once taken per PPB regulations.
                </p>
                <p className="font-bold text-emerald-800 text-[10px]">Thank you for your visit!</p>
              </div>
            </div>
          ) : activeView === "a4" ? (
            /* ── Full A4 Standard Invoice Layout ── */
            <div className="receipt-print-area mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm font-sans">
              <div className="flex items-start justify-between border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                    {receipt.pharmacy.name}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">{receipt.pharmacy.address}</p>
                  <p className="text-xs text-slate-600">
                    Phone: {receipt.pharmacy.phone} · WhatsApp: {receipt.pharmacy.whatsapp}
                  </p>
                  <p className="text-xs text-slate-500">KRA PIN: {receipt.pharmacy.taxPin}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Official Dispensing Receipt
                  </span>
                  <p className="mt-2 font-mono text-sm font-bold text-slate-900">{receipt.receiptNumber}</p>
                  <p className="text-xs text-slate-500">{receipt.createdAt}</p>
                </div>
              </div>

              {/* Patient & Dispenser Strip */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billed &amp; Dispensed To</p>
                  <p className="mt-1 font-bold text-sm text-slate-900">{receipt.customer.fullName}</p>
                  {receipt.customer.phone && <p className="text-slate-600">{receipt.customer.phone}</p>}
                  {receipt.customer.email && <p className="text-slate-600">{receipt.customer.email}</p>}
                  {receipt.customer.address && <p className="text-slate-500">{receipt.customer.address}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clinical &amp; Dispenser Details</p>
                  {receipt.prescriber && <p className="mt-1 font-semibold text-slate-800">Prescriber: {receipt.prescriber}</p>}
                  {receipt.dispensedBy && (
                    <p className="text-slate-700">
                      Dispenser: {receipt.dispensedBy.name} ({receipt.dispensedBy.role})
                    </p>
                  )}
                  <p className="text-slate-500">Payment: {receipt.paymentMethod} {receipt.mpesaReceipt ? `(${receipt.mpesaReceipt})` : ""}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] uppercase text-slate-500">
                      <th className="pb-2 font-bold">Item Description &amp; Administration</th>
                      <th className="pb-2 text-center font-bold">Batch / Exp</th>
                      <th className="pb-2 text-center font-bold">Qty</th>
                      <th className="pb-2 text-right font-bold">Unit Price</th>
                      <th className="pb-2 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receipt.items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="py-2.5 pr-2">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          {item.genericName && item.genericName !== item.name && (
                            <p className="text-[11px] text-slate-500">Generic: {item.genericName}</p>
                          )}
                          {item.dosageInstructions && (
                            <p className="mt-0.5 text-[11px] italic text-emerald-800">
                              Directions: {item.dosageInstructions}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 text-center font-mono text-[10px] text-slate-600">
                          {item.batchNumber || "—"}
                          {item.expiryDate && <p className="text-[9px] text-slate-400">Exp: {item.expiryDate}</p>}
                        </td>
                        <td className="py-2.5 text-center text-slate-800 font-semibold">
                          {item.quantity} {item.billingUnit}
                        </td>
                        <td className="py-2.5 text-right text-slate-600 font-mono">
                          KES {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-900 font-mono">
                          KES {item.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="border-t border-slate-200 pt-4 text-xs">
                <div className="ml-auto w-64 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>KES {receipt.subtotal.toLocaleString()}</span>
                  </div>
                  {receipt.discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Total Discount:</span>
                      <span>-KES {receipt.discountTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-950 border-t border-slate-300 pt-2">
                    <span>Total Paid:</span>
                    <span>KES {receipt.amountPaid.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {receipt.dispenserNote && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
                  <strong>Dispenser Counselling &amp; Clinical Notes:</strong>
                  <p className="mt-0.5">{receipt.dispenserNote}</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Container Dispensing Sticker Label (50x30mm) ── */
            <div className="receipt-print-area mx-auto max-w-sm rounded-xl border-2 border-slate-900 bg-white p-4 text-slate-950 shadow-md font-sans">
              <div className="border-b-2 border-slate-900 pb-2 text-center">
                <p className="text-xs font-black uppercase tracking-wider">{receipt.pharmacy.name}</p>
                <p className="text-[9px] text-slate-600">Helpline: {receipt.pharmacy.phone}</p>
              </div>

              <div className="py-3 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                  <span>Patient: {receipt.customer.fullName}</span>
                  <span className="font-mono text-[10px]">{receipt.createdAt.slice(0, 10)}</span>
                </div>

                <div className="space-y-2">
                  {receipt.items.map((it, idx) => (
                    <div key={idx} className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                      <p className="font-bold text-slate-950 text-sm">
                        {it.name} {it.strengthDisplay || ""}
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-800">
                        Directions: {it.dosageInstructions || "Take as directed by pharmacist."}
                      </p>
                      <p className="mt-1 font-mono text-[9px] text-slate-500">
                        Qty: {it.quantity} {it.billingUnit} | Lot: {it.batchNumber || "N/A"}
                        {it.expiryDate ? ` | Exp: ${it.expiryDate}` : ""}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded border border-rose-300 bg-rose-50 p-1.5 text-center text-[10px] font-black text-rose-800 tracking-wide uppercase">
                  KEEP OUT OF REACH OF CHILDREN
                </div>

                {receipt.dispensedBy && (
                  <p className="text-right text-[9px] text-slate-500">
                    Dispensed by: {receipt.dispensedBy.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Electronic Dispatch Box ── */}
          {receipt && (
            <div className="mt-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold admin-text flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-emerald-600" />
                  <span>Send Electronic Receipt to Customer</span>
                </h3>
                {receipt.customer.phone && (
                  <a
                    href={`https://wa.me/${receipt.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hello ${receipt.customer.fullName}, here is your dispensing receipt from ${receipt.pharmacy.name}: Total KES ${receipt.amountPaid.toLocaleString()} (Receipt: ${receipt.receiptNumber}). Thank you!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-600/20"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Open in WhatsApp Web</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              <form onSubmit={handleSendReceipt} className="mt-3 flex flex-wrap gap-2">
                <select
                  value={sendChannel}
                  onChange={(e) => {
                    const c = e.target.value as "email" | "sms" | "whatsapp";
                    setSendChannel(c);
                    if (c === "email") {
                      setRecipient(receipt.customer.email || "");
                    } else {
                      setRecipient(receipt.customer.phone || "");
                    }
                  }}
                  className="input-admin w-auto text-xs font-semibold"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>

                <input
                  type={sendChannel === "email" ? "email" : "tel"}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={sendChannel === "email" ? "patient@example.com" : "+254712345678"}
                  className="input-admin flex-1 text-xs"
                  required
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="btn-admin-primary inline-flex items-center gap-1.5 text-xs font-bold px-4"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sending ? "Dispatching…" : "Send Receipt"}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--admin-border)] bg-[var(--admin-card-2)] px-5 py-3">
          <p className="text-[11px] admin-soft">
            Directly formatted for standard 80mm ESC/POS thermal printers &amp; standard laser printers.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !receipt}
              className="btn-admin-primary inline-flex items-center gap-1.5 text-xs font-bold"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print {activeView === "label" ? "Label" : "Receipt"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-admin-secondary text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
