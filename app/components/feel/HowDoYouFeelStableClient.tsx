"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { useTenantHref, useTenantSlug } from "../TenantLink";

const GUEST_KEY_STORAGE = "afyvia-feel-guest-key";

const FALLBACK_CATEGORIES = [
  { id: "headache", label: "Headache & Pain", description: "Headache, muscle tension, joint ache or fever." },
  { id: "cold_flu", label: "Cold, Flu & Cough", description: "Cough, congestion, sore throat or feeling feverish." },
  { id: "allergy", label: "Allergy & Hay Fever", description: "Sneezing, itchy or watery eyes and nasal allergies." },
  { id: "stomach", label: "Stomach & Digestion", description: "Heartburn, cramps, diarrhoea, nausea or digestive discomfort." },
  { id: "skin", label: "Skin, Rashes & Itch", description: "Rash, eczema, itch, insect bite or irritation." },
  { id: "first_aid", label: "Minor Cuts & Burns", description: "Superficial cuts, scrapes, minor burns or sprains." },
  { id: "oral", label: "Mouth & Dental", description: "Mouth ulcers, dry mouth, gum or dental discomfort." },
  { id: "women_baby", label: "Feminine & Baby Care", description: "Menstrual discomfort, thrush, colic or diaper rash." },
  { id: "other", label: "Something Else", description: "Describe what you are feeling in your own words." },
] as const;

type Category = { id: string; label: string; description: string; starter?: string };
type Message = { id: string; role: string; content: string; createdAt: string };
type Session = {
  id: string;
  status: string;
  category: string | null;
  chiefComplaint: string | null;
  provisionalLabel: string | null;
  messages: Message[];
};
type SessionListItem = {
  id: string;
  status: string;
  category: string | null;
  chiefComplaint: string | null;
  provisionalLabel: string | null;
  lastMessageAt: string | null;
};

type SessionListResponse = {
  categories?: Category[];
  sessions?: SessionListItem[];
  historyUnavailable?: boolean;
  error?: string;
};

