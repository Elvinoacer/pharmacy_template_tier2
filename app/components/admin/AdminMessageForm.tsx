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
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success">
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
                className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset)] px-2 py-2 text-[10px] font-semibold admin-muted transition hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)] has-[:checked]:border-[var(--admin-accent)] has-[:checked]:bg-[var(--admin-accent-soft)] has-[:checked]:admin-accent-text"
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
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
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
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="scheduledFor" type="datetime-local" className="input-admin pl-9" />
        </div>
        <p className="mt-1 text-[10px] admin-soft">Leave empty to send immediately.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
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
