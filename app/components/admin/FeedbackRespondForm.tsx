"use client";

import { useActionState, useEffect } from "react";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import { MessageSquare, Globe, AlertCircle, Check, Send } from "lucide-react";

export default function FeedbackRespondForm({
  action,
  id,
  isPublic = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  isPublic?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />

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

      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] admin-muted sm:text-xs">
        Response
        <div className="relative mt-1.5">
          <MessageSquare className="pointer-events-none absolute left-3 top-3.5 h-3.5 w-3.5 admin-soft" />
          <textarea
            name="response"
            required
            rows={3}
            placeholder="Write a clear response to the customer…"
            className="input-admin min-h-28 w-full resize-y pl-9 pr-3 sm:min-h-24"
          />
        </div>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2 text-xs admin-muted transition hover:border-[var(--admin-border-2)] hover:text-[var(--admin-text)] sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <input
            type="checkbox"
            name="isPublic"
            defaultChecked={isPublic}
            className="h-4 w-4 shrink-0 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text focus:ring-[var(--admin-accent)]"
          />
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span>Display publicly on website</span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn-admin-sm w-full justify-center disabled:opacity-50 sm:w-auto"
        >
          {pending ? (
            <>
              <span className="typing-dot" /> Saving…
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Respond
            </>
          )}
        </button>
      </div>
    </form>
  );
}
