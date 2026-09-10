"use client";

import { useActionState, useId, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { CalendarClock, Mail, MessageSquare, MessageCircle, Bell, Type, FileText, Calendar, AlertCircle, Check, Send, Zap, Wand2 } from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { toast } from "@/app/components/Toaster";
import { callAiDraft } from "@/app/lib/ai-form-helper";
import { localNowDatetimeInputValue } from "@/app/lib/time";

const TYPES = [
  { value: "refill", label: "Refill" },
  { value: "pickup", label: "Pickup" },
  { value: "follow_up", label: "Follow-up" },
  { value: "wellness", label: "Wellness" },
  { value: "birthday", label: "Birthday" },
  { value: "medication_dose", label: "Medication dose" },
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
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState("");
  const [sendNow, setSendNow] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function aiDraft() {
    if (!title.trim()) {
      toast.info("Add a title first.");
      return;
    }
    setAiLoading(true);
    try {
      await callAiDraft({
        systemPrompt:
          "You are a pharmacy assistant drafting a short reminder message to a customer. The reminder title is given. Write a warm, concise body (1-3 sentences) including any relevant next step. Output only the body, no preamble.",
        userPrompt: `Reminder title: ${title}`,
        onResult: setBody,
        successMessage: "AI drafted the reminder body.",
      });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <form action={formAction} className="min-w-0 space-y-4">
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

      <div className="min-w-0">
        <label className="label-admin">Customer *</label>
        <CustomerPicker
          name="customerId"
          value={customerId}
          onChange={setCustomerId}
          variant="admin"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${fieldPrefix}-1`} className="label-admin">Type</label>
          <select id={`${fieldPrefix}-1`} name="type" className="input-admin w-full" defaultValue="custom">
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${fieldPrefix}-2`} className="label-admin">Channel</label>
          <select id={`${fieldPrefix}-2`} name="channel" className="input-admin w-full" defaultValue="email">
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value === "in_app" ? "In-app" : c.value.charAt(0).toUpperCase() + c.value.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor={`${fieldPrefix}-3`} className="label-admin">Title *</label>
        <div className="relative">
          <Type className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            id={`${fieldPrefix}-3`}
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Time to refill your medication"
            className="input-admin w-full pl-9"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="label-admin !mb-0">Body</label>
          <button
            type="button"
            onClick={aiDraft}
            disabled={aiLoading}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--admin-accent-soft)] px-3 py-1 text-xs font-semibold admin-accent-text transition-colors hover:bg-[var(--admin-hover)] disabled:cursor-wait disabled:opacity-60"
          >
            <Wand2 className={`h-3 w-3 ${aiLoading ? "animate-pulse" : ""}`} /> {aiLoading ? "Drafting…" : "AI draft"}
          </button>
        </div>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 admin-soft" />
          <textarea
            name="body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Reminder message…"
            className="input-admin w-full resize-y pl-9"
          />
        </div>
      </div>

      <fieldset className="min-w-0">
        <legend className="label-admin">When to send *</legend>
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2 text-xs admin-text transition-colors hover:border-[var(--admin-border-2)]">
            <input
              type="radio"
              name="sendNow"
              value="schedule"
              checked={!sendNow}
              onChange={() => setSendNow(false)}
              className="accent-[var(--admin-accent)]"
            />
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Schedule for later</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2 text-xs admin-text transition-colors hover:border-[var(--admin-border-2)]">
            <input
              type="radio"
              name="sendNow"
              value="now"
              checked={sendNow}
              onChange={() => setSendNow(true)}
              className="accent-[var(--admin-accent)]"
            />
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>Send immediately</span>
          </label>
        </div>
        {!sendNow && (
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="scheduledFor" type="datetime-local" required className="input-admin w-full pl-9" />
          </div>
        )}
        {sendNow && <input type="hidden" name="scheduledFor" value={localNowDatetimeInputValue()} />}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? (
          <><span className="typing-dot" /> Saving…</>
        ) : sendNow ? (
          <><Send className="h-4 w-4" /> Send now</>
        ) : (
          <><CalendarClock className="h-4 w-4" /> Schedule reminder</>
        )}
      </button>
    </form>
  );
}
