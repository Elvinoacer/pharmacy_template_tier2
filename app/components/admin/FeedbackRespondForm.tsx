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

      <div className="relative">
        <MessageSquare className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 admin-soft" />
        <textarea
          name="response"
          required
          rows={3}
          placeholder="Write your response to the customer…"
          className="input-admin resize-y pl-9"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs admin-muted hover:text-[var(--admin-text)]">
          <input
            type="checkbox"
            name="isPublic"
            defaultChecked={isPublic}
            className="h-3.5 w-3.5 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text focus:ring-[var(--admin-accent)]"
          />
          <Globe className="h-3 w-3" /> Display publicly on website
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn-admin-sm disabled:opacity-50"
        >
          {pending ? <><span className="typing-dot" /> Saving…</> : <><Send className="h-3.5 w-3.5" /> Respond</>}
        </button>
      </div>
    </form>
  );
}
