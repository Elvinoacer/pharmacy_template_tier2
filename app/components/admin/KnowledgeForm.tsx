"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { BookOpen, FolderTree, Star, FileText, Brain, AlertCircle, Check, Save } from "lucide-react";

export default function KnowledgeForm({
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
        <label className="label-admin">Title *</label>
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="title" required placeholder="When should I take my antibiotics?" className="input-admin pl-9" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Category</label>
          <div className="relative">
            <FolderTree className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
            <input name="category" defaultValue="general" placeholder="general, dosage, side-effects…" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Priority (higher = first)</label>
          <div className="relative">
            <Star className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
            <input name="priority" type="number" defaultValue={0} className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Content *</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-[#ecfdf5]/30" />
          <textarea name="content" required rows={6} placeholder="Approved content the AI assistant may quote…" className="input-admin resize-y pl-9" />
        </div>
        <p className="mt-1 text-[10px] text-[#ecfdf5]/45">
          Only approved articles will be used by the AI assistant.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#ecfdf5]/70 hover:text-white">
        <input
          type="checkbox"
          name="isApproved"
          defaultChecked
          className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-[#2dd4bf] focus:ring-[#2dd4bf]"
        />
        <Brain className="h-4 w-4" /> Approved for AI use
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-4 py-2.5 text-sm font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Save article</>}
      </button>
    </form>
  );
}
