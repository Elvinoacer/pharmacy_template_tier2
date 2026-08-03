"use client";

/**
 * Shared AI form-filling helper.
 *
 * Standardises AI-assisted form filling across the entire admin panel.
 *
 * Why this exists:
 *   - The /api/chat endpoint returns a STREAMING text/plain response
 *     (so that the customer chatbot can render tokens as they arrive).
 *   - Older form code was treating the response as JSON and reading
 *     `j.reply || j.content`, which always came back undefined —
 *     so AI "generated" content but never injected it into the form.
 *
 * Standard behaviour enforced here:
 *   1. Caller passes a button ref so we can show a loading spinner + disable.
 *   2. We POST the prompt to /api/chat.
 *   3. We read the response as TEXT (not JSON), since the endpoint streams
 *      plain text from Groq.
 *   4. We trim and pass the suggestion to `onResult`.
 *   5. Empty results and network errors are clearly communicated via toasts.
 *
 * Used by: CampaignForm, TemplateForm, AdminMessageForm, ReminderForm,
 * and any future AI-enabled form.
 */

import { useState } from "react";
import { toast } from "@/app/components/Toaster";

export type AiDraftOptions = {
  /** System prompt — tells the model how to behave and what to output. */
  systemPrompt: string;
  /** User prompt — the seed text the model expands on. */
  userPrompt: string;
  /** Callback that receives the generated suggestion (already trimmed). */
  onResult: (suggestion: string) => void;
  /** Toast message on success. */
  successMessage?: string;
  /** Toast message when the model returns an empty string. */
  emptyMessage?: string;
  /** Toast message when the request fails (network / 5xx / etc). */
  errorMessage?: string;
  /** Optional pre-flight hook — return false to abort. */
  beforeStart?: () => boolean | Promise<boolean>;
};

/**
 * Calls /api/chat with the given prompts and injects the result via `onResult`.
 * Handles loading state, errors, and toasts in a uniform way.
 *
 * Returns true if a suggestion was successfully injected, false otherwise.
 */
export async function callAiDraft(opts: AiDraftOptions): Promise<boolean> {
  if (opts.beforeStart) {
    const ok = await opts.beforeStart();
    if (!ok) return false;
  }

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
      }),
    });
  } catch {
    toast.error(opts.errorMessage || "AI helper unavailable (network error).");
    return false;
  }

  if (!response.ok) {
    // Endpoint returns JSON on config errors (503) and server errors (500).
    // Try to extract a useful message; fall back to a generic error.
    let detail = opts.errorMessage || "AI helper unavailable.";
    try {
      const j = (await response.json()) as { error?: string };
      if (j?.error) detail = j.error;
    } catch {
      /* response was not JSON — keep the default message */
    }
    toast.error(detail);
    return false;
  }

  // The successful response is text/plain streamed from Groq. Read it in full.
  let suggestion = "";
  try {
    suggestion = await response.text();
  } catch {
    toast.error("Could not read AI response.");
    return false;
  }

  suggestion = (suggestion || "").trim();
  if (!suggestion) {
    toast.error(opts.emptyMessage || "AI did not return a suggestion.");
    return false;
  }

  opts.onResult(suggestion);
  toast.success(opts.successMessage || "AI draft inserted — review and edit.");
  return true;
}

/**
 * Convenience hook for components that want a `loading` flag alongside the call.
 *
 *   const { draft, loading } = useAiDraft({ onResult: setBody });
 *   <button onClick={draft} disabled={loading}>AI</button>
 */
export function useAiDraft(
  opts: Omit<AiDraftOptions, "onResult"> & { onResult: (s: string) => void },
) {
  const [loading, setLoading] = useState(false);
  return {
    loading,
    draft: async () => {
      setLoading(true);
      try {
        await callAiDraft(opts);
      } finally {
        setLoading(false);
      }
    },
  };
}
