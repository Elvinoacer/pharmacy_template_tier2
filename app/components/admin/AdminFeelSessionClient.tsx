"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Activity,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Radio,
  Send,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import { formatDateTime } from "@/app/lib/time";
import { toast } from "@/app/components/Toaster";

export type AdminFeelMessage = {
  id: string;
  role: string;
  content: string;
  imageUrls?: string[];
  createdAt: string;
};

export type AdminFeelCheckIn = {
  id: string;
  feeling: string;
  notes: string | null;
  score: number | null;
  createdAt: string;
};

export type AdminFeelSession = {
  id: string;
  status: string;
  category: string | null;
  chiefComplaint: string | null;
  aiSummary: string | null;
  provisionalLabel: string | null;
  severity: string | null;
  feelingTrend: string | null;
  escalatedAt: string | null;
  escalatedReason: string | null;
  conversationId: string | null;
  guestKey: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  customer: {
    id: string;
    fullName: string | null;
    phone: string | null;
    email?: string | null;
  } | null;
  messages: AdminFeelMessage[];
  checkIns: AdminFeelCheckIn[];
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-teal-500/15 text-teal-800",
  monitoring: "bg-blue-500/15 text-blue-800",
  escalated: "bg-amber-500/15 text-amber-900",
  resolved: "bg-emerald-500/15 text-emerald-800",
  closed: "bg-slate-500/15 text-slate-600",
};

const POLL_MS = 4_000;

function refreshAttention() {
  window.dispatchEvent(new Event("afyvia:attention-refresh"));
}

