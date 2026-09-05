"use client";

import { useId } from "react";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import { Megaphone, FileText, Calendar, AlertCircle, Check, Save, Wand2, Zap } from "lucide-react";
import { callAiDraft } from "@/app/lib/ai-form-helper";

type ScheduleMode = "draft" | "schedule" | "now";

export default function CampaignForm({
  action,
  segments,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  segments: { id: string; name: string }[];
}) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [mode, setMode] = useState<ScheduleMode>("draft");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setBody("");
      setName("");
      setDescription("");
      setSubject("");
      setScheduledFor("");
      setMode("draft");
      formRef.current?.reset();
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  async function aiDraft() {
    setAiLoading(true);
    try {
      await callAiDraft({
        systemPrompt:
          "You are a pharmacy marketing assistant. Draft a campaign message body. Use {{name}} as the customer name placeholder. Keep it warm, professional, and concise (3-5 sentences). Markdown is supported. Output only the body.",
        userPrompt: body || "Draft a flu season vaccination reminder campaign.",
        onResult: setBody,
        successMessage: "AI drafted a campaign body.",
      });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
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
        <label htmlFor={`${fieldPrefix}-1`} className="label-admin">Campaign name *</label>
        <div className="relative">
          <Megaphone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input id={`${fieldPrefix}-1`}
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Flu season vaccination drive"
            className="input-admin pl-9"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-2`} className="label-admin">Description</label>
        <input id={`${fieldPrefix}-2`}
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Internal notes about this campaign"
          className="input-admin"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fieldPrefix}-3`} className="label-admin">Channel</label>
          <select id={`${fieldPrefix}-3`} name="channel" className="input-admin" defaultValue="email">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="multi">Multi-channel</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${fieldPrefix}-4`} className="label-admin">Target segment</label>
          <select id={`${fieldPrefix}-4`} name="segmentId" className="input-admin" defaultValue="">
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
        <label htmlFor={`${fieldPrefix}-5`} className="label-admin">Subject (email only)</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input id={`${fieldPrefix}-5`}
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your flu shot is waiting…"
            className="input-admin pl-9"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label-admin">Message body *</label>
          <button
            type="button"
            onClick={aiDraft}
            disabled={aiLoading}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2 py-0.5 text-xs font-semibold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            title="Let AI draft the body"
          >
            <Wand2 className={`h-2.5 w-2.5 ${aiLoading ? "animate-pulse" : ""}`} /> {aiLoading ? "Drafting…" : "AI draft"}
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
        <div className="mt-1.5 flex flex-wrap gap-1">
          {["{{name}}", "{{email}}", "{{tier}}", "{{points}}"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setBody((b) => b + (b && !b.endsWith(" ") ? " " : "") + v)}
              className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-xs font-mono admin-accent-text hover:bg-[var(--admin-hover)]"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label-admin">When to send *</label>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="scheduleMode"
              value="draft"
              checked={mode === "draft"}
              onChange={() => setMode("draft")}
              className="accent-[var(--admin-accent)]"
            />
            <Calendar className="h-3 w-3" /> Save as draft
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="scheduleMode"
              value="schedule"
              checked={mode === "schedule"}
              onChange={() => setMode("schedule")}
              className="accent-[var(--admin-accent)]"
            />
            <Calendar className="h-3 w-3" /> Schedule
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="scheduleMode"
              value="now"
              checked={mode === "now"}
              onChange={() => setMode("now")}
              className="accent-[var(--admin-accent)]"
            />
            <Zap className="h-3 w-3" /> Send immediately
          </label>
        </div>
        {mode === "schedule" && (
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="scheduledFor"
              type="datetime-local"
              required
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="input-admin pl-9"
            />
            <p className="mt-1 text-xs admin-soft">
              Cron will auto-launch this campaign at the scheduled local time.
            </p>
          </div>
        )}
        {mode === "now" && (
          <>
            <input type="hidden" name="sendNow" value="true" />
            <p className="text-xs admin-soft">
              Campaign will launch immediately on submit. Each recipient gets a personalized message.
            </p>
          </>
        )}
        {mode === "draft" && (
          <p className="text-xs admin-soft">
            Saved as draft — launch later from the campaigns list.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? (
          <><span className="typing-dot" /> Saving…</>
        ) : mode === "now" ? (
          <><Zap className="h-4 w-4" /> Launch campaign now</>
        ) : mode === "schedule" ? (
          <><Calendar className="h-4 w-4" /> Schedule campaign</>
        ) : (
          <><Save className="h-4 w-4" /> Create campaign</>
        )}
      </button>
    </form>
  );
}
