"use client";

import { useActionState, useEffect, useState } from "react";
import {
  adminReceiveStockAction,
  adminAdjustStockAction,
  adminWriteOffLotAction,
  adminDeactivateLotAction,
  type ActionState,
} from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import { formatDate, formatDateTime } from "@/app/lib/time";
import {
  PackagePlus,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Trash2,
} from "lucide-react";

export type LotRow = {
  id: string;
  batchNumber: string;
  expiryDate: string; // ISO
  quantity: number;
  active: boolean;
  receivedAt: string;
};

export type MovementRow = {
  id: string;
  reason: string;
  quantityDelta: number;
  balanceAfter: number;
  notes: string | null;
  relatedType: string | null;
  createdAt: string;
};

export function InventoryOpsPanel({
  inventoryId,
  currentStock,
  lowStockThreshold,
  lots,
  movements,
}: {
  inventoryId: string;
  currentStock: number;
  lowStockThreshold: number;
  lots: LotRow[];
  movements: MovementRow[];
}) {
  const [tab, setTab] = useState<"receive" | "adjust" | "lots" | "history">("receive");
  const [receiveState, receiveAction, receivePending] = useActionState(
    adminReceiveStockAction,
    {} as ActionState,
  );
  const [adjustState, adjustAction, adjustPending] = useActionState(
    adminAdjustStockAction,
    {} as ActionState,
  );
  const [writeOffState, writeOffAction, writeOffPending] = useActionState(
    adminWriteOffLotAction,
    {} as ActionState,
  );

  useEffect(() => {
    if (receiveState?.success) toast.success(receiveState.success);
    if (receiveState?.error) toast.error(receiveState.error);
  }, [receiveState]);
  useEffect(() => {
    if (adjustState?.success) toast.success(adjustState.success);
    if (adjustState?.error) toast.error(adjustState.error);
  }, [adjustState]);
  useEffect(() => {
    if (writeOffState?.success) toast.success(writeOffState.success);
    if (writeOffState?.error) toast.error(writeOffState.error);
  }, [writeOffState]);

  const low = currentStock > 0 && currentStock <= lowStockThreshold;
  const out = currentStock <= 0;
  const today = new Date().toISOString().slice(0, 10);

  const tabs = [
    { id: "receive" as const, label: "Receive", icon: PackagePlus },
    { id: "adjust" as const, label: "Adjust", icon: SlidersHorizontal },
    { id: "lots" as const, label: `Lots (${lots.length})`, icon: AlertTriangle },
    { id: "history" as const, label: "History", icon: History },
  ];

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-gray-200/60 bg-white/50 shadow-xl shadow-emerald-500/5 ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20">
      <div className="border-b border-gray-200/50 px-6 py-5 dark:border-white/5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inventory operations</h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Goods-in, adjustments, batch/expiry lots, and full stock ledger.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                out
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
                  : low
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
              }`}
            >
              {currentStock} in stock
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
              Alert ≤ {lowStockThreshold}
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {tab === "receive" && (
          <form action={receiveAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="inventoryId" value={inventoryId} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Quantity *
              </label>
              <input
                name="quantity"
                type="number"
                min={1}
                required
                defaultValue={1}
                className="input-admin w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Purchase price (optional)
              </label>
              <input name="purchasePrice" type="number" min={0} step="0.01" className="input-admin w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Batch number
              </label>
              <input name="batchNumber" className="input-admin w-full" placeholder="e.g. BN-2026-041" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Expiry date
              </label>
              <input name="expiryDate" type="date" min={today} className="input-admin w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Notes / supplier invoice
              </label>
              <input name="notes" className="input-admin w-full" placeholder="Invoice #, supplier delivery ref…" />
            </div>
            {receiveState?.error && (
              <p className="sm:col-span-2 text-sm text-rose-600">{receiveState.error}</p>
            )}
            <div className="sm:col-span-2">
              <button type="submit" disabled={receivePending} className="btn-admin">
                {receivePending ? "Receiving…" : "Receive stock"}
              </button>
            </div>
          </form>
        )}

        {tab === "adjust" && (
          <form action={adjustAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="inventoryId" value={inventoryId} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Mode
              </label>
              <select name="mode" className="input-admin w-full" defaultValue="delta">
                <option value="delta">Relative (+/− delta)</option>
                <option value="absolute">Set absolute count (stocktake)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Reason type
              </label>
              <select name="reason" className="input-admin w-full" defaultValue="adjust">
                <option value="adjust">Adjust / stocktake</option>
                <option value="write_off">Write-off / damage</option>
                <option value="return">Customer/supplier return (in)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Quantity *
              </label>
              <input
                name="quantity"
                type="number"
                required
                className="input-admin w-full"
                placeholder="e.g. -2 or 50"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Delta mode: negative removes stock. Absolute mode: final shelf count.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                Audit note *
              </label>
              <input
                name="notes"
                required
                className="input-admin w-full"
                placeholder="Why is stock changing?"
              />
            </div>
            {adjustState?.error && (
              <p className="sm:col-span-2 text-sm text-rose-600">{adjustState.error}</p>
            )}
            <div className="sm:col-span-2">
              <button type="submit" disabled={adjustPending} className="btn-admin">
                {adjustPending ? "Saving…" : "Apply adjustment"}
              </button>
            </div>
          </form>
        )}

        {tab === "lots" && (
          <div className="space-y-3">
            {lots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-white/10">
                No batches yet. Receive stock with a batch number + expiry to start lot tracking (FEFO).
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-white/5 dark:border-white/10">
                {lots.map((lot) => {
                  const exp = new Date(lot.expiryDate);
                  const days = Math.ceil((exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                  const expired = days < 0;
                  const soon = !expired && days <= 60;
                  return (
                    <li
                      key={lot.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Batch {lot.batchNumber}
                          {!lot.active && (
                            <span className="ml-2 text-xs font-medium text-slate-400">inactive</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {lot.quantity} units · Exp {formatDate(exp)} · Received{" "}
                          {formatDate(lot.receivedAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          expired
                            ? "bg-rose-100 text-rose-700"
                            : soon
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {expired ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                      </span>
                      {lot.active && lot.quantity > 0 && (
                        <form action={writeOffAction}>
                          <input type="hidden" name="lotId" value={lot.id} />
                          <input type="hidden" name="inventoryId" value={inventoryId} />
                          <input type="hidden" name="notes" value="Expired/damaged lot write-off" />
                          <button
                            type="submit"
                            disabled={writeOffPending}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            title="Write off remaining quantity"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Write off
                          </button>
                        </form>
                      )}
                      {lot.active && lot.quantity <= 0 && (
                        <form action={adminDeactivateLotAction}>
                          <input type="hidden" name="lotId" value={lot.id} />
                          <input type="hidden" name="inventoryId" value={inventoryId} />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-slate-500 hover:underline"
                          >
                            Deactivate
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="overflow-x-auto">
            {movements.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-white/10">
                No stock movements recorded yet.
              </p>
            ) : (
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/10">
                    <th className="px-2 py-2 font-semibold">When</th>
                    <th className="px-2 py-2 font-semibold">Reason</th>
                    <th className="px-2 py-2 font-semibold text-right">Δ</th>
                    <th className="px-2 py-2 font-semibold text-right">Balance</th>
                    <th className="px-2 py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-50 dark:border-white/5"
                    >
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-500">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-2 py-2">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold capitalize dark:bg-white/10">
                          {m.reason.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-bold tabular-nums ${
                          m.quantityDelta < 0
                            ? "text-rose-600"
                            : m.quantityDelta > 0
                              ? "text-emerald-600"
                              : "text-gray-400"
                        }`}
                      >
                        {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-700 dark:text-gray-200">
                        {m.balanceAfter}
                      </td>
                      <td className="max-w-[14rem] truncate px-2 py-2 text-xs text-gray-500">
                        {m.notes || m.relatedType || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
