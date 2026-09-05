"use client";

import { useId } from "react";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { BookOpen, FolderTree, Star, FileText, Brain, AlertCircle, Check, Save, Trash2, Pencil, X } from "lucide-react";
import { toast } from "@/app/components/Toaster";

type Article = {
  id: string;
  title: string;
  category: string;
  content: string;
  priority: number;
  isApproved: boolean;
};

export default function KnowledgeForm({
  action,
  articles = [],
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  articles?: Article[];
}) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [editContent, setEditContent] = useState("");
  const [editPriority, setEditPriority] = useState(0);
  const [editApproved, setEditApproved] = useState(true);

  function startEdit(a: Article) {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditCategory(a.category);
    setEditContent(a.content);
    setEditPriority(a.priority);
    setEditApproved(a.isApproved);
    toast.info(`Editing "${a.title}" — update fields and submit.`);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditCategory("general");
    setEditContent("");
    setEditPriority(0);
    setEditApproved(true);
  }

  async function deleteArticle(id: string, title: string) {
    if (!confirm(`Delete article "${title}"?`)) return;
    try {
      const r = await fetch("/api/admin/knowledge/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      toast.success("Article deleted.");
      window.location.reload();
    } catch {
      toast.error("Could not delete article.");
    }
  }

  return (
    <div className="space-y-4">
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

        {editingId && <input type="hidden" name="id" value={editingId} />}

        <div>
          <label htmlFor={`${fieldPrefix}-1`} className="label-admin">Title *</label>
          <div className="relative">
            <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input id={`${fieldPrefix}-1`}
              name="title"
              required
              placeholder="When should I take my antibiotics?"
              className="input-admin pl-9"
              value={editingId ? editTitle : undefined}
              onChange={(e) => editingId && setEditTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldPrefix}-2`} className="label-admin">Category</label>
            <div className="relative">
              <FolderTree className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input id={`${fieldPrefix}-2`}
                name="category"
                defaultValue="general"
                placeholder="general, dosage, side-effects…"
                className="input-admin pl-9"
                value={editingId ? editCategory : undefined}
                onChange={(e) => editingId && setEditCategory(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-3`} className="label-admin">Priority (higher = first)</label>
            <div className="relative">
              <Star className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input id={`${fieldPrefix}-3`}
                name="priority"
                type="number"
                defaultValue={0}
                className="input-admin pl-9"
                value={editingId ? editPriority : undefined}
                onChange={(e) => editingId && setEditPriority(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldPrefix}-4`} className="label-admin">Content *</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 admin-soft" />
            <textarea id={`${fieldPrefix}-4`}
              name="content"
              required
              rows={6}
              placeholder="Approved content the AI assistant may quote…"
              className="input-admin resize-y pl-9"
              value={editingId ? editContent : undefined}
              onChange={(e) => editingId && setEditContent(e.target.value)}
            />
          </div>
          <p className="mt-1 text-xs admin-soft">
            Only approved articles will be used by the AI assistant. Markdown supported.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input
            type="checkbox"
            name="isApproved"
            checked={editingId ? editApproved : undefined}
            defaultChecked={!editingId ? true : undefined}
            onChange={(e) => editingId && setEditApproved(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text focus:ring-[var(--admin-accent)]"
          />
          <Brain className="h-4 w-4" /> Approved for AI use
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="btn-admin flex-1 !rounded-xl py-2.5 disabled:opacity-50"
          >
            {pending ? (
              <><span className="typing-dot" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> {editingId ? "Update article" : "Save article"}</>
            )}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 rounded-xl bg-[var(--admin-inset-2)] px-3 py-2 text-xs font-semibold admin-muted hover:bg-[var(--admin-inset)] hover:text-[var(--admin-text)]"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>
      </form>

      {articles.length > 0 && (
        <div className="border-t border-[var(--admin-border)] pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide admin-soft">Manage articles</p>
          <ul className="space-y-2">
            {articles.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold admin-text">{a.title}</p>
                    {a.isApproved ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <Check className="h-2.5 w-2.5" /> approved
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700">draft</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs admin-muted">
                    <FolderTree className="mr-1 inline h-2.5 w-2.5" /> {a.category}
                    {a.priority > 0 && (
                      <span className="ml-2 inline-flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5" /> p{a.priority}
                      </span>
                    )}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm admin-text/75">{a.content}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    className="rounded-full p-1 admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteArticle(a.id, a.title)}
                    className="rounded-full p-1 admin-soft transition hover:bg-rose-500/10 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
