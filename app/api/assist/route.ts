import { groqApiKey, groqClient, groqModelName, GROQ_NO_REASONING } from "@/app/lib/groq";
import { checkRateLimit } from "@/app/lib/rate-limit";
import {
  ASSIST_INTENTS,
  DEFAULT_INTENT_ID,
  getAssistIntent,
  matchIntentByKeywords,
  type AssistAction,
} from "@/app/lib/assist-catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Quick-assist intent router.
 *
 * The landing-page search bars and the per-page assist modal POST a free-text
 * query here. Instead of answering with a chat reply, we interpret WHAT THE
 * USER NEEDS and return structured "show, don't tell" data: a short
 * acknowledgement, direct action cards (label + href) and follow-up prompts.
 *
 * Falls back to deterministic keyword routing when Groq is unavailable, so
 * wayfinding never breaks.
 */

const MAX_QUERY_LENGTH = 200;
const MAX_ACTIONS = 3;
const MAX_FOLLOWUPS = 3;

type AssistActionDto = {
  label: string;
  href: string;
  description: string;
  primary?: boolean;
};

type AssistResponse = {
  source: "ai" | "rules";
  intent: { id: string; label: string; blurb: string };
  message: string;
  actions: AssistActionDto[];
  followups: string[];
};

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function safeHref(href: unknown, base: string): string | null {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return null;
  const trimmed = href.slice(0, 300);
  if (base && trimmed !== base && !trimmed.startsWith(`${base}/`)) {
    return `${base}${trimmed}`;
  }
  return trimmed;
}

function safeText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeActions(
  raw: unknown,
  fallback: AssistAction[],
  base: string,
): AssistActionDto[] {
  const out: AssistActionDto[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Record<string, unknown>;
      const href = safeHref(candidate.href, base);
      const label = safeText(candidate.label, 60);
      if (!href || !label) continue;
      out.push({
        label,
        href,
        description: safeText(candidate.description, 120),
        primary: candidate.primary === true,
      });
      if (out.length >= MAX_ACTIONS) break;
    }
  }
  if (out.length === 0) {
    for (const action of fallback.slice(0, MAX_ACTIONS)) {
      const href = safeHref(action.href, base);
      if (!href) continue;
      out.push({
        label: action.label,
        href,
        description: action.description,
        primary: action.primary,
      });
    }
  }
  if (out.length > 0 && !out.some((a) => a.primary)) out[0].primary = true;
  return out;
}

function rulesResponse(query: string, base: string): AssistResponse {
  const intent = matchIntentByKeywords(query);
  return {
    source: "rules",
    intent: { id: intent.id, label: intent.label, blurb: intent.blurb },
    message: `Here's the fastest way to ${intent.label.toLowerCase()}:`,
    actions: normalizeActions(null, intent.actions, base),
    followups: intent.examples.slice(0, MAX_FOLLOWUPS),
  };
}

function buildSystemPrompt(): string {
  const catalog = ASSIST_INTENTS.map((intent) => {
    const actions = intent.actions
      .map((a) => `      - label: ${a.label} | href: ${a.href} | description: ${a.description}`)
      .join("\n");
    return `  - id: "${intent.id}" — ${intent.label}: ${intent.blurb}
    example queries: ${intent.examples.join("; ")}
    suggested actions:
${actions}`;
  }).join("\n");

  return `You are the quick-assist router for a Kenyan community pharmacy network. Users type short, real-life needs into a search bar. Your job is NOT to chat — it is to recognise what they need and hand back actionable links.

Available intents (choose exactly one):
${catalog}

Rules:
1. Pick the single best-matching intent id. If nothing matches, choose "find-pharmacy".
2. "message": acknowledge what they need in 1 short sentence (max ~25 words). Warm, plain English. Never give medical advice or dosages. Never use markdown.
3. "actions": pick 1-3 actions from the intent's suggested actions. You may lightly rewrite the label so it fits their exact request, but you MUST copy the href values exactly. Mark exactly one action with "primary": true.
4. "followups": 2-3 short alternative things they might want (each max 6 words).
5. Respond with STRICT JSON only, matching this shape:
{"intent":"<id>","message":"<string>","actions":[{"label":"<string>","href":"<string>","description":"<string>","primary":<boolean>}],"followups":["<string>"]}`;
}

export async function POST(request: Request) {
  let body: { query?: unknown; base?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, MAX_QUERY_LENGTH) : "";
  if (query.length < 2) {
    return Response.json({ error: "query required (min 2 characters)" }, { status: 400 });
  }

  // Storefront base must be a strict /p/{slug} prefix or empty.
  let base = "";
  if (typeof body.base === "string") {
    const candidate = body.base.trim();
    if (candidate && /^\/p\/[a-z0-9][a-z0-9-]{1,60}$/i.test(candidate)) base = candidate;
  }

  const rl = checkRateLimit(`assist:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const apiKey = groqApiKey();
  if (!apiKey) return Response.json(rulesResponse(query, base));

  try {
    const client = groqClient(apiKey);
    const completion = await client.chat.completions.create({
      model: groqModelName(),
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: query },
      ],
      temperature: 0.2,
      max_completion_tokens: 500,
      top_p: 0.9,
      stream: false,
      response_format: { type: "json_object" },
      ...GROQ_NO_REASONING,
    });

    const raw = completion.choices[0]?.message?.content || "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return Response.json(rulesResponse(query, base));
    }

    const intentId = typeof parsed.intent === "string" ? parsed.intent : "";
    const intent = getAssistIntent(intentId) ?? getAssistIntent(DEFAULT_INTENT_ID)!;

    let message = safeText(parsed.message, 220);
    if (!message) message = `Here's the fastest way to ${intent.label.toLowerCase()}:`;

    const followups = Array.isArray(parsed.followups)
      ? parsed.followups
          .map((f) => safeText(f, 80))
          .filter(Boolean)
          .slice(0, MAX_FOLLOWUPS)
      : [];
    if (followups.length === 0) followups.push(...intent.examples.slice(0, 2));

    const response: AssistResponse = {
      source: "ai",
      intent: { id: intent.id, label: intent.label, blurb: intent.blurb },
      message,
      actions: normalizeActions(parsed.actions, intent.actions, base),
      followups,
    };
    return Response.json(response);
  } catch (err) {
    console.error("[assist]", err);
    return Response.json(rulesResponse(query, base));
  }
}
