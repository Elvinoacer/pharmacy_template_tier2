"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Mail, MessageSquare, MessageCircle, Layout, FileText, Calendar, AlertCircle, Check, Send, Wand2 } from "lucide-react";
import { toast } from "@/app/components/Toaster";

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
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [channel, setChannel] = useState<string>("email");
  const [body, setBody] = useState("");

  const current = CHANNELS.find((c) => c.value === channel) || CHANNELS[0];

  // AI helper — uses the same /api/chat endpoint as the customer-facing chatbot.
  // Generates a suggested message body based on a short intent string.
  async function aiDraft() {
    if (!body.trim()) {
      toast.info("Add a quick note about what you want to say first, then AI can expand it.");
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
                "You are a helpful pharmacy assistant. The staff member is composing a message to a customer. Rewrite the draft into a warm, professional, concise message. Preserve any medical specifics. Output ONLY the message body, no preamble.",
            },
            { role: "user", content: body },
          ],
        }),
      });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { reply?: string; content?: string };
      const suggestion = j.reply || j.content || "";
      if (suggestion) {
        setBody(suggestion.trim());
        toast.success("AI drafted a polished version. Review and send.");
      } else {
        toast.error("AI did not return a suggestion.");
      }
    } catch {
      toast.error("AI helper unavailable. Check GROQ_API_KEY.");
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

      {/* Channel picker */}
      <div>
        <label className="label-admin">Channel</label>
        <div className="grid grid-cols-4 gap-1.5">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const isActive = channel === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setChannel(c.value)}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${
                  isActive
                    ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text"
                    : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-muted hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)]"
                }`}
              >
                <input type="radio" name="channel" value={c.value} checked={isActive} onChange={() => setChannel(c.value)} className="sr-only" />
                <Icon className="h-4 w-4" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject — only relevant for email */}
      {current.hasSubject && (
        <div>
          <label className="label-admin">Subject</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="subject" placeholder="Subject line" className="input-admin pl-9" />
          </div>
        </div>
      )}
      {/* Hidden placeholder so server action still gets an empty subject for non-email channels */}
      {!current.hasSubject && (
        <input type="hidden" name="subject" value="" />
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className="label-admin">Message *</label>
          <button
            type="button"
            onClick={aiDraft}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2.5 py-0.5 text-[10px] font-semibold text-white transition hover:brightness-110"
            title="Let AI polish your draft"
          >
            <Wand2 className="h-2.5 w-2.5" /> AI polish
          </button>
        </div>
        <textarea
          name="body"
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
        <p className="mt-1 text-[10px] admin-soft">
          Leave empty to send immediately. Times are in your local timezone. A cron job
          will deliver scheduled messages at the right moment — no manual launch needed.
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

