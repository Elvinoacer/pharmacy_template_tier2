"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { CalendarClock, Mail, MessageSquare, MessageCircle, Bell, Type, FileText, Calendar, AlertCircle, Check, Send, Zap, Wand2 } from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { toast } from "@/app/components/Toaster";

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
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState("");
  const [sendNow, setSendNow] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function aiDraft() {
    if (!title.trim()) {
      toast.info("Add a title first.");
      return;
    }
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a pharmacy assistant drafting a short reminder message to a customer. The reminder title is given. Write a warm, concise body (1-3 sentences) including any relevant next step. Output only the body, no preamble.",
            },
            { role: "user", content: `Reminder title: ${title}` },
          ],
        }),
      });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { reply?: string; content?: string };
      const suggestion = j.reply || j.content || "";
      if (suggestion) {
        setBody(suggestion.trim());
        toast.success("AI drafted the reminder body.");
      } else {
        toast.error("AI did not return a suggestion.");
      }
    } catch {
      toast.error("AI helper unavailable.");
    }
  }

  return (
    <form action={formAction} className="space-y-4">
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

      <div>
        <label className="label-admin">Customer *</label>
        <CustomerPicker
          name="customerId"
          value={customerId}
          onChange={setCustomerId}
          variant="admin"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Type</label>
          <select name="type" className="input-admin" defaultValue="custom">
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-admin">Channel</label>
          <select name="channel" className="input-admin" defaultValue="email">
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value === "in_app" ? "In-app" : c.value.charAt(0).toUpperCase() + c.value.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label-admin">Title *</label>
        <div className="relative">
          <Type className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Time to refill your medication"
            className="input-admin pl-9"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label-admin">Body</label>
          <button
            type="button"
            onClick={aiDraft}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2 py-0.5 text-[10px] font-semibold text-white hover:brightness-110"
          >
            <Wand2 className="h-2.5 w-2.5" /> AI draft
          </button>
        </div>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 admin-soft" />
          <textarea
            name="body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Reminder message…"
            className="input-admin resize-y pl-9"
          />
        </div>
      </div>

      <div>
        <label className="label-admin">When to send *</label>
        <div className="mb-2 flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="sendNow"
              value="schedule"
              checked={!sendNow}
              onChange={() => setSendNow(false)}
              className="accent-[var(--admin-accent)]"
            />
            <Calendar className="h-3 w-3" /> Schedule for later
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="sendNow"
              value="now"
              checked={sendNow}
              onChange={() => setSendNow(true)}
              className="accent-[var(--admin-accent)]"
            />
            <Zap className="h-3 w-3" /> Send immediately
          </label>
        </div>
        {!sendNow && (
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="scheduledFor" type="datetime-local" required className="input-admin pl-9" />
          </div>
        )}
        {sendNow && (
          <input type="hidden" name="scheduledFor" value={new Date().toISOString().slice(0, 16)} />
        )}
      </div>

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
