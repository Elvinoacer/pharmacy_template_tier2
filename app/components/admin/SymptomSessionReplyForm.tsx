"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

export default function SymptomSessionReplyForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [markResolved, setMarkResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/feel/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content, markResolved }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");
      setContent("");
      setOk(markResolved ? "Reply sent and case marked resolved." : "Reply sent to the visitor.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reply failed");
    } finally {
      setBusy(false);
    }
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
          required
        />
      </label>
      <label className="flex items-center gap-2 text-xs admin-text">
        <input
          type="checkbox"
          checked={markResolved}
          onChange={(e) => setMarkResolved(e.target.checked)}
          className="rounded border-teal-700/30"
        />
        Mark case resolved after sending
      </label>
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
      <button
        type="submit"
        disabled={busy || !content.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-teal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send reply
      </button>
    </form>
  );
}
