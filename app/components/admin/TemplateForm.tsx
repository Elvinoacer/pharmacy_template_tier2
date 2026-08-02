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
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      <div>
        <label className="label-admin">Template name *</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="name" required placeholder="e.g. Refill ready for pickup" className="input-admin pl-9" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Channel</label>
          <select name="channel" className="input-admin" defaultValue="email">
            <option value="email" className="bg-[#122620]">📧 Email</option>
            <option value="sms" className="bg-[#122620]">💬 SMS</option>
            <option value="whatsapp" className="bg-[#122620]">📱 WhatsApp</option>
          </select>
        </div>
        <div>
          <label className="label-admin">Category</label>
          <div className="relative">
            <FolderTree className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
            <input name="category" defaultValue="general" className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Subject (email only)</label>
        <div className="relative">
          <Type className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
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
        <p className="mt-1 text-[10px] text-[#ecfdf5]/45">
          Variables: &#123;&#123;name&#125;&#125;, &#123;&#123;medicine&#125;&#125;, &#123;&#123;branch&#125;&#125;, &#123;&#123;refillId&#125;&#125;
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-4 py-2.5 text-sm font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Save template</>}
      </button>
    </form>
  );
}
