import Groq from "groq-sdk";
import { buildPharmacyContext } from "../../lib/chat-context";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { dispatchPushToStaff } from "@/app/lib/services/push";

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

    return new Response(ESCALATION_RESPONSE, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Session-Key": sessionKey,
        "X-Escalated": "true",
      },
    });
  }

  const modelName = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();
  const client = new Groq({ apiKey });
  const systemPrompt = await buildPharmacyContext();

  try {
    const stream = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: "system", content: systemPrompt }, ...trimmed],
      temperature: 0.7,
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
            try {
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
                    eventType: "ai_conversation",
                    title: escalated ? "AI conversation escalated" : "AI conversation",
                    description: last.content.slice(0, 120),
                    metadata: { conversationId, escalated },
                  },
                });
              }

              if (escalated) {
                await dispatchPushToStaff({
                  title: "AI conversation escalated",
                  body: last.content.slice(0, 140) || "The assistant handed off to a pharmacist.",
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
            } catch (err) {
              console.error("[chat persist assistant]", err);
            }
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
