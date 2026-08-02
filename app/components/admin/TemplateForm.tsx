"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { FileText, FolderTree, Type, AlertCircle, Check, Save } from "lucide-react";

export default function TemplateForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
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
        <label className="label-admin">Template name *</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="name" required placeholder="e.g. Refill ready for pickup" className="input-admin pl-9" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Channel</label>
          <select name="channel" className="input-admin" defaultValue="email">
            <option value="email">📧 Email</option>
            <option value="sms">💬 SMS</option>
            <option value="whatsapp">📱 WhatsApp</option>
          </select>
        </div>
        <div>
          <label className="label-admin">Category</label>
          <div className="relative">
            <FolderTree className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="category" defaultValue="general" className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Subject (email only)</label>
        <div className="relative">
          <Type className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="subject" placeholder="Your prescription is ready…" className="input-admin pl-9" />
        </div>
      </div>

      <div>
        <label className="label-admin">Body *</label>
        <textarea
          name="body"
          required
          rows={5}
          placeholder="Hi &#123;&#123;name&#125;&#125;, your prescription &#123;&#123;medicine&#125;&#125; is ready for pickup at &#123;&#123;branch&#125;&#125;."
          className="input-admin resize-y"
        />
        <p className="mt-1 text-[10px] admin-soft">
          Variables: &#123;&#123;name&#125;&#125;, &#123;&#123;medicine&#125;&#125;, &#123;&#123;branch&#125;&#125;, &#123;&#123;refillId&#125;&#125;
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Save template</>}
      </button>
    </form>
  );
}
