"use client";

import { useState } from "react";
import { Sparkles, Printer, RefreshCw } from "lucide-react";
import { PrescriptionSubstitutionModal } from "@/app/components/admin/PrescriptionSubstitutionModal";
import { ReceiptModal } from "@/app/components/admin/ReceiptModal";

export function PrescriptionDetailActions({
  prescriptionId,
  medicineName,
  medicationId,
  orderId,
}: {
  prescriptionId: string;
  medicineName: string;
  medicationId?: string | null;
  orderId?: string | null;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setSubOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Substitute Generic</span>
      </button>

      {orderId && (
        <button
          type="button"
          onClick={() => setReceiptOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-1.5 text-xs font-bold admin-text transition hover:brightness-110"
        >
          <Printer className="h-3.5 w-3.5 text-slate-600" />
          <span>Receipt &amp; Label</span>
        </button>
      )}

      <PrescriptionSubstitutionModal
        prescriptionId={prescriptionId}
        currentMedicineName={medicineName}
        currentMedicationId={medicationId}
        isOpen={subOpen}
        onClose={() => setSubOpen(false)}
        onSuccess={() => window.location.reload()}
      />

      <ReceiptModal
        orderId={orderId || null}
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
}
