import "server-only";

import Groq from "groq-sdk";

/**
 * Groq retires preview/production model IDs on short notice.
 * Keep these in one place so chat, triage, vision, and admin AI stay in sync.
 *
 * Current replacements (Groq deprecations, Aug 2026):
 * - llama-3.1-8b-instant / llama-3.3-70b-versatile → openai/gpt-oss-20b
 * - llama-3.2-*-vision / llama-4-scout → qwen/qwen3.6-27b (vision)
 *
 * https://console.groq.com/docs/models
 * https://console.groq.com/docs/deprecations
 */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
export const DEFAULT_GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

export function groqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

export function groqModelName(): string {
  return (process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim();
}

/** Vision-capable model. Do not fall back to GROQ_MODEL — text models reject images. */
export function groqVisionModelName(): string {
  return (process.env.GROQ_VISION_MODEL || DEFAULT_GROQ_VISION_MODEL).trim();
}

export function groqClient(apiKey = groqApiKey()): Groq {
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey });
}

/** Qwen 3.6 defaults to thinking mode; skip it for chat/JSON so content is not empty. */
export const GROQ_NO_REASONING = { reasoning_effort: "none" as const };
