"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Mail, MessageSquare, MessageCircle, Layout, FileText, Calendar, AlertCircle, Check, Send } from "lucide-react";

const CHANNELS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "portal", label: "Portal", icon: Layout },
] as const;

export default function AdminMessageForm({
  action,
  customerId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customerId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />

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

      {/* Channel picker */}
      <div>
        <label className="label-admin">Channel</label>
        <div className="grid grid-cols-4 gap-1.5">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <label
                key={c.value}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-[10px] font-semibold text-[#ecfdf5]/65 transition hover:border-[#2dd4bf]/40 hover:text-white has-[:checked]:border-[#2dd4bf] has-[:checked]:bg-[#2dd4bf]/10 has-[:checked]:text-[#2dd4bf]"
              >
                <input type="radio" name="channel" value={c.value} defaultChecked={c.value === "email"} className="sr-only" />
                <Icon className="h-4 w-4" />
                {c.label}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label-admin">Subject</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="subject" placeholder="Subject line" className="input-admin pl-9" />
        </div>
      </div>

      <div>
        <label className="label-admin">Message *</label>
        <textarea
          name="body"
          required
          rows={4}
          placeholder="Type your message to the customer…"
          className="input-admin resize-y"
        />
      </div>

      <div>
        <label className="label-admin">Schedule (optional)</label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="scheduledFor" type="datetime-local" className="input-admin pl-9" />
        </div>
        <p className="mt-1 text-[10px] text-[#ecfdf5]/45">Leave empty to send immediately.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-4 py-2.5 text-sm font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? (
          <><span className="typing-dot" /> Sending…</>
        ) : (
          <><Send className="h-4 w-4" /> Send / schedule</>
        )}
      </button>
    </form>
  );
}
