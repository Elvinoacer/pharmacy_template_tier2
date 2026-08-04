"use client";

/**
 * Polished refill row with:
 *   - Inline status change with toast confirmation
 *   - Click anywhere on the row → navigate to customer detail (when customer exists)
 *   - Hover effect that signals clickability
 *   - Visible save button label (not just an icon)
 */

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Phone, Mail, Clock, Save, Check, ChevronRight } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { REFILL_STATUSES, refillStatusMeta } from "@/app/lib/types";
import { formatDateTime } from "@/app/lib/time";

export type RefillRowData = {
  id: string;
  status: string;
  medicineName: string;
  rxReference: string | null;
  source: string;
  customerName: string | null;
  customerFullName: string | null;
  customerId: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date | string;
};

export function RefillRow({ refill }: { refill: RefillRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const meta = refillStatusMeta(refill.status);
  const customerLabel = refill.customerName || refill.customerFullName || "Guest";
  const customerHref = refill.customerId ? `/admin/customers/${refill.customerId}` : null;
  const created = typeof refill.createdAt === "string" ? refill.createdAt : refill.createdAt.toISOString();

  function onStatusChange(formData: FormData) {
    const newStatus = String(formData.get("status") || "");
    if (newStatus === refill.status) return;
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/refills/update", {
          method: "POST",
          body: formData,
        });
        const body = (await r.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        if (!r.ok) {
          if (body.error === "insufficient_stock" || body.message?.toLowerCase().includes("stock")) {
            toast.error(body.message || "Insufficient stock to fulfill this refill.");
          } else {
            toast.error(body.message || "Could not update status — please try again.");
          }
          return;
        }
        const label = REFILL_STATUSES.find((s) => s.value === newStatus)?.label || newStatus;
        toast.success(`Refill status updated to "${label}"`);
        setSavedStatus(newStatus);
        router.refresh();
      } catch {
        toast.error("Could not update status — please try again.");
      }
    });
  }

  return (
    <tr
      className={`group ${customerHref ? "cursor-pointer" : ""} hover:bg-[var(--admin-hover)]`}
      onClick={(e) => {
        // Don't navigate when clicking on the form or status select.
        const target = e.target as HTMLElement;
        if (target.closest("form") || target.closest("button") || target.closest("a") || target.closest("select")) return;
        if (customerHref) router.push(customerHref);
      }}
    >
      <td>
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold admin-text">{customerLabel}</p>
              {customerHref && (
                <ChevronRight className="h-3 w-3 admin-soft opacity-0 transition group-hover:opacity-100" />
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] admin-soft">
              {refill.phone && (
                <span className="inline-flex items-center gap-0.5">
                  <Phone className="h-2.5 w-2.5" /> {refill.phone}
                </span>
              )}
              {refill.email && (
                <span className="inline-flex items-center gap-0.5">
                  <Mail className="h-2.5 w-2.5" /> {refill.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td>
        <p className="font-medium admin-text">{refill.medicineName}</p>
        <p className="font-mono text-[10px] admin-soft">{refill.rxReference || "—"}</p>
      </td>
      <td>
        <span className="inline-flex items-center rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-[10px] font-medium capitalize admin-muted">
          {refill.source}
        </span>
      </td>
      <td className="text-xs admin-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {formatDateTime(created)}
        </span>
      </td>
      <td>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
          {meta.label}
        </span>
      </td>
      <td>
        <form action={onStatusChange} className="flex items-center gap-1.5">
          <input type="hidden" name="id" value={refill.id} />
          <select
            name="status"
            defaultValue={refill.status}
            disabled={pending}
            className="rounded-lg border border-[var(--admin-border-2)] bg-[var(--admin-inset)] px-2 py-1 text-xs admin-text focus:border-[var(--admin-accent)] focus:outline-none disabled:opacity-60"
            onClick={(e) => e.stopPropagation()}
          >
            {REFILL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            title="Save status"
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-accent-soft)] px-2 py-1 text-[10px] font-semibold admin-accent-text transition hover:bg-[var(--admin-accent-soft)] hover:brightness-110 disabled:opacity-50"
            onClick={(e) => e.stopPropagation()}
          >
            {pending ? (
              <><span className="typing-dot" /> Saving…</>
            ) : savedStatus ? (
              <><Check className="h-3 w-3" /> Saved</>
            ) : (
              <><Save className="h-3 w-3" /> Save</>
            )}
          </button>
        </form>
      </td>
    </tr>
  );
}
