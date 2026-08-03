"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Megaphone, FileText, Calendar, AlertCircle, Check, Save, Wand2, Zap } from "lucide-react";
import { toast } from "@/app/components/Toaster";

export default function CampaignForm({
  action,
  segments,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  segments: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [body, setBody] = useState("");
  const [sendNow, setSendNow] = useState(false);

  async function aiDraft() {
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a pharmacy marketing assistant. Draft a campaign message body. Use {{name}} as the customer name placeholder. Keep it warm, professional, and concise (3-5 sentences). Markdown is supported. Output only the body.",
            },
            { role: "user", content: body || "Draft a flu season vaccination reminder campaign." },
          ],
        }),
      });
      if (!r.ok) throw new Error();
      const j = (await r.json()) as { reply?: string; content?: string };
      const suggestion = j.reply || j.content || "";
      if (suggestion) {
        setBody(suggestion.trim());
        toast.success("AI drafted a campaign body.");
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
        <label className="label-admin">Campaign name *</label>
        <div className="relative">
          <Megaphone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="name" required placeholder="e.g. Flu season vaccination drive" className="input-admin pl-9" />
        </div>
      </div>

      <div>
        <label className="label-admin">Description</label>
        <input name="description" placeholder="Internal notes about this campaign" className="input-admin" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Channel</label>
          <select name="channel" className="input-admin" defaultValue="email">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="multi">Multi-channel</option>
          </select>
        </div>
        <div>
          <label className="label-admin">Target segment</label>
          <select name="segmentId" className="input-admin" defaultValue="">
            <option value="">All customers</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label-admin">Subject (email only)</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="subject" placeholder="Your flu shot is waiting…" className="input-admin pl-9" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label-admin">Message body *</label>
          <button
            type="button"
            onClick={aiDraft}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2 py-0.5 text-[10px] font-semibold text-white hover:brightness-110"
            title="Let AI draft the body"
          >
            <Wand2 className="h-2.5 w-2.5" /> AI draft
          </button>
        </div>
        <textarea
          name="body"
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Hi {{name}}, ..."
          className="input-admin resize-y font-mono text-xs"
        />
        <p className="mt-1 text-[10px] admin-soft">
          Variables: &#123;&#123;name&#125;&#125;, &#123;&#123;email&#125;&#125;, &#123;&#123;tier&#125;&#125;, &#123;&#123;points&#125;&#125;.
          Markdown supported (headings, **bold**, lists, links). The body is interpolated per-customer
          at send time, so each recipient sees their own name and details.
        </p>
      </div>

      <div>
        <label className="label-admin">When to send *</label>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="scheduleMode"
              value="draft"
              checked={!sendNow}
              onChange={() => setSendNow(false)}
              className="accent-[var(--admin-accent)]"
            />
            <Calendar className="h-3 w-3" /> Save as draft
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="scheduleMode"
              value="schedule"
              checked={false}
              onChange={() => setSendNow(false)}
              className="accent-[var(--admin-accent)]"
              disabled
            />
            <Calendar className="h-3 w-3" /> Schedule
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="scheduleMode"
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
            <input name="scheduledFor" type="datetime-local" className="input-admin pl-9" />
            <p className="mt-1 text-[10px] admin-soft">
              Leave empty to save as draft. When scheduled, the cron job will auto-launch at the right time.
            </p>
          </div>
        )}
        {sendNow && (
          <>
            <input type="hidden" name="sendNow" value="true" />
            <p className="text-[10px] admin-soft">
              Campaign will launch immediately on submit. Each recipient gets a personalized message.
            </p>
          </>
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
          <><Zap className="h-4 w-4" /> Launch campaign now</>
        ) : (
          <><Save className="h-4 w-4" /> Create campaign</>
        )}
      </button>
    </form>
  );
}
