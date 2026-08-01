"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";

export default function CampaignForm({
  action,
  segments,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  segments: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state?.success && <p className="text-sm text-teal-300">{state.success}</p>}
      <input name="name" required placeholder="Campaign name" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <input name="description" placeholder="Description" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <select name="channel" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        <option value="email" className="text-black">Email</option>
        <option value="sms" className="text-black">SMS</option>
        <option value="whatsapp" className="text-black">WhatsApp</option>
        <option value="multi" className="text-black">Multi-channel</option>
      </select>
      <select name="segmentId" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        <option value="" className="text-black">All customers</option>
        {segments.map((s) => (
          <option key={s.id} value={s.id} className="text-black">
            {s.name}
          </option>
        ))}
      </select>
      <input name="subject" placeholder="Subject (email)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <textarea name="body" required rows={4} placeholder="Message body" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <input name="scheduledFor" type="datetime-local" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <button type="submit" disabled={pending} className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-[#042f2e] disabled:opacity-50">
        {pending ? "Saving…" : "Create campaign"}
      </button>
    </form>
  );
}