async function acknowledgeSession(sessionId: string) {
  try {
    await fetch("/api/feel/admin/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    refreshAttention();
  } catch {
    /* best-effort */
  }
}

function roleLabel(role: string) {
  if (role === "assistant") {
    return (
      <span className="inline-flex items-center gap-1">
        <Sparkles className="h-3 w-3" /> AI
      </span>
    );
  }
  if (role === "staff") {
    return (
      <span className="inline-flex items-center gap-1">
        <Stethoscope className="h-3 w-3" /> Staff
      </span>
    );
  }
  if (role === "user") return "Visitor";
  return role;
}

function messageBubbleClass(role: string) {
  if (role === "user") return "border-teal-500/20 bg-teal-500/5";
  if (role === "staff") return "border-amber-500/25 bg-amber-500/10";
  if (role === "system") return "border-dashed admin-border bg-[var(--admin-inset)]";
  return "admin-border bg-[var(--admin-panel)]";
}

export default function AdminFeelSessionClient({
  initial,
}: {
  initial: AdminFeelSession;
}) {
  const [session, setSession] = useState<AdminFeelSession>(initial);
  const [live, setLive] = useState(true);
  const [pollError, setPollError] = useState<string | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [content, setContent] = useState("");
  const [markResolved, setMarkResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set(initial.messages.map((m) => m.id)));
  const stickToBottomRef = useRef(true);
  const lastAckAtRef = useRef(0);
  const lastFingerprintRef = useRef("");
  const customerEmailRef = useRef(initial.customer?.email ?? null);

  const alreadyResolved = session.status === "resolved" || session.status === "closed";

  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = dist < 80;
    if (dist < 80 && newCount > 0) setNewCount(0);
  };

  // Keep email ref in sync when we have it
  useEffect(() => {
    if (session.customer?.email) customerEmailRef.current = session.customer.email;
  }, [session.customer?.email]);

  // Initial ack + attention refresh (server already acked; keep client badge in sync)
  useEffect(() => {
    void acknowledgeSession(initial.id);
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [initial.id]);

  // Live poll for visitor messages / status changes
  useEffect(() => {
    let cancelled = false;
    const sessionId = session.id;

    const applySession = (raw: AdminFeelSession) => {
      const next: AdminFeelSession = {
        ...raw,
        customer: raw.customer
          ? {
              ...raw.customer,
              email: raw.customer.email ?? customerEmailRef.current,
            }
          : null,
      };
      if (next.customer?.email) customerEmailRef.current = next.customer.email;

      const fingerprint = [
        next.messageCount,
        next.lastMessageAt,
        next.status,
        next.feelingTrend,
        next.aiSummary ?? "",
        next.messages.map((m) => m.id).join(","),
        next.checkIns.map((c) => c.id).join(","),
      ].join("|");

      if (fingerprint === lastFingerprintRef.current) {
        setPollError(null);
        return;
      }
      lastFingerprintRef.current = fingerprint;

      const known = knownIdsRef.current;
      const incoming = (next.messages || []).filter((m) => !known.has(m.id));
      for (const m of next.messages || []) known.add(m.id);

      setSession(next);
      setPollError(null);

      const visitorNew = incoming.filter((m) => m.role === "user" || m.role === "system");
      const anyNew = incoming.length > 0;

      if (visitorNew.length > 0) {
        const latest = visitorNew[visitorNew.length - 1];
        const preview =
          latest.content.length > 100
            ? `${latest.content.slice(0, 97)}…`
            : latest.content;
        toast.info(latest.role === "user" ? `Visitor: ${preview}` : preview, {
          durationMs: 8_000,
        });

        // Seen while on this page → clear sidebar badge for this case
        const now = Date.now();
        if (now - lastAckAtRef.current > 1_500) {
          lastAckAtRef.current = now;
          void acknowledgeSession(next.id);
        } else {
          refreshAttention();
        }

        if (stickToBottomRef.current) {
          requestAnimationFrame(() => scrollToBottom(true));
        } else {
          setNewCount((c) => c + visitorNew.length);
        }
      } else if (anyNew && stickToBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(true));
      }
    };

    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const res = await fetch(`/api/feel/session?id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) {
            setLive(false);
            setPollError(res.status === 403 ? "Session access lost" : "Live update failed");
          }
          return;
        }
        const data = await res.json();
        if (cancelled || !data.session) return;
        setLive(true);
        applySession(data.session as AdminFeelSession);
      } catch {
        if (!cancelled) {
          setLive(false);
          setPollError("Offline — retrying…");
        }
      }
    };

    const interval = window.setInterval(poll, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Faster first tick after mount
    const boot = window.setTimeout(poll, 800);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(boot);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session.id, scrollToBottom]);

  async function postReply(opts: { content: string; markResolved: boolean }) {
    setBusy(true);
    setFormError(null);
    setFormOk(null);
    try {
      const res = await fetch("/api/feel/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          content: opts.content,
          markResolved: opts.markResolved,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");

      setContent("");
      setMarkResolved(false);
      setFormOk(
        opts.markResolved
          ? opts.content.trim()
            ? "Reply sent and case marked resolved."
            : "Case marked resolved — badge cleared for new alerts."
          : "Reply sent to the visitor.",
      );

      if (data.session) {
        const next = data.session as AdminFeelSession;
        if (next.customer?.email) customerEmailRef.current = next.customer.email;
        for (const m of next.messages || []) knownIdsRef.current.add(m.id);
        lastFingerprintRef.current = [
          next.messageCount,
          next.lastMessageAt,
          next.status,
          next.feelingTrend,
          next.aiSummary ?? "",
          next.messages.map((m) => m.id).join(","),
          next.checkIns.map((c) => c.id).join(","),
        ].join("|");
        setSession({
          ...next,
          customer: next.customer
            ? {
                ...next.customer,
                email: next.customer.email ?? customerEmailRef.current,
              }
            : null,
        });
        stickToBottomRef.current = true;
        requestAnimationFrame(() => scrollToBottom(true));
      }

      refreshAttention();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Reply failed");
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
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="admin-card space-y-3 p-5 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold admin-text">AI summary for staff</h2>
              <p className="mt-0.5 text-xs admin-muted">Rolling non-diagnostic overview</p>
            </div>
            <LivePill live={live} error={pollError} />
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                STATUS_STYLE[session.status] || STATUS_STYLE.active
              }`}
            >
              {session.status}
            </span>
            {session.severity && (
              <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-0.5 text-xs font-semibold uppercase admin-muted">
                {session.severity}
              </span>
            )}
            {session.category && (
              <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-0.5 text-xs font-semibold uppercase admin-muted">
                {session.category}
              </span>
            )}
            {session.feelingTrend && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2.5 py-0.5 text-xs font-semibold uppercase admin-muted">
                <Activity className="h-3 w-3" />
                felt {session.feelingTrend}
              </span>
            )}
          </div>

          {session.aiSummary ? (
            <p className="leading-relaxed admin-text whitespace-pre-wrap">{session.aiSummary}</p>
          ) : (
            <p className="admin-muted">Summary will appear after a few exchanges.</p>
          )}

          {session.escalatedReason && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
              Escalation: {session.escalatedReason}
              {session.escalatedAt ? ` · ${formatDateTime(session.escalatedAt)}` : ""}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs admin-muted">
            {session.conversationId && (
              <Link href="/admin/messages" className="font-semibold admin-accent-text hover:underline">
                CRM conversation
              </Link>
            )}
            <span className="rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-xs font-semibold uppercase admin-soft">
              How do you feel · not a contact enquiry
            </span>
          </div>
        </section>

        <section className="admin-card space-y-2 p-5 text-sm">
          <h2 className="text-sm font-semibold admin-text">Visitor</h2>
          <p className="text-xs admin-muted">Who started this check-in</p>
          <p className="flex items-center gap-2 font-semibold admin-text">
            <User className="h-4 w-4 admin-accent-text" />
            {session.customer?.fullName || "Guest visitor"}
          </p>
          {session.customer?.email && (
            <p className="text-xs admin-muted">{session.customer.email}</p>
          )}
          {session.customer?.phone && (
            <p className="text-xs admin-muted">{session.customer.phone}</p>
          )}
          {session.customer?.id && (
            <Link
              href={`/admin/customers/${session.customer.id}`}
              className="text-xs font-semibold admin-accent-text hover:underline"
            >
              Open customer profile →
            </Link>
          )}
          {session.guestKey && (
            <p className="text-xs admin-soft">Guest key: {session.guestKey.slice(0, 18)}…</p>
          )}
          {session.checkIns.length > 0 && (
            <div className="mt-3 border-t admin-border pt-3">
              <p className="text-xs font-bold uppercase tracking-wider admin-muted">
                Feeling trend
              </p>
              <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                {session.checkIns.map((c) => (
                  <li key={c.id} className="text-xs admin-text">
                    <span className="font-semibold capitalize">{c.feeling}</span>
                    {c.score != null ? ` (${c.score}/10)` : ""} · {formatDateTime(c.createdAt)}
                    {c.notes ? ` — ${c.notes}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Live conversation panel */}
      <section className="admin-card flex h-[min(68vh,calc(100dvh-12rem))] min-h-[440px] flex-col overflow-hidden p-0">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b admin-border px-5 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold admin-text">Live conversation</h2>
            <p className="mt-0.5 text-xs admin-muted">
              New visitor messages appear here automatically — no browser refresh.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LivePill live={live} error={pollError} compact />
            <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-xs font-semibold uppercase admin-muted">
              {session.messages.length} messages
            </span>
            {session.lastMessageAt && (
              <span className="hidden text-xs admin-soft sm:inline">
                Last {formatDateTime(session.lastMessageAt)}
              </span>
            )}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="relative flex min-h-0 flex-col">
            <ul
              ref={listRef}
              onScroll={onScroll}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4"
              role="log"
              aria-live="polite"
            >
              {session.messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${messageBubbleClass(m.role)}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider admin-muted">
                      {roleLabel(m.role)}
                    </span>
                    <span className="text-xs admin-soft">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed admin-text">{m.content}</p>
                  {m.imageUrls && m.imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.imageUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block overflow-hidden rounded-lg border admin-border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Attachment" className="h-28 w-28 object-cover" />
                          <span className="absolute bottom-1 right-1 rounded bg-black/50 p-0.5 text-white">
                            <ImageIcon className="h-3 w-3" />
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {newCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setNewCount(0);
                  stickToBottomRef.current = true;
                  scrollToBottom(true);
                }}
                className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
              >
                {newCount} new message{newCount === 1 ? "" : "s"} ↓
              </button>
            )}
          </div>

          <div className="flex min-h-0 flex-col border-t admin-border lg:border-l lg:border-t-0">
            <div className="shrink-0 border-b admin-border px-5 py-3">
              <h3 className="text-sm font-semibold admin-text">Staff reply</h3>
              <p className="mt-0.5 text-xs admin-muted">
                Visitor sees this in their check-in thread instantly
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <form onSubmit={onSubmit} className="space-y-3">
                <label className="block text-xs font-semibold admin-muted">
                  Reply as pharmacist / staff
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="input-admin mt-1.5 w-full"
                    placeholder="Write clear, careful guidance…"
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
                    This case is already {session.status}. New visitor messages still appear live
                    and raise a fresh sidebar alert if you leave this page.
                  </p>
                )}
                {formError && (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700">
                    {formError}
                  </p>
                )}
                {formOk && (
                  <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {formOk}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={busy || !content.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-teal-600 to-teal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
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
                  While this thread is open, new visitor messages are marked seen and the sidebar
                  badge stays clear for this case. Mark resolved when finished so only brand-new
                  alerts take badge space.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LivePill({
  live,
  error,
  compact,
}: {
  live: boolean;
  error: string | null;
  compact?: boolean;
}) {
  if (error) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold uppercase text-amber-900 ${
          compact ? "" : ""
        }`}
        title={error}
      >
        <Radio className="h-3 w-3" />
        {compact ? "Retrying" : error}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold uppercase text-emerald-800">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {live ? "Live" : "Connecting"}
    </span>
  );
}
