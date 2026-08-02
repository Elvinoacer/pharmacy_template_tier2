"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Megaphone, FileText, Calendar, AlertCircle, Check, Save } from "lucide-react";

export default function CampaignForm({
  action,
  segments,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  segments: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

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
            <option value="email">📧 Email</option>
            <option value="sms">💬 SMS</option>
            <option value="whatsapp">📱 WhatsApp</option>
            <option value="multi">⚡ Multi-channel</option>
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
        <label className="label-admin">Message body *</label>
        <textarea name="body" required rows={5} placeholder="Hi {{name}}, …" className="input-admin resize-y" />
        <p className="mt-1 text-[10px] admin-soft">Use &#123;&#123;name&#125;&#125; for personalisation.</p>
      </div>

      <div>
        <label className="label-admin">Schedule (optional)</label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="scheduledFor" type="datetime-local" className="input-admin pl-9" />
        </div>
        <p className="mt-1 text-[10px] admin-soft">Leave empty to save as draft.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? (
          <><span className="typing-dot" /> Saving…</>
        ) : (
          <><Save className="h-4 w-4" /> Create campaign</>
        )}
      </button>
    </form>
  );
}
