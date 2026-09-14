import type Groq from "groq-sdk";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "groq-sdk/resources/chat/completions";
import { groqApiKey, groqClient, groqModelName } from "@/app/lib/groq";
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
import { checkRateLimitAsync } from "@/app/lib/rate-limit";

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
      if (!toolCalls.length && msg.content?.trim()) {
        return { kind: "text", content: msg.content };
      }
      if (!toolCalls.length) {
        return { kind: "continue", messages: working };
      }
    }

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

  return { kind: "continue", messages: working };
}

export async function POST(request: Request) {
  const apiKey = groqApiKey();
  if (!apiKey) {
    console.error("[chat] assistant provider is not configured");
    return Response.json(
      {
        error: "assistant_unavailable",
        message: "The assistant is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  const rl = await checkRateLimitAsync(`chat:${clientIp(request)}`, {
    limit: 30,
    windowMs: 60_000,
    failClosed: true,
  });
  if (!rl.allowed) {
    return Response.json(
      {
        error: "rate_limited",
        message: `You're sending messages too quickly. Try again in ${rl.retryAfterSeconds}s.`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let body: { messages?: ChatMessage[]; sessionKey?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", message: "We couldn't read that message. Refresh the page and try again." },
      { status: 400 },
    );
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json(
      { error: "message_required", message: "Type a message before sending." },
      { status: 400 },
    );
  }

  const trimmed = messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content || "").slice(0, MAX_CONTENT_LENGTH),
  }));

  const last = trimmed[trimmed.length - 1];
  if (last.role !== "user" || !last.content.trim()) {
    return Response.json(
      { error: "message_required", message: "Type a message before sending." },
      { status: 400 },
    );
  }

  const session = await getSessionUser();
  const sessionKey = body.sessionKey || `web-${Date.now()}`;

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
        }).catch(() => {});
      } catch (err) {
        console.error("[chat persist escalation]", err);
      }
    }

    return streamText(ESCALATION_RESPONSE, {
      "X-Session-Key": sessionKey,
      "X-Escalated": "true",
    });
  }

  const modelName = groqModelName();
  const client = groqClient(apiKey);

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
    const raw = err instanceof Error ? err.message : "";
    const rateLimited = /rate limit|429/i.test(raw);
    const toolFailure = /tool|function/i.test(raw);

    return Response.json(
      {
        error: rateLimited ? "assistant_busy" : toolFailure ? "lookup_failed" : "assistant_unavailable",
        message: rateLimited
          ? "The assistant is busy right now. Please wait a moment and try again."
          : toolFailure
            ? "The assistant couldn't complete that pharmacy lookup. Please try again."
            : "The assistant is temporarily unavailable. Please try again shortly.",
      },
      { status: rateLimited ? 429 : 503 },
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
    }).catch(() => {});
  }
}
