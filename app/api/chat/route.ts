import Groq from "groq-sdk";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "groq-sdk/resources/chat/completions";
import { buildPharmacyContext, buildCaregiverPatientContext } from "../../lib/chat-context";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { dispatchPushToStaff } from "@/app/lib/services/push";
import { isCaregiver } from "@/app/lib/services/caregiver-permissions";
import {
  AI_CHAT_TOOLS,
  MAX_TOOL_CALLS_PER_ROUND,
  MAX_TOOL_ROUNDS,
  executeAiTool,
} from "@/app/lib/ai-tools";
import { checkRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

const ESCALATION_PHRASES = [
  "speak to a pharmacist",
  "talk to a pharmacist",
  "contact the pharmacy",
  "call the pharmacy",
  "i'm not sure",
  "i am not sure",
  "escalate",
  "cannot advise",
  "can't advise",
];

const USER_ESCALATION_PATTERNS = [
  "chest pain",
  "trouble breathing",
  "difficulty breathing",
  "shortness of breath",
  "overdose",
  "suicidal",
  "self harm",
  "severe allergic",
  "anaphylaxis",
  "pregnant",
  "baby",
  "infant",
  "blood in",
  "interpret my lab",
  "lab result",
  "diagnose",
  "what dose",
  "dosage",
  "can i take",
];

const ESCALATION_RESPONSE =
  "I need to hand this to a pharmacist before giving guidance. If this may be an emergency, call local emergency services now. Otherwise, contact the pharmacy directly so a pharmacist can review your situation.";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function streamText(text: string, extraHeaders: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

/**
 * Run tool-calling rounds (non-streaming), then return either:
 * - final assistant text already produced without tools, or
 * - working message list ready for a final streaming completion.
 */
async function resolveTools(
  client: Groq,
  modelName: string,
  baseMessages: ChatCompletionMessageParam[],
): Promise<
  | { kind: "text"; content: string }
  | { kind: "continue"; messages: ChatCompletionMessageParam[] }
> {
  const working: ChatCompletionMessageParam[] = [...baseMessages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: working,
      tools: AI_CHAT_TOOLS,
      tool_choice: "auto",
      temperature: 0.3,
      max_completion_tokens: 1024,
      top_p: 0.9,
      stream: false,
    });

    const choice = completion.choices[0];
    const msg = choice?.message;
    if (!msg) {
      return { kind: "text", content: "Sorry — I could not generate a reply. Please try again." };
    }

    const toolCalls = (msg.tool_calls ?? []).slice(0, MAX_TOOL_CALLS_PER_ROUND);

    if (!toolCalls.length || choice.finish_reason === "stop") {
      // Model answered directly (or finished after tools on a prior round with content).
      if (!toolCalls.length && msg.content?.trim()) {
        return { kind: "text", content: msg.content };
      }
      if (!toolCalls.length) {
        // No content and no tools — fall through to a streaming retry without tools.
        return { kind: "continue", messages: working };
      }
    }

    // Append assistant tool-call message, then tool results.
    working.push({
      role: "assistant",
      content: msg.content || null,
      tool_calls: toolCalls as ChatCompletionMessageToolCall[],
    });

    for (const call of toolCalls) {
      if (call.type !== "function" || !call.function?.name) {
        working.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: "invalid_tool_call" }),
        });
        continue;
      }
      const result = await executeAiTool(call.function.name, call.function.arguments || "{}");
      working.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  // Cap reached — let the model summarize with tools disabled.
  return { kind: "continue", messages: working };
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      {
        error: "Groq is not configured. Add GROQ_API_KEY to your .env.local file.",
      },
      { status: 503 },
    );
  }

  const rl = checkRateLimit(`chat:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: `Too many chat requests. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: { messages?: ChatMessage[]; sessionKey?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const trimmed = messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content || "").slice(0, MAX_CONTENT_LENGTH),
  }));

  const last = trimmed[trimmed.length - 1];
  if (last.role !== "user" || !last.content.trim()) {
    return Response.json({ error: "Last message must be from user" }, { status: 400 });
  }

  const session = await getSessionUser();
  const sessionKey = body.sessionKey || `web-${Date.now()}`;

  // Persist AI conversation for CRM analytics (best-effort)
  let conversationId: string | null = null;
  try {
    const existing = body.sessionKey
      ? await prisma.aiConversation.findFirst({
          where: { sessionKey: body.sessionKey },
          orderBy: { createdAt: "desc" },
        })
      : null;

    const conv =
      existing ??
      (await prisma.aiConversation.create({
        data: {
          sessionKey,
          channel: session?.customerId ? "portal" : "website",
          customerId: session?.customerId ?? undefined,
          userId: session?.id ?? undefined,
        },
      }));
    conversationId = conv.id;

    await prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: "user",
        content: last.content,
      },
    });
  } catch (err) {
    console.error("[chat persist user]", err);
  }

  const userNeedsEscalation = USER_ESCALATION_PATTERNS.some((p) =>
    last.content.toLowerCase().includes(p),
  );
  if (userNeedsEscalation) {
    if (conversationId) {
      try {
        await prisma.aiMessage.create({
          data: {
            conversationId,
            role: "assistant",
            content: ESCALATION_RESPONSE,
          },
        });
        await prisma.aiConversation.update({
          where: { id: conversationId },
          data: {
            messageCount: { increment: 2 },
            escalated: true,
            escalatedAt: new Date(),
            summary: last.content.slice(0, 240),
          },
        });
        if (session?.customerId) {
          await prisma.timelineEvent.create({
            data: {
              customerId: session.customerId,
              userId: session.id,
              eventType: "ai_escalation",
              title: "AI conversation escalated",
              description: last.content.slice(0, 120),
              metadata: { conversationId, reason: "pre_response_guardrail" },
            },
          });
        }

        await dispatchPushToStaff({
          title: "AI conversation escalated",
          body: last.content.slice(0, 140) || "A customer needs a human pharmacist.",
          url: "/admin/ai",
          data: {
            tag: "ai-escalation",
            conversationId,
            reason: "pre_response_guardrail",
          },
        }).catch(() => {
          /* best-effort */
        });
      } catch (err) {
        console.error("[chat persist escalation]", err);
      }
    }

    return streamText(ESCALATION_RESPONSE, {
      "X-Session-Key": sessionKey,
      "X-Escalated": "true",
    });
  }

  const modelName = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();
  const client = new Groq({ apiKey });

  // Build context with only relevant knowledge for this user turn (not the full KB).
  let systemPrompt = await buildPharmacyContext(last.content);

  if (session && (await isCaregiver(session).catch(() => false))) {
    const ctx = await buildCaregiverPatientContext(session).catch(() => "");
    if (ctx) systemPrompt = `${systemPrompt}\n\n${ctx}`;
  }

  const baseMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...trimmed.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const resolved = await resolveTools(client, modelName, baseMessages);

    // Fast path: model answered without needing a second completion.
    if (resolved.kind === "text") {
      const fullAssistant = resolved.content.trim();
      if (conversationId && fullAssistant) {
        await persistAssistantReply({
          conversationId,
          fullAssistant,
          lastUserContent: last.content,
          session,
        }).catch((err) => console.error("[chat persist assistant]", err));
      }
      return streamText(fullAssistant || "I did not get a response. Please try again.", {
        "X-Session-Key": sessionKey,
      });
    }

    // After tools (or empty direct answer): stream a final natural-language reply.
    // Tools are omitted so the model must answer from tool results already in history.
    const stream = await client.chat.completions.create({
      model: modelName,
      messages: resolved.messages,
      temperature: 0.5,
      max_completion_tokens: 1024,
      top_p: 0.9,
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullAssistant = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullAssistant += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          if (conversationId && fullAssistant) {
            await persistAssistantReply({
              conversationId,
              fullAssistant,
              lastUserContent: last.content,
              session,
            }).catch((err) => console.error("[chat persist assistant]", err));
          }

          controller.close();
        } catch (err) {
          console.error("[chat stream]", err);
          controller.enqueue(
            encoder.encode("\n\nSorry — the response was interrupted. Please try again."),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Session-Key": sessionKey,
      },
    });
  } catch (err: unknown) {
    console.error("[chat]", err);
    const message = err instanceof Error ? err.message : "Failed to reach Groq";

    let errorMessage = "Something went wrong talking to the assistant. Please try again.";

    if (message.includes("API key") || message.includes("API_KEY")) {
      errorMessage = "Invalid Groq API key. Check GROQ_API_KEY in .env.local.";
    } else if (message.includes("Rate limit") || message.includes("429")) {
      errorMessage = `Rate limit exceeded for ${modelName}.`;
    } else if (message.includes("tool") || message.includes("function")) {
      errorMessage = "The assistant could not complete a product lookup. Please try again.";
    }

    return Response.json(
      {
        error: errorMessage,
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}

async function persistAssistantReply(opts: {
  conversationId: string;
  fullAssistant: string;
  lastUserContent: string;
  session: Awaited<ReturnType<typeof getSessionUser>>;
}) {
  const { conversationId, fullAssistant, lastUserContent, session } = opts;
  const lower = fullAssistant.toLowerCase();
  const escalated = ESCALATION_PHRASES.some((p) => lower.includes(p));

  await prisma.aiMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content: fullAssistant,
    },
  });
  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      messageCount: { increment: 2 },
      escalated: escalated || undefined,
      escalatedAt: escalated ? new Date() : undefined,
    },
  });

  if (session?.customerId) {
    await prisma.timelineEvent.create({
      data: {
        customerId: session.customerId,
        userId: session.id,
        eventType: escalated ? "ai_escalation" : "ai_conversation",
        title: escalated ? "AI conversation escalated" : "AI conversation",
        description: lastUserContent.slice(0, 120),
        metadata: { conversationId, escalated },
      },
    });
  }

  if (escalated) {
    await dispatchPushToStaff({
      title: "AI conversation escalated",
      body: lastUserContent.slice(0, 140) || "The assistant handed off to a pharmacist.",
      url: "/admin/ai",
      data: {
        tag: "ai-escalation",
        conversationId,
        reason: "model_response",
      },
    }).catch(() => {
      /* best-effort */
    });
  }
}
