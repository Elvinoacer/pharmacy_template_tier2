"use client";

import { useActionState, useEffect } from "react";
import { adminProcessRemindersAction, type ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import { Zap } from "lucide-react";

export function ProcessRemindersButton() {
  const [state, formAction, pending] = useActionState(
    adminProcessRemindersAction,
    {} as ActionState,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2 text-sm font-semibold text-[#422006] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? (
          <><span className="typing-dot" /> Processing…</>
        ) : (
          <><Zap className="h-4 w-4" /> Process due now</>
        )}
      </button>
    </form>
  );
}
