"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import { Megaphone, FileText, Calendar, AlertCircle, Check, Save, Wand2, Zap } from "lucide-react";
import { callAiDraft } from "@/app/lib/ai-form-helper";

type ScheduleMode = "draft" | "schedule" | "now";

export default function CampaignForm({
  action,
  segments,
  premiumActive,
  freeLaunchesRemaining,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  segments: { id: string; name: string; isSystem: boolean }[];
  premiumActive: boolean;
  freeLaunchesRemaining: number | null;
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
    if (state?.error) toast.error(state.error);
    if (!state?.success) return;

    toast.success(state.success);
    const frame = requestAnimationFrame(() => {
      setBody("");
      setName("");
      setDescription("");
      setSubject("");
      setScheduledFor("");
      setMode("draft");
      formRef.current?.reset();
    });
    return () => cancelAnimationFrame(frame);
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
    <form ref={formRef} action={formAction} className="space-y-5">
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
        <label htmlFor={`${fieldPrefix}-name`} className="label-admin">Campaign name *</label>
        <div className="relative">
          <Megaphone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            id={`${fieldPrefix}-name`}
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Flu season vaccination drive"
            className="input-admin pl-9"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-description`} className="label-admin">Description</label>
        <input
          id={`${fieldPrefix}-description`}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Internal notes about this campaign"
          className="input-admin"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${fieldPrefix}-channel`} className="label-admin">Channel</label>
          <select id={`${fieldPrefix}-channel`} name="channel" className="input-admin" defaultValue="email">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="multi" disabled={!premiumActive}>
              Multi-channel{premiumActive ? "" : " — Premium"}
            </option>
          </select>
        </div>
        <div>
          <label htmlFor={`${fieldPrefix}-segment`} className="label-admin">Target segment</label>
          <select id={`${fieldPrefix}-segment`} name="segmentId" className="input-admin" defaultValue="">
            <option value="">All customers</option>
            {segments.map((segment) => (
              <option
                key={segment.id}
                value={segment.id}
                disabled={!premiumActive && !segment.isSystem}
              >
                {segment.name}{!premiumActive && !segment.isSystem ? " — Premium" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-subject`} className="label-admin">Subject (email only)</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            id={`${fieldPrefix}-subject`}
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Your flu shot is waiting…"
            className="input-admin pl-9"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`${fieldPrefix}-body`} className="label-admin !mb-0">Message body *</label>
          <button
            type="button"
            onClick={aiDraft}
            disabled={aiLoading}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-[filter,box-shadow] hover:brightness-110 hover:shadow disabled:cursor-wait disabled:opacity-60"
            title="Let AI draft the body"
          >
            <Wand2 className={`h-3 w-3 ${aiLoading ? "animate-pulse" : ""}`} /> {aiLoading ? "Drafting…" : "AI draft"}
          </button>
        </div>
        <textarea
          id={`${fieldPrefix}-body`}
          name="body"
          required
          rows={6}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Hi {{name}}, ..."
          className="input-admin resize-y font-mono text-xs leading-5"
        />
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Insert personalization variable">
          {["{{name}}", "{{email}}", "{{tier}}", "{{points}}"].map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => setBody((current) => current + (current && !current.endsWith(" ") ? " " : "") + variable)}
              className="min-h-9 rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset-2)] px-2.5 py-1 text-xs font-mono admin-accent-text transition hover:bg-[var(--admin-hover)]"
            >
              {variable}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="label-admin">When to send *</legend>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <label className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${mode === "draft" ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text" : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-text hover:border-[var(--admin-border-2)]"}`}>
            <input type="radio" name="scheduleMode" value="draft" checked={mode === "draft"} onChange={() => setMode("draft")} className="accent-[var(--admin-accent)]" />
            <Calendar className="h-3.5 w-3.5 shrink-0" /> Save as draft
          </label>
          <label className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
            !premiumActive
              ? "cursor-not-allowed border-[var(--admin-border)] bg-[var(--admin-inset)] opacity-60 admin-muted"
              : mode === "schedule"
                ? "cursor-pointer border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text"
                : "cursor-pointer border-[var(--admin-border)] bg-[var(--admin-inset)] admin-text hover:border-[var(--admin-border-2)]"
          }`}>
            <input
              type="radio"
              name="scheduleMode"
              value="schedule"
              checked={mode === "schedule"}
              onChange={() => setMode("schedule")}
              disabled={!premiumActive}
              className="accent-[var(--admin-accent)]"
            />
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Schedule{premiumActive ? "" : " · Premium"}
          </label>
          <label className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${mode === "now" ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text" : "border-[var(--admin-border)] bg-[var(--admin-inset)] admin-text hover:border-[var(--admin-border-2)]"}`}>
            <input type="radio" name="scheduleMode" value="now" checked={mode === "now"} onChange={() => setMode("now")} className="accent-[var(--admin-accent)]" />
            <Zap className="h-3.5 w-3.5 shrink-0" /> Send immediately
          </label>
        </div>
        {mode === "schedule" && (
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-[22px] h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="scheduledFor"
              type="datetime-local"
              required
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="input-admin pl-9"
            />
            <p className="mt-1.5 text-xs leading-5 admin-soft">Cron will auto-launch this campaign at the scheduled local time.</p>
          </div>
        )}
        {mode === "now" && (
          <>
            <input type="hidden" name="sendNow" value="true" />
            <p className="text-xs leading-5 admin-soft">
              {freeLaunchesRemaining === 0
                ? "Your Free monthly campaign launch has been used. Save this as a draft or upgrade for unlimited launches."
                : premiumActive
                  ? "Campaign will launch immediately on submit. Each recipient gets a personalized message."
                  : `Campaign will launch immediately. Free includes ${freeLaunchesRemaining ?? 1} launch remaining this month.`}
            </p>
          </>
        )}
        {mode === "draft" && (
          <p className="text-xs leading-5 admin-soft">
            Saved as draft — launch later from the campaigns list.
            {!premiumActive ? " Scheduling, custom segments and multi-channel delivery unlock on Premium." : ""}
          </p>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={pending || (mode === "now" && freeLaunchesRemaining === 0)}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
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
