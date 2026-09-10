"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { portalReplyAction, type ActionState } from "@/app/actions/portal";
import { toast } from "@/app/components/Toaster";
import { Send } from "lucide-react";

export function PortalReplyForm({ conversationId }: { conversationId: string }) {
  const inputId = useId();
  const [state, formAction, pending] = useActionState(portalReplyAction, {} as ActionState);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (!state?.success) return;

    toast.success(state.success);
    const frame = requestAnimationFrame(() => setBody(""));
    return () => cancelAnimationFrame(frame);
  }, [state]);

  return (
    <form action={formAction} className="mt-3 flex min-w-0 flex-col gap-2 border-t border-[var(--line)] pt-3 sm:flex-row sm:items-center">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor={inputId} className="sr-only">Reply message</label>
      <input
        id={inputId}
        name="body"
        required
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a reply…"
        className="input-premium min-w-0 flex-1 !py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#084c3f] disabled:opacity-60 sm:w-auto"
      >
        <Send className="h-3.5 w-3.5" /> {pending ? "…" : "Reply"}
      </button>
    </form>
  );
}
