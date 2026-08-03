"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { FileText, FolderTree, Type, AlertCircle, Check, Save, Wand2, Trash2, Pencil, X } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { callAiDraft } from "@/app/lib/ai-form-helper";

type ExistingTemplate = {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  category: string;
};

export default function TemplateForm({
  action,
  templates = [],
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  templates?: ExistingTemplate[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [body, setBody] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editChannel, setEditChannel] = useState("email");
  const [editCategory, setEditCategory] = useState("general");
  const [editSubject, setEditSubject] = useState("");

  async function aiDraft() {
    setAiLoading(true);
    try {
      await callAiDraft({
        systemPrompt:
          "You are a pharmacy communication assistant. Draft a reusable message template body for the staff. Use {{name}} as the customer name placeholder. Keep it warm, professional, and concise (2-4 sentences). Output only the body text.",
        userPrompt: body || "Draft a refill-ready-for-pickup template.",
        onResult: setBody,
        successMessage: "AI drafted a template body.",
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      const r = await fetch("/api/admin/templates/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      toast.success("Template deleted.");
      window.location.reload();
    } catch {
      toast.error("Could not delete template.");
    }
  }

  function startEdit(t: ExistingTemplate) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditChannel(t.channel);
    setEditCategory(t.category);
    setEditSubject(t.subject || "");
    setBody(t.body);
    toast.info(`Editing "${t.name}" — update fields and submit.`);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditChannel("email");
    setEditCategory("general");
    setEditSubject("");
    setBody("");
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
          <label className="label-admin">Template name *</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="name"
              required
              value={editingId ? editName : undefined}
              onChange={(e) => editingId && setEditName(e.target.value)}
              placeholder="e.g. Refill ready for pickup"
              className="input-admin pl-9"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Channel</label>
            <select
              name="channel"
              className="input-admin"
              defaultValue="email"
              value={editingId ? editChannel : undefined}
              onChange={(e) => editingId && setEditChannel(e.target.value)}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="portal">Portal</option>
            </select>
          </div>
          <div>
            <label className="label-admin">Category</label>
            <div className="relative">
              <FolderTree className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="category"
                defaultValue="general"
                value={editingId ? editCategory : undefined}
                onChange={(e) => editingId && setEditCategory(e.target.value)}
                className="input-admin pl-9"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label-admin">Subject (email only)</label>
          <div className="relative">
            <Type className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="subject"
              placeholder="Your prescription is ready…"
              value={editingId ? editSubject : undefined}
              onChange={(e) => editingId && setEditSubject(e.target.value)}
              className="input-admin pl-9"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label-admin">Body *</label>
            <button
              type="button"
              onClick={aiDraft}
              disabled={aiLoading}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2 py-0.5 text-[10px] font-semibold text-white hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
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
            placeholder="Hi {{name}}, your prescription {{medicine}} is ready for pickup at {{branch}}."
            className="input-admin resize-y"
          />
          <p className="mt-1 text-[10px] admin-soft">
            Variables: &#123;&#123;name&#125;&#125;, &#123;&#123;medicine&#125;&#125;, &#123;&#123;branch&#125;&#125;, &#123;&#123;refillId&#125;&#125;,
            &#123;&#123;points&#125;&#125;, &#123;&#123;tier&#125;&#125;. Markdown supported.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="btn-admin flex-1 !rounded-xl py-2.5 disabled:opacity-50"
          >
            {pending ? (
              <><span className="typing-dot" /> Saving…</>
            ) : (
              <><Save className="h-4 w-4" /> {editingId ? "Update template" : "Save template"}</>
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

      {/* Template library with edit/delete */}
      {templates.length > 0 && (
        <div className="border-t border-[var(--admin-border)] pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide admin-soft">Manage templates</p>
          <ul className="space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold admin-text">{t.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] admin-muted">
                    <span className="capitalize">{t.channel}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <FolderTree className="h-2.5 w-2.5" /> {t.category}
                    </span>
                  </div>
                  {t.subject && <p className="mt-1 text-sm font-medium admin-text">{t.subject}</p>}
                  <p className="mt-1 line-clamp-2 text-xs admin-muted">{t.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="rounded-full p-1 admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(t.id, t.name)}
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
