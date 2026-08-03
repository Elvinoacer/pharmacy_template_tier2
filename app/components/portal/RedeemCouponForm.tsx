"use client";

import { useActionState, useEffect } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { redeemCouponAction, type ActionState } from "@/app/actions/portal";
import { PendingSubmitButton } from "@/app/components/PendingSubmitButton";

export function RedeemCouponForm({
  couponId,
  canRedeem,
  pointsShort,
  alreadyRedeemed,
}: {
  couponId: string;
  canRedeem: boolean;
  pointsShort: number;
  alreadyRedeemed: boolean;
}) {
  const [state, formAction] = useActionState(redeemCouponAction, {} as ActionState);
  const redeemed = alreadyRedeemed || Boolean(state?.success);

  useEffect(() => {
    if (!state?.success) return;
    const timer = window.setTimeout(() => window.location.reload(), 900);
    return () => window.clearTimeout(timer);
  }, [state?.success]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="couponId" value={couponId} />
      <PendingSubmitButton
        disabled={!canRedeem || redeemed}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#084c3f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        pendingChildren={
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redeeming…
          </>
        }
      >
        {redeemed ? (
          <>
            <Check className="h-3.5 w-3.5" /> Redeemed
          </>
        ) : canRedeem ? (
          <>
            <Check className="h-3.5 w-3.5" /> Redeem
          </>
        ) : (
          `Need ${pointsShort} more`
        )}
      </PendingSubmitButton>
      {state?.success && <p className="text-[10px] font-medium text-emerald-700">{state.success}</p>}
      {state?.error && (
        <p className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700">
          <AlertCircle className="h-3 w-3" /> {state.error}
        </p>
      )}
    </form>
  );
}
