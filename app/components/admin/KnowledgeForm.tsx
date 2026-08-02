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
        <label className="label-admin">Title *</label>
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="title" required placeholder="When should I take my antibiotics?" className="input-admin pl-9" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Category</label>
          <div className="relative">
            <FolderTree className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="category" defaultValue="general" placeholder="general, dosage, side-effects…" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Priority (higher = first)</label>
          <div className="relative">
            <Star className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="priority" type="number" defaultValue={0} className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Content *</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 admin-soft" />
          <textarea name="content" required rows={6} placeholder="Approved content the AI assistant may quote…" className="input-admin resize-y pl-9" />
        </div>
        <p className="mt-1 text-[10px] admin-soft">
          Only approved articles will be used by the AI assistant.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
        <input
          type="checkbox"
          name="isApproved"
          defaultChecked
          className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text focus:ring-[var(--admin-accent)]"
        />
        <Brain className="h-4 w-4" /> Approved for AI use
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Save article</>}
      </button>
    </form>
  );
}
