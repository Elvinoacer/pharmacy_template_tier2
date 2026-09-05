"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Mail, MessageSquare, MessageCircle, Layout, FileText, Calendar, AlertCircle, Check, Send, Wand2 } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { callAiDraft } from "@/app/lib/ai-form-helper";

const CHANNELS = [
  { value: "email", label: "Email", icon: Mail, hasSubject: true },
  { value: "sms", label: "SMS", icon: MessageSquare, hasSubject: false },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, hasSubject: false },
  { value: "portal", label: "Portal", icon: Layout, hasSubject: false },
] as const;

export default function AdminMessageForm({
  action,
  customerId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customerId: string;
}) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [channel, setChannel] = useState<string>("email");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const current = CHANNELS.find((candidate) => candidate.value === channel) || CHANNELS[0];

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (!state?.success) return;

    toast.success(state.success);
    const frame = requestAnimationFrame(() => {
      setBody("");
      setSubject("");
      setScheduledFor("");
    });
    return () => cancelAnimationFrame(frame);
  }, [state]);

  async function aiDraft() {
    if (!body.trim()) {
      toast.info("Add a quick note about what you want to say first, then AI can expand it.");
      return;
    }
    setAiLoading(true);
    try {
      await callAiDraft({
        systemPrompt:
          "You are a helpful pharmacy assistant. The staff member is composing a message to a customer. Rewrite the draft into a warm, professional, concise message. Preserve any medical specifics. Output ONLY the message body, no preamble.",
        userPrompt: body,
        onResult: setBody,
        successMessage: "AI drafted a polished version. Review and send.",
        errorMessage: "AI helper unavailable. Check GROQ_API_KEY.",
      });
    } finally {
      setAiLoading(false);
    }
  }

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

      <fieldset>
        <legend className="label-admin">Channel</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {CHANNELS.map((candidate) => {
            const Icon = candidate.icon;
            const isActive = channel === candidate.value;
            const radioId = `${fieldPrefix}-channel-${candidate.value}`;
            return (
              <label
                key={candidate.value}
                htmlFor={radioId}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text"
                    : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-muted hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)]"
                }`}
              >
                <input
                  id={radioId}
                  type="radio"
                  name="channel"
                  value={candidate.value}
                  checked={isActive}
                  onChange={() => setChannel(candidate.value)}
                  className="sr-only"
                />
                <Icon className="h-4 w-4" aria-hidden="true" />
                {candidate.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {current.hasSubject && (
        <div>
          <label htmlFor={`${fieldPrefix}-subject`} className="label-admin">Subject</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              id={`${fieldPrefix}-subject`}
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject line"
              className="input-admin pl-9"
            />
          </div>
        </div>
      )}
      {!current.hasSubject && <input type="hidden" name="subject" value="" />}

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor={`${fieldPrefix}-body`} className="label-admin">Message *</label>
          <button
            type="button"
            onClick={aiDraft}
            disabled={aiLoading}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2.5 py-0.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            title="Let AI polish your draft"
          >
            <Wand2 className={`h-2.5 w-2.5 ${aiLoading ? "animate-pulse" : ""}`} /> {aiLoading ? "Polishing…" : "AI polish"}
          </button>
        </div>
        <textarea
          id={`${fieldPrefix}-body`}
          name="body"
          required
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Type your message to the customer…"
          className="input-admin resize-y"
        />
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-schedule`} className="label-admin">Schedule (optional)</label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            id={`${fieldPrefix}-schedule`}
            name="scheduledFor"
            type="datetime-local"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            className="input-admin pl-9"
          />
        </div>
        <p className="mt-1 text-xs admin-soft">
          Leave empty to send immediately. Times use the pharmacy timezone. A cron
          job delivers scheduled messages at the correct local moment.
        </p>
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
