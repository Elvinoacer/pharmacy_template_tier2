"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Users, CalendarClock, Mail, MessageSquare, MessageCircle, Bell, Type, FileText, Calendar, AlertCircle, Check } from "lucide-react";

const TYPES = [
  { value: "refill", label: "Refill" },
  { value: "pickup", label: "Pickup" },
  { value: "follow_up", label: "Follow-up" },
  { value: "wellness", label: "Wellness" },
  { value: "birthday", label: "Birthday" },
  { value: "custom", label: "Custom" },
];

const CHANNELS = [
  { value: "email", icon: Mail },
  { value: "sms", icon: MessageSquare },
  { value: "whatsapp", icon: MessageCircle },
  { value: "in_app", icon: Bell },
];

export default function ReminderForm({
  action,
  customers,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customers: { id: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      <div>
        <label className="label-admin">Customer *</label>
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <select name="customerId" required className="input-admin pl-9" defaultValue="">
            <option value="" className="bg-[#122620]">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#122620]">
                {c.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Type</label>
          <select name="type" className="input-admin" defaultValue="custom">
            {TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#122620]">
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-admin">Channel</label>
          <select name="channel" className="input-admin" defaultValue="email">
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#122620]">
                {c.value === "in_app" ? "In-app" : c.value.charAt(0).toUpperCase() + c.value.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label-admin">Title *</label>
        <div className="relative">
          <Type className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="title" required placeholder="e.g. Time to refill your medication" className="input-admin pl-9" />
        </div>
      </div>

      <div>
        <label className="label-admin">Body</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-[#ecfdf5]/30" />
          <textarea name="body" rows={3} placeholder="Reminder message…" className="input-admin resize-y pl-9" />
        </div>
      </div>

      <div>
        <label className="label-admin">Schedule for *</label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="scheduledFor" type="datetime-local" required className="input-admin pl-9" />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-4 py-2.5 text-sm font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><CalendarClock className="h-4 w-4" /> Schedule reminder</>}
      </button>
    </form>
  );
}