type SessionResponse = { session?: Session | null; error?: string };

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function guestKeyFromBrowser() {
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

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? ((await response.json()) as T & { error?: string })
      : ({ error: `Unexpected server response (${response.status})` } as T & { error?: string });
    if (!response.ok) {
      throw new Error(payload.error || `Request failed (${response.status})`);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request took too long. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

const STATUS_LABEL: Record<string, string> = {
  active: "In progress",
  monitoring: "Monitoring",
  escalated: "With pharmacist",
  resolved: "Resolved",
  closed: "Closed",
};

export default function HowDoYouFeelStableClient({
  mode = "public",
  pharmacySlug: initialPharmacySlug,
  pharmacies = [],
}: {
  mode?: "public" | "portal";
  pharmacySlug?: string | null;
  pharmacies?: { id: string; name: string; slug: string; address?: string }[];
}) {
  const contactHref = useTenantHref("/contact");
  const contextSlug = useTenantSlug();
  const [selectedPharmacySlug, setSelectedPharmacySlug] = useState<string | null>(
    initialPharmacySlug || contextSlug || null,
  );
  const activeSlug = selectedPharmacySlug || contextSlug || initialPharmacySlug || null;
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [modalChoice, setModalChoice] = useState<string>(activeSlug || pharmacies[0]?.slug || "");

  const [guestKey, setGuestKey] = useState("");
  const [categories, setCategories] = useState<Category[]>([...FALLBACK_CATEGORIES]);
  const [pastSessions, setPastSessions] = useState<SessionListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const key = guestKeyFromBrowser();

    queueMicrotask(() => {
      if (!cancelled) setGuestKey(key);
    });

    const loadHistory = async () => {
      try {
        const qs = mode === "portal" ? "" : `?guestKey=${encodeURIComponent(key)}`;
        const data = await fetchJson<SessionListResponse>(`/api/feel/session${qs}`, {}, 6000);
        if (cancelled) return;
        if (data.categories?.length) setCategories(data.categories);
        setPastSessions(data.sessions || []);
        setHistoryUnavailable(Boolean(data.historyUnavailable));
      } catch {
        if (!cancelled) setHistoryUnavailable(true);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (!session?.messages.length) return;
    const timer = window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session?.messages.length]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === session?.category),
    [categories, session?.category],
  );

  async function startSession(categoryId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = guestKey || guestKeyFromBrowser();
      if (!guestKey) setGuestKey(key);
      const data = await fetchJson<SessionResponse>(
        "/api/feel/session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestKey: key,
            category: categoryId,
            pharmacySlug: activeSlug || undefined,
          }),
        },
        10000,
      );
      if (!data.session) throw new Error("The check-in could not be created.");
      setSession(data.session);
      setInput("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the check-in.");
    } finally {
      setBusy(false);
    }
  }

  async function openSession(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = guestKey || guestKeyFromBrowser();
      const data = await fetchJson<SessionResponse>(
        `/api/feel/session?id=${encodeURIComponent(id)}&guestKey=${encodeURIComponent(key)}`,
        {},
        8000,
      );
      if (!data.session) throw new Error("This check-in could not be loaded.");
      setSession(data.session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this check-in.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!session || !text || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    try {
      const key = guestKey || guestKeyFromBrowser();
      const data = await fetchJson<SessionResponse>(
        "/api/feel/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.id, guestKey: key, content: text }),
        },
        20000,
      );
      if (!data.session) throw new Error("No reply was returned. Please try again.");
      setSession(data.session);
    } catch (cause) {
      setInput(text);
      setError(cause instanceof Error ? cause.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  async function escalate(explicitPharmacySlug?: string) {
    if (!session || busy) return;

    const targetSlug = explicitPharmacySlug || activeSlug;
    if (!targetSlug && pharmacies.length > 0) {
      setShowEscalationModal(true);
      return;
    }

    setBusy(true);
    setError(null);
    setShowEscalationModal(false);
    try {
      const key = guestKey || guestKeyFromBrowser();
      const data = await fetchJson<SessionResponse>(
        "/api/feel/escalate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            guestKey: key,
            reason: "user_requested_pharmacist",
            pharmacySlug: targetSlug || undefined,
          }),
        },
        10000,
      );
      if (data.session) {
        setSession(data.session);
        if (targetSlug) setSelectedPharmacySlug(targetSlug);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect to a pharmacist.");
    } finally {
      setBusy(false);
    }
  }

  function clearDeviceHistory() {
    try {
      localStorage.removeItem(GUEST_KEY_STORAGE);
      const freshKey = `guest_${uid()}`;
      localStorage.setItem(GUEST_KEY_STORAGE, freshKey);
      setGuestKey(freshKey);
    } catch {
      // ignore storage access errors
    }
    setPastSessions([]);
    setSession(null);
    setError(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  if (!session) {
    return (
      <div className="space-y-6 text-slate-900 dark:text-slate-100">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Guided self-care check-in
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">What are you feeling today?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Choose the closest match. The assistant will ask a few focused questions and can hand the conversation to a pharmacist whenever you want.
            </p>
          </div>
          <Link
            href={contactHref}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Talk to pharmacy
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p><strong>Not a diagnosis.</strong> This is for mild, everyday concerns. Severe breathing problems, chest pain, severe bleeding, seizures or other emergencies need urgent in-person care.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              disabled={busy}
              onClick={() => void startSession(category.id)}
              className="group min-h-36 rounded-2xl border border-slate-200/90 bg-white/90 p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-wait disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-emerald-700"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{category.label}</p>
              <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-400">{category.description}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-emerald-600" /> Recent check-ins</p>
            <div className="flex items-center gap-2">
              {historyLoading && <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history</span>}
              {mode !== "portal" && pastSessions.length > 0 && (
                <button
                  type="button"
                  onClick={clearDeviceHistory}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                  title="Remove check-in history from this browser (useful for shared devices)"
                >
                  <Trash2 className="h-3 w-3" /> Clear device history
                </button>
              )}
            </div>
          </div>
          {!historyLoading && historyUnavailable && pastSessions.length === 0 && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">History is temporarily unavailable. You can still start a new check-in above.</p>
          )}
          {!historyLoading && !historyUnavailable && pastSessions.length === 0 && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No previous check-ins on this device yet.</p>
          )}
          {pastSessions.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {pastSessions.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void openSession(item.id)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:hover:bg-slate-900"
                >
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.provisionalLabel || item.chiefComplaint || item.category || "Check-in"}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{STATUS_LABEL[item.status] || item.status}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
      </div>
    );
  }

  const escalated = session.status === "escalated";
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex min-h-[540px] max-h-[72dvh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{selectedCategory?.label || "Symptom check-in"}</p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{session.provisionalLabel || session.chiefComplaint || "Tell us how you feel"}</p>
          </div>
          <div className="flex items-center gap-2">
            {mode !== "portal" && (
              <button
                type="button"
                onClick={clearDeviceHistory}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-800 dark:hover:text-rose-400"
                title="Clear check-in from this device"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
            <button type="button" onClick={() => { setSession(null); setError(null); }} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"><ArrowLeft className="h-3.5 w-3.5" /> New</button>
          </div>
        </header>

        {escalated && <div className="flex gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><Stethoscope className="mt-0.5 h-4 w-4 shrink-0" /> A pharmacist has been notified. You can keep adding details while you wait.</div>}

        <div ref={listRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950 sm:px-5">
          {session.messages.map((message) => {
            const isUser = message.role === "user";
            const isStaff = message.role === "staff";
            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 sm:max-w-[82%] ${isUser ? "bg-emerald-700 text-white" : isStaff ? "border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" : "border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"}`}>
                  {isStaff && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Pharmacist</p>}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            );
          })}
          {busy && <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Working…</div>}
        </div>

        <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:p-4">
          {error && <div role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={busy || session.status === "closed"}
              placeholder={escalated ? "Add details for the pharmacist…" : "Describe how you feel…"}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
            <button type="submit" disabled={busy || !input.trim() || session.status === "closed"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><Send className="h-4 w-4" /></button>
          </div>
        </form>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Current status</p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {STATUS_LABEL[session.status] || session.status}</p>
          {!escalated && session.status !== "closed" && <button type="button" disabled={busy} onClick={() => void escalate()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><Stethoscope className="h-4 w-4" /> Talk to a pharmacist</button>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><MessageCircle className="h-4 w-4 text-emerald-600" /> How this works</p>
          <p className="mt-2 leading-6">Answer one question at a time. The assistant keeps the conversation focused and can escalate it to the pharmacy team.</p>
        </div>
      </aside>

      {showEscalationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Choose pharmacy branch</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Select which pharmacy team will review your case.</p>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="escalate-pharmacy-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Available branches
              </label>
              <select
                id="escalate-pharmacy-select"
                value={modalChoice}
                onChange={(e) => setModalChoice(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {pharmacies.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} {p.address ? `(${p.address})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEscalationModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !modalChoice}
                onClick={() => void escalate(modalChoice)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
              >
                Connect with pharmacist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
