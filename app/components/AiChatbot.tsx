"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { SUGGESTED_PROMPTS } from "../lib/suggested-prompts";
import { Markdown } from "./Markdown";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  streaming?: boolean;
};

const WELCOME =
  "Hi — I'm the Aether Care Assistant. Ask me about hours, refills, delivery, whether a medicine is in stock, or anything else about this pharmacy. I'm not a substitute for a pharmacist for personal medical advice.";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function AssistantContent({ content, streaming }: { content: string; streaming?: boolean }) {
  if (!content && streaming) {
    return (
      <span className="inline-flex items-center gap-1.5 py-0.5" aria-label="Assistant is typing">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
    );
  }

  return (
    <div className="chat-md relative">
      <Markdown className="chat-md-body">{content}</Markdown>
      {streaming && content ? (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-teal-500/70 align-middle" />
      ) : null}
    </div>
  );
}

export default function AiChatbot() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const [unread, setUnread] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom(false);
      const unreadTimer = window.setTimeout(() => setUnread(false), 0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 180);
      return () => {
        window.clearTimeout(unreadTimer);
        window.clearTimeout(t);
      };
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, busy, scrollToBottom]);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    setError(null);
    setInput("");
    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const nextMessages = [...messages, userMsg];
    setMessages([
      ...nextMessages,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setBusy(true);

    const history = nextMessages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: text }] }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = "Could not reach the assistant.";
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      if (!res.body) throw new Error("Empty response from assistant.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const snapshot = full;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: snapshot, streaming: true } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: full.trim() || "I did not get a response. Please try again.",
                streaming: false,
              }
            : m
        )
      );

      if (!open) setUnread(true);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "Cancelled.", streaming: false }
              : m
          )
        );
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    m.content ||
                    "Sorry — I could not complete that reply. Please try again or call the pharmacy.",
                  streaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME }]);
    setError(null);
    setBusy(false);
    setInput("");
  }

  function stopStream() {
    abortRef.current?.abort();
  }

  return (
    <div className="chatbot-root pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-end p-4 sm:p-6">
      <div
        id={panelId}
        role="dialog"
        aria-modal="false"
        aria-label="Aether Care Assistant"
        aria-hidden={!open}
        className={`pointer-events-auto absolute bottom-[4.75rem] right-4 flex w-[min(100vw-2rem,24.5rem)] origin-bottom-right flex-col overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/95 shadow-[0_28px_80px_rgba(8,40,32,0.28)] backdrop-blur-2xl transition-all duration-300 sm:right-6 sm:bottom-[5.25rem] ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
        style={{ maxHeight: "min(72vh, 560px)", height: "min(72vh, 560px)" }}
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0d6e5a] via-[#0a5c4c] to-[#084c3f] px-4 py-3.5 text-white">
          <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-teal-300/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-8 h-24 w-24 rounded-full bg-amber-300/15 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                  fill="#5eead4"
                />
                <path d="M12 16v5" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a5c4c] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">Aether Care Assistant</p>
              <p className="text-[11px] text-teal-100/85">
                {busy ? "Thinking…" : "Online · Pharmacy assistant"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Clear conversation"
                title="Clear chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div
          ref={listRef}
          className="chat-scroll flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-[#f3faf7] to-white px-3.5 py-4"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "rounded-br-md bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white"
                    : "rounded-bl-md border border-teal-900/5 bg-white text-[#0c1a14]"
                }`}
              >
                {m.role === "assistant" ? (
                  <AssistantContent content={m.content} streaming={m.streaming} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}

          {messages.length <= 1 && !busy && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-teal-800/10 bg-white/90 px-3 py-1.5 text-left text-[11px] font-medium text-[#084c3f] shadow-sm transition hover:border-teal-700/25 hover:bg-teal-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="shrink-0 border-t border-red-100 bg-red-50 px-3.5 py-2 text-xs text-red-700" role="alert">
            {error}
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="shrink-0 border-t border-teal-900/5 bg-white/90 p-3 backdrop-blur"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-teal-900/10 bg-[#f7fbf9] p-1.5 shadow-inner focus-within:border-teal-600/30 focus-within:ring-2 focus-within:ring-teal-500/15">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about hours, refills…"
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-[#0c1a14] outline-none placeholder:text-[#5a6b62]/55"
              aria-label="Message the care assistant"
            />
            {busy ? (
              <button
                type="button"
                onClick={stopStream}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-900/10 text-[#084c3f] transition hover:bg-teal-900/15"
                aria-label="Stop generating"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-white shadow-md shadow-teal-900/20 transition enabled:hover:scale-105 enabled:hover:shadow-lg disabled:opacity-40"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed text-[#5a6b62]/75">
            AI can make mistakes. For medical advice, talk to a pharmacist. Emergencies in Kenya: call 999 or 112.
          </p>
        </form>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="chatbot-fab pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_12px_40px_rgba(13,110,90,0.45)] transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300 sm:h-16 sm:w-16"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close care assistant" : "Open care assistant"}
      >
        <span className="chatbot-ripple chatbot-ripple-1" aria-hidden />
        <span className="chatbot-ripple chatbot-ripple-2" aria-hidden />
        <span className="chatbot-ripple chatbot-ripple-3" aria-hidden />
        <span className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#14b8a6] via-[#0d6e5a] to-[#084c3f]">
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                fill="#5eead4"
              />
              <path d="M8 18h8M10 21h4" stroke="#fcd34d" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </span>
        {unread && !open && (
          <span className="absolute -right-0.5 -top-0.5 z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400 shadow" />
        )}
      </button>
    </div>
  );
}
