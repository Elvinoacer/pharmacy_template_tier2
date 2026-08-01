"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";

export default function AdminMessageForm({
  action,
  customerId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customerId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="customerId" value={customerId} />
      {state?.error && <p className="text-xs text-rose-300">{state.error}</p>}
      {state?.success && <p className="text-xs text-teal-300">{state.success}</p>}
      <select name="channel" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        <option value="email" className="text-black">Email</option>
        <option value="sms" className="text-black">SMS</option>
        <option value="whatsapp" className="text-black">WhatsApp</option>
        <option value="portal" className="text-black">Portal</option>
      </select>
      <input
        name="subject"
        placeholder="Subject"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
      />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Message body"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
      />
      <input
        name="scheduledFor"
        type="datetime-local"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-teal-400 px-3 py-2 text-sm font-semibold text-[#042f2e] disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send / schedule"}
      </button>
    </form>
  );
}
