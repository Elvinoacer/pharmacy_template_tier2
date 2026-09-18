"use client";

import Link from "next/link";
import { useTenantHref } from "../TenantLink";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";

const GUEST_KEY_STORAGE = "afyvia-feel-guest-key";
const SESSION_IDS_STORAGE = "afyvia-feel-session-ids";

type Category = {
  id: string;
  label: string;
  description: string;
  starter: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  imageUrls?: string[];
  createdAt: string;
};

type CheckIn = {
  id: string;
  feeling: string;
  notes: string | null;
  score: number | null;
  createdAt: string;
};

type Session = {
  id: string;
  guestKey: string | null;
  status: string;
  category: string | null;
  chiefComplaint: string | null;
  aiSummary: string | null;
  provisionalLabel: string | null;
  severity: string | null;
  feelingTrend: string | null;
  escalatedAt: string | null;
  nextCheckInAt: string | null;
  messageCount?: number;
  lastMessageAt?: string | null;
  messages: Message[];
  checkIns: CheckIn[];
};

type SessionListItem = {
  id: string;
  status: string;
  category: string | null;
  chiefComplaint: string | null;
  provisionalLabel: string | null;
  feelingTrend: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  messageCount: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureGuestKey(): string {
  try {
    let key = localStorage.getItem(GUEST_KEY_STORAGE);
    if (!key) {
      key = `guest_${uid()}`;
      localStorage.setItem(GUEST_KEY_STORAGE, key);
    }
    return key;
  } catch {
    return `guest_${uid()}`;
  }
}

function rememberSessionId(id: string) {
  try {
    const raw = localStorage.getItem(SESSION_IDS_STORAGE);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [id, ...list.filter((x) => x !== id)].slice(0, 20);
    localStorage.setItem(SESSION_IDS_STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function renderMarkdownLite(text: string) {
  // Very light bold + line breaks for assistant copy
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[#0c1a14]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const STATUS_LABEL: Record<string, string> = {
  active: "In progress",
  monitoring: "Monitoring",
  escalated: "With pharmacist",
  resolved: "Resolved",
  closed: "Closed",
};

export default function HowDoYouFeelClient({
  mode = "public",
}: {
  mode?: "public" | "portal";
}) {
  const contactHref = useTenantHref("/contact");
  const listId = useId();
  const [guestKey, setGuestKey] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [pastSessions, setPastSessions] = useState<SessionListItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollBottom();
  }, [session?.messages, busy, scrollBottom]);

  useEffect(() => {
    const key = ensureGuestKey();
    setGuestKey(key);

    async function boot() {
      try {
        const qs = mode === "portal" ? "" : `?guestKey=${encodeURIComponent(key)}`;
        const res = await fetch(`/api/feel/session${qs}`);
        const data = await res.json();
        setCategories(data.categories || []);
        setPastSessions(data.sessions || []);

        // Resume most recent active/monitoring session from local list
        const resume = (data.sessions as SessionListItem[] | undefined)?.find(
          (s) => s.status === "active" || s.status === "monitoring" || s.status === "escalated",
        );
        if (resume) {
          const detailRes = await fetch(
            `/api/feel/session?id=${resume.id}&guestKey=${encodeURIComponent(key)}`,
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            if (detail.session) {
              setSession(detail.session);
              rememberSessionId(detail.session.id);
            }
          }
        }
      } catch {
        setError("Could not load check-in. Please refresh.");
      } finally {
        setBooting(false);
      }
    }
    void boot();
  }, [mode]);

  // Nudge check-in when nextCheckInAt has passed
  useEffect(() => {
    if (!session?.nextCheckInAt) return;
    if (session.status === "escalated" || session.status === "resolved" || session.status === "closed") {
      return;
    }
    const due = new Date(session.nextCheckInAt).getTime() <= Date.now();
    if (due && session.checkIns.length === 0 && session.messages.length >= 3) {
      setShowCheckIn(true);
    }
  }, [session]);

  // Live-poll open sessions so pharmacist replies appear without a full page reload.
  // Works for guests and customers who have not enabled push — toast + thread update.
  useEffect(() => {
    if (!session?.id || !guestKey) return;
    if (session.status === "closed") return;

    let cancelled = false;
    const knownIds = new Set(session.messages.map((m) => m.id));

    const poll = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (busy) return;
      try {
        const res = await fetch(
          `/api/feel/session?id=${session.id}&guestKey=${encodeURIComponent(guestKey)}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const next = data.session as Session | undefined;
        if (!next) return;

        const newStaff = (next.messages || []).filter(
          (m) => m.role === "staff" && !knownIds.has(m.id),
        );
        for (const m of next.messages || []) knownIds.add(m.id);

        if (newStaff.length > 0) {
          const { toast } = await import("@/app/components/Toaster");
          const latest = newStaff[newStaff.length - 1];
          toast.info(
            latest.content.length > 120
              ? `Pharmacist: ${latest.content.slice(0, 117)}…`
              : `Pharmacist: ${latest.content}`,
            {
              href: mode === "portal" ? "/portal/feel" : "/how-do-you-feel",
              durationMs: 12_000,
            },
          );
          window.dispatchEvent(new Event("afyvia:attention-refresh"));
        }

        // Only replace local state when something actually changed (avoids scroll thrash).
        const lastLocal = session.messages[session.messages.length - 1]?.id;
        const lastRemote = next.messages[next.messages.length - 1]?.id;
        const changed =
          next.messageCount !== session.messageCount ||
          next.status !== session.status ||
          next.messages.length !== session.messages.length ||
          next.lastMessageAt !== session.lastMessageAt ||
          lastLocal !== lastRemote ||
          newStaff.length > 0;
        if (changed) {
          setSession(next);
        }
      } catch {
        /* best-effort */
      }
    };

    const interval = window.setInterval(poll, 12_000);
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // Intentionally depend on session id/status/messageCount, not full messages array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status, session?.messageCount, guestKey, busy, mode]);

  async function startSession(categoryId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feel/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestKey, category: categoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start");
      setSession(data.session);
      rememberSessionId(data.session.id);
      setShowCheckIn(false);
      setPendingImages([]);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start session");
    } finally {
      setBusy(false);
    }
  }

  async function openSession(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/feel/session?id=${id}&guestKey=${encodeURIComponent(guestKey)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setSession(data.session);
      rememberSessionId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open session");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!session) return;
    const list = Array.from(files).slice(0, 4 - pendingImages.length);
    if (!list.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of list) {
        const body = new FormData();
        body.append("file", file);
        body.append("sessionId", session.id);
        body.append("guestKey", guestKey);
        const res = await fetch("/api/feel/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Upload failed");
        urls.push(data.url);
      }
      setPendingImages((prev) => [...prev, ...urls].slice(0, 4));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function sendMessage(opts?: { forceEscalate?: boolean; text?: string }) {
    if (!session || busy) return;
    const text = (opts?.text ?? input).trim();
    if (!text && pendingImages.length === 0 && !opts?.forceEscalate) return;

    setBusy(true);
    setError(null);
    const images = [...pendingImages];
    setInput("");
    setPendingImages([]);

    // Optimistic user bubble
    const tempId = `temp-${uid()}`;
    setSession((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: tempId,
                role: "user",
                content: text || (opts?.forceEscalate ? "I'd like to speak with a pharmacist." : "(shared image)"),
                imageUrls: images,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : prev,
    );

    try {
      const res = await fetch("/api/feel/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          guestKey,
          content: text || (opts?.forceEscalate ? "I'd like pharmacist feedback please." : ""),
          imageUrls: images,
          forceEscalate: opts?.forceEscalate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      if (data.session) setSession(data.session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
      // keep typed text so user can retry
      setInput(text);
      setPendingImages(images);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function escalate() {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feel/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          guestKey,
          reason: "user_requested_pharmacist",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not connect to pharmacist");
      if (data.session) setSession(data.session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Escalation failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitCheckIn(feeling: "better" | "same" | "worse") {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feel/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, guestKey, feeling }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      if (data.session) setSession(data.session);
      setShowCheckIn(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage();
  }

  if (booting) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-white/70 bg-white/90 p-10 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
      </div>
    );
  }

  // ── Category picker ──────────────────────────────────────────
  if (!session) {
    return (
      <div className="space-y-8">
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 sm:p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">Not a medical diagnosis</p>
              <p className="mt-1 text-amber-900/90">
                This guided check-in helps with everyday mild symptoms and prepares a clear summary
                for our pharmacists if you need human advice. For emergencies, call local emergency
                services immediately.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2
            className="text-xl font-semibold text-[#0c1a14] sm:text-2xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            How do you feel?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#5a6b62] sm:text-base">
            Pick what matches best. Our AI will ask structured questions — you can upload a photo
            (rash, label, etc.) and check in later if symptoms change. Guests are saved on this
            device; signed-in customers keep history in their account.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => void startSession(c.id)}
              className="group rounded-2xl border border-teal-900/10 bg-white/95 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-700/30 hover:shadow-md disabled:opacity-60"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-900 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="font-semibold text-[#0c1a14] group-hover:text-teal-900">{c.label}</p>
              <p className="mt-1 text-sm text-[#5a6b62]">{c.description}</p>
            </button>
          ))}
        </div>

        {pastSessions.length > 0 && (
          <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-teal-800">
              <Clock className="h-4 w-4" />
              Recent check-ins
            </h3>
            <ul className="mt-4 space-y-2">
              {pastSessions.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => void openSession(s.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-teal-900/5 bg-[#f7faf8] px-4 py-3 text-left text-sm transition hover:border-teal-700/20 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#0c1a14]">
                        {s.provisionalLabel || s.chiefComplaint || s.category || "Check-in"}
                      </p>
                      <p className="text-xs text-[#5a6b62]">
                        {STATUS_LABEL[s.status] || s.status}
                        {s.feelingTrend ? ` · last felt ${s.feelingTrend}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-teal-800">Open →</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── Active conversation ──────────────────────────────────────
  const escalated = session.status === "escalated";
  const canChat = session.status !== "closed";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      {/* Fixed viewport height so long threads scroll inside the chat, not the page */}
      <div className="flex h-[min(70vh,calc(100dvh-11rem))] max-h-[760px] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-sm">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-teal-900/5 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
              How do you feel
            </p>
            <p className="truncate text-sm font-semibold text-[#0c1a14]">
              {session.provisionalLabel || session.chiefComplaint || "Symptom check-in"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                escalated
                  ? "bg-amber-100 text-amber-900"
                  : session.status === "resolved"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-teal-100 text-teal-900"
              }`}
            >
              {STATUS_LABEL[session.status] || session.status}
            </span>
            <button
              type="button"
              onClick={() => {
                setSession(null);
                setError(null);
              }}
              className="rounded-full border border-teal-900/10 px-3 py-1 text-[11px] font-semibold text-[#5a6b62] hover:bg-teal-50"
            >
              New check-in
            </button>
          </div>
        </div>

        {escalated && (
          <div className="flex shrink-0 gap-2 border-b border-amber-200/80 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 sm:px-5">
            <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              A pharmacist has been alerted. AI clinical guidance is paused — you can still add
              details or photos for the team.
            </p>
          </div>
        )}

        {/* Messages — only this region scrolls */}
        <div
          ref={listRef}
          id={listId}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
          role="log"
          aria-live="polite"
        >
          {session.messages.map((m) => {
            const isUser = m.role === "user";
            const isStaff = m.role === "staff";
            const isSystem = m.role === "system";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[85%] ${
                    isUser
                      ? "bg-gradient-to-br from-teal-700 to-teal-900 text-white"
                      : isStaff
                        ? "border border-amber-200 bg-amber-50 text-amber-950"
                        : isSystem
                          ? "border border-dashed border-teal-900/15 bg-[#f4f7f5] text-[#5a6b62]"
                          : "border border-teal-900/8 bg-[#f7faf8] text-[#0c1a14]"
                  }`}
                >
                  {isStaff && (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Pharmacist
                    </p>
                  )}
                  <div className="whitespace-pre-wrap">
                    {isUser ? m.content : renderMarkdownLite(m.content)}
                  </div>
                  {m.imageUrls && m.imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.imageUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg border border-black/10"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Attached"
                            className="h-24 w-24 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {busy && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-teal-900/8 bg-[#f7faf8] px-3.5 py-2 text-sm text-[#5a6b62]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Check-in strip */}
        {showCheckIn && !escalated && (
          <div className="shrink-0 border-t border-teal-900/5 bg-teal-50/80 px-4 py-3 sm:px-5">
            <p className="text-sm font-semibold text-teal-950">How do you feel now?</p>
            <p className="mt-0.5 text-xs text-teal-900/80">
              A quick check-in helps us know if things improved — or if you need a pharmacist.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { id: "better", label: "Better", icon: CheckCircle2 },
                  { id: "same", label: "About the same", icon: MessageCircle },
                  { id: "worse", label: "Worse", icon: AlertTriangle },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void submitCheckIn(opt.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-teal-800/15 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-50"
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCheckIn(false)}
                className="text-xs font-medium text-teal-800/70 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Composer */}
        {canChat && (
          <form onSubmit={onSubmit} className="shrink-0 border-t border-teal-900/5 p-3 sm:p-4">
            {pendingImages.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingImages.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingImages((prev) => prev.filter((u) => u !== url))
                      }
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-600 p-0.5 text-white"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {error && (
              <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) void uploadFiles(e.target.files);
                }}
              />
              <button
                type="button"
                disabled={uploading || busy || pendingImages.length >= 4}
                onClick={() => fileRef.current?.click()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-900/10 bg-white text-teal-800 hover:bg-teal-50 disabled:opacity-40"
                aria-label="Attach image"
                title="Attach photo"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={
                  escalated
                    ? "Add details for the pharmacist…"
                    : "Describe how you feel, or answer the question…"
                }
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-teal-900/10 bg-[#f7faf8] px-3 py-2.5 text-sm text-[#0c1a14] outline-none ring-teal-700/30 placeholder:text-[#8a9a92] focus:ring-2"
              />
              <button
                type="submit"
                disabled={busy || (!input.trim() && pendingImages.length === 0)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-900 text-white shadow-sm disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!escalated && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowCheckIn(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-teal-900/10 px-2.5 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-50"
                  >
                    <Camera className="h-3 w-3" />
                    How do I feel now?
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void escalate()}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
                  >
                    <Stethoscope className="h-3 w-3" />
                    Talk to a pharmacist
                  </button>
                </>
              )}
              <p className="text-[10px] text-[#8a9a92]">
                Photos help with rashes & labels · Enter to send · Shift+Enter for new line
              </p>
            </div>
          </form>
        )}
      </div>

      {/* Side panel */}
      <aside className="space-y-4">
        <div className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700">For you</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#5a6b62]">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              AI asks structured questions for mild everyday issues.
            </li>
            <li className="flex gap-2">
              <ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              Upload photos until a ticket is created for the pharmacist.
            </li>
            <li className="flex gap-2">
              <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              Escalate anytime for human feedback — staff get a full summary.
            </li>
          </ul>
          {session.aiSummary && (
            <div className="mt-4 rounded-xl bg-[#f4f7f5] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                Running summary
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#3d4f46]">{session.aiSummary}</p>
            </div>
          )}
          {session.checkIns.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                Check-ins
              </p>
              <ul className="mt-2 space-y-1">
                {session.checkIns.map((c) => (
                  <li key={c.id} className="text-xs text-[#5a6b62]">
                    <span className="font-semibold capitalize text-[#0c1a14]">{c.feeling}</span>
                    {" · "}
                    {new Date(c.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-teal-900/10 bg-gradient-to-br from-teal-900 to-[#084c3f] p-5 text-white shadow-sm">
          <p className="text-sm font-semibold">Prefer a human first?</p>
          <p className="mt-1 text-xs text-teal-100/90">
            Call, WhatsApp, or visit — we are happy to help without the guided flow.
          </p>
          <Link
            href={contactHref}
            className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/25"
          >
            Contact pharmacy →
          </Link>
        </div>

        {mode === "public" && (
          <p className="px-1 text-xs text-[#8a9a92]">
            Guests: progress is stored in this browser and mirrored to our secure database for
            continuity.{" "}
            <Link href="/login" className="font-semibold text-teal-800 hover:underline">
              Sign in
            </Link>{" "}
            to keep history across devices.
          </p>
        )}
      </aside>
    </div>
  );
}
