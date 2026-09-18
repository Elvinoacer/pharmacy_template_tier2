"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

export default function SymptomSessionReplyForm({
  sessionId,
  status,
}: {
  sessionId: string;
  status?: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [markResolved, setMarkResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const alreadyResolved = status === "resolved" || status === "closed";

  function refreshAttention() {
    window.dispatchEvent(new Event("afyvia:attention-refresh"));
  }

  async function postReply(opts: { content: string; markResolved: boolean }) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/feel/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          content: opts.content,
          markResolved: opts.markResolved,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");
      setContent("");
      setMarkResolved(false);
      setOk(
        opts.markResolved
          ? opts.content.trim()
            ? "Reply sent and case marked resolved."
            : "Case marked resolved — badge cleared for new alerts."
          : "Reply sent to the visitor.",
      );
      refreshAttention();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    await postReply({ content, markResolved });
  }

  async function onResolveOnly() {
    if (busy || alreadyResolved) return;
    await postReply({ content: content.trim(), markResolved: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-xs font-semibold admin-muted">
        Reply as pharmacist / staff
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="input-admin mt-1.5 w-full"
          placeholder="Write clear, careful guidance. This appears in the visitor's check-in thread."
          required={!markResolved}
        />
      </label>
      <label className="flex items-center gap-2 text-xs admin-text">
        <input
          type="checkbox"
          checked={markResolved}
          onChange={(e) => setMarkResolved(e.target.checked)}
          disabled={alreadyResolved}
          className="rounded border-teal-700/30"
        />
        Mark case resolved after sending
      </label>
      {alreadyResolved && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800">
          This case is already {status}. New visitor messages will raise a fresh alert.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {ok}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || !content.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-teal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send reply
        </button>
        {!alreadyResolved && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onResolveOnly()}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-500/15 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {content.trim() ? "Send & resolve" : "Mark resolved"}
          </button>
        )}
      </div>
      <p className="text-xs leading-relaxed admin-muted">
        Opening this thread clears the urgent sidebar badge. Mark resolved when you are done so
        only new escalations and “feeling worse” alerts take badge space.
      </p>
    </form>
  );
}
