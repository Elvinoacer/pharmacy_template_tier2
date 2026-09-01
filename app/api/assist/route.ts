import { groqApiKey, groqClient, groqModelName, GROQ_NO_REASONING } from "@/app/lib/groq";
import { checkRateLimitAsync } from "@/app/lib/rate-limit";
import { searchAssistLive, type AssistLiveMatches } from "@/app/lib/services/assist-live-lookup";
import {
  ASSIST_INTENTS,
  DEFAULT_INTENT_ID,
  getAssistIntent,
  matchIntentByKeywords,
  type AssistAction,
} from "@/app/lib/assist-catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  live: AssistLiveMatches;
};

const PUBLIC_DESTINATIONS = [
  "/",
  "/pharmacies",
  "/medicines",
  "/refill",
  "/delivery",
  "/order",
  "/vaccinations",
  "/screenings",
  "/how-do-you-feel",
  "/health",
  "/health/self-care-guide",
  "/health/counselling",
  "/services",
  "/faq",
  "/contact",
  "/about",
  "/careers",
  "/privacy",
  "/login",
  "/register",
  "/portal",
  "/caregiver",
  "/platform",
];

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function safeHref(href: unknown, base: string): string | null {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return null;
  const trimmed = href.slice(0, 300);
  const root = trimmed.split("?")[0].split("#")[0];
  if (!PUBLIC_DESTINATIONS.includes(root)) return null;
  if (base && trimmed !== base && !trimmed.startsWith(`${base}/`)) return `${base}${trimmed}`;
  return trimmed;
}

function safeText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeActions(raw: unknown, fallback: AssistAction[], base: string): AssistActionDto[] {
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
      out.push({ label: action.label, href: href, description: action.description, primary: action.primary });
    }
  }
  if (out.length > 0 && !out.some((a) => a.primary)) out[0].primary = true;
  return out;
}

function buildRouteMap() {
  return [
    ["Home", "/"],
    ["Find pharmacies", "/pharmacies"],
    ["Browse medicines and OTC products", "/medicines"],
    ["Request a prescription refill", "/refill"],
    ["Get delivery or manage an order", "/delivery, /order"],
    ["Vaccinations", "/vaccinations"],
    ["Health screenings", "/screenings"],
    ["Symptom check", "/how-do-you-feel"],
    ["Health library and self-care", "/health, /health/self-care-guide"],
    ["Medication counselling", "/health/counselling"],
    ["Services", "/services"],
    ["FAQ and contact", "/faq, /contact"],
    ["About and careers", "/about, /careers"],
    ["Privacy", "/privacy"],
    ["Patient portal and caregiver portal", "/portal, /caregiver"],
    ["Account", "/login, /register"],
    ["Pharmacy platform information", "/platform"],
  ].map(([label, href]) => `- ${label}: ${href}`).join("\n");
}

async function rulesResponse(query: string, base: string, live: AssistLiveMatches): Promise<AssistResponse> {
  const intent = matchIntentByKeywords(query);
  return {
    source: "rules",
    intent: { id: intent.id, label: intent.label, blurb: intent.blurb },
    message:
      intent.id === "find-medicine"
        ? live.medicines.length
          ? "I found medicine matches across the public Aether network."
          : "I’ll check the public medicine listings and show pharmacies that match it."
        : `I’ll take you to the fastest way to ${intent.label.toLowerCase()}.`,
    actions: normalizeActions(null, intent.actions, base),
    followups: intent.examples.slice(0, MAX_FOLLOWUPS),
    live,
  };
}

function buildSystemPrompt(): string {
  const catalog = ASSIST_INTENTS.map((intent) => {
    const actions = intent.actions
      .map((a) => `      - label: ${a.label} | href: ${a.href} | description: ${a.description}`)
      .join("\n");
    return `  - id: "${intent.id}" — ${intent.label}: ${intent.blurb}\n    example queries: ${intent.examples.join("; ")}\n    suggested actions:\n${actions}`;
  }).join("\n");

  return `You are Aether's navigation assistant for a Kenyan pharmacy network.
Your job is to understand what a person wants and guide them to the right place in the product.

The app includes these public destinations:
${buildRouteMap()}

Available intent anchors:
${catalog}

Important:
1. Understand natural language. A medicine, pharmacy, area, delivery request, refill, symptom, vaccine, screening, account problem, health topic, or route question can appear inside a longer sentence.
2. Live directory data is authoritative for public medicines and pharmacies. Never invent a medicine, pharmacy, stock state, or price.
3. When a medicine is found in live data, prioritize those medicine matches and the pharmacies attached to them.
4. When a pharmacy is found, prioritize that pharmacy result.
5. For “where can I find X?”, answer with live results rather than a generic route when possible.
6. For “how do I …?”, “where is …?”, or “take me to …”, use the route map and choose the best public destination.
7. Keep the reply to one short sentence. Never provide dosage or personalized medical advice.
8. Return at most 2 actions and only use public hrefs from the route map.
9. Return 1-2 concise followups.
10. STRICT JSON only:
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
  if (query.length < 2) return Response.json({ error: "query required (min 2 characters)" }, { status: 400 });

  let base = "";
  if (typeof body.base === "string") {
    const candidate = body.base.trim();
    if (candidate && /^\/p\/[a-z0-9][a-z0-9-]{1,60}$/i.test(candidate)) base = candidate;
  }

  const rl = await checkRateLimitAsync(`assist:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const live = await searchAssistLive(query);
  const apiKey = groqApiKey();
  if (!apiKey) return Response.json(await rulesResponse(query, base, live));

  try {
    const client = groqClient(apiKey);
    const completion = await client.chat.completions.create({
      model: groqModelName(),
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: JSON.stringify({ query, live }) },
      ],
      temperature: 0.15,
      max_completion_tokens: 360,
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
      return Response.json(await rulesResponse(query, base, live));
    }

    const intentId = typeof parsed.intent === "string" ? parsed.intent : "";
    const intent = getAssistIntent(intentId) ?? getAssistIntent(DEFAULT_INTENT_ID)!;
    const message = safeText(parsed.message, 220) || `I’ll help you ${intent.label.toLowerCase()}.`;
    const followups = Array.isArray(parsed.followups)
      ? parsed.followups.map((f) => safeText(f, 80)).filter(Boolean).slice(0, 2)
      : intent.examples.slice(0, 2);

    return Response.json({
      source: "ai",
      intent: { id: intent.id, label: intent.label, blurb: intent.blurb },
      message,
      actions: normalizeActions(parsed.actions, intent.actions, base).slice(0, 2),
      followups,
      live,
    } satisfies AssistResponse);
  } catch (err) {
    console.error("[assist]", err);
    return Response.json(await rulesResponse(query, base, live));
  }
}
