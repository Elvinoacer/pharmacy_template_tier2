"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";

export default function ReminderForm({
  action,
  customers,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customers: { id: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state?.success && <p className="text-sm text-teal-300">{state.success}</p>}
      <select name="customerId" required className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        <option value="" className="text-black">Select customer</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id} className="text-black">
            {c.fullName}
          </option>
        ))}
      </select>
      <select name="type" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {["refill", "pickup", "follow_up", "wellness", "birthday", "custom"].map((t) => (
          <option key={t} value={t} className="text-black">
            {t}
          </option>
        ))}
      </select>
      <select name="channel" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {["email", "sms", "whatsapp", "in_app"].map((t) => (
          <option key={t} value={t} className="text-black">
            {t}
          </option>
        ))}
      </select>
      <input name="title" required placeholder="Title" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <textarea name="body" rows={3} placeholder="Body" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <input name="scheduledFor" type="datetime-local" required className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <button type="submit" disabled={pending} className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-[#042f2e] disabled:opacity-50">
        {pending ? "Saving…" : "Schedule"}
      </button>
    </form>
  );
}
