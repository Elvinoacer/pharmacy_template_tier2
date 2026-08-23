import "server-only";

import Groq from "groq-sdk";

/**
 * Groq retires model IDs periodically. Keep model selection centralized so
 * every AI surface uses the same safe defaults and old deployment variables
 * cannot take the public assistant offline.
 */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
export const DEFAULT_GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

const RETIRED_TEXT_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
]);

const RETIRED_VISION_MODELS = new Set([
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
  "llama-4-scout-17b-16e-instruct",
]);

export function groqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

export function groqModelName(): string {
  const configured = process.env.GROQ_MODEL?.trim();
  if (!configured || RETIRED_TEXT_MODELS.has(configured)) {
    return DEFAULT_GROQ_MODEL;
  }
  return configured;
}

/** Vision-capable model. Never fall back to the text model for image requests. */
export function groqVisionModelName(): string {
  const configured = process.env.GROQ_VISION_MODEL?.trim();
  if (!configured || RETIRED_VISION_MODELS.has(configured)) {
    return DEFAULT_GROQ_VISION_MODEL;
  }
  return configured;
}

export function groqClient(apiKey = groqApiKey()): Groq {
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const client = new Groq({ apiKey });
  const create = client.chat.completions.create.bind(client.chat.completions);

  // Provider/model details must stay in server logs, never in public chat UI.
  client.chat.completions.create = (async (...args: Parameters<typeof create>) => {
    try {
      return await create(...args);
    } catch (error) {
      console.error("[groq] provider request failed", error);
      throw new Error("AI provider unavailable");
    }
  }) as typeof client.chat.completions.create;

  return client;
}

/** Qwen defaults to thinking mode; disable it for chat/JSON responses. */
export const GROQ_NO_REASONING = { reasoning_effort: "none" as const };
