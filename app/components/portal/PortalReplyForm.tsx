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
    <form action={formAction} className="mt-3 flex gap-2 border-t border-[#e3ebe6] pt-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor={inputId} className="sr-only">Reply message</label>
      <input
        id={inputId}
        name="body"
        required
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write a reply…"
        className="input-premium flex-1 !py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="inline-flex items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#084c3f] disabled:opacity-60"
      >
        <Send className="h-3.5 w-3.5" /> {pending ? "…" : "Reply"}
      </button>
    </form>
  );
}
