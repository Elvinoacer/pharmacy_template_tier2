"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Truck } from "lucide-react";
import type { ActionState } from "@/app/actions/admin";
import { PendingSubmitButton } from "@/app/components/PendingSubmitButton";

export default function DispatchPrescriptionForm({
  action,
  prescriptionId,
  quantity,
  stockAvailable,
  medicineName,
  hasMedicationLink,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  prescriptionId: string;
  quantity: number;
  stockAvailable: number | null;
  medicineName: string;
  hasMedicationLink: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {} as ActionState);

  useEffect(() => {
    if (state?.success) {
      // Refresh server components so dispatched badge / stock KPIs update.
      router.refresh();
    }
  }, [state?.success, router]);

  const insufficient =
    hasMedicationLink &&
    stockAvailable !== null &&
    stockAvailable < quantity;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {hasMedicationLink && stockAvailable !== null && (
        <p
          className={`text-xs font-semibold ${
            insufficient
              ? "text-rose-600 dark:text-rose-400"
              : "admin-soft"
          }`}
        >
          {insufficient
            ? `Need ${quantity} · only ${stockAvailable} in stock`
            : `Will deduct ${quantity} · ${stockAvailable} in stock`}
        </p>
      )}
      {!hasMedicationLink && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          No catalogue link — dispatch will not change stock
        </p>
      )}

      {state?.error && (
        <div className="max-w-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-left text-xs font-medium text-rose-800 dark:text-rose-300">
          <span className="inline-flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{state.error}</span>
          </span>
        </div>
      )}
      {state?.success && (
        <div className="max-w-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <span className="inline-flex items-start gap-1.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{state.success}</span>
          </span>
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="id" value={prescriptionId} />
        <PendingSubmitButton
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
          pendingChildren={
            <>
              <Truck className="h-3.5 w-3.5 animate-pulse" /> Dispatching…
            </>
          }
          title={
            insufficient
              ? `Cannot fully deduct: ${medicineName} has ${stockAvailable} units, need ${quantity}`
              : `Dispatch ${medicineName} and deduct ${quantity} from stock`
          }
        >
          <Truck className="h-3.5 w-3.5" /> Dispatch & deduct stock
        </PendingSubmitButton>
      </form>
    </div>
  );
}
