import Groq from "groq-sdk";
import { buildPharmacyContext } from "../../lib/chat-context";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

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

  let body: { messages?: ChatMessage[] };
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

  const modelName = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();
  const client = new Groq({ apiKey });

  try {
    const stream = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: buildPharmacyContext() },
        ...trimmed,
      ],
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 0.9,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          console.error("[chat stream]", err);
          controller.enqueue(encoder.encode("\n\nSorry — the response was interrupted. Please try again."));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("[chat]", err);
    const message = err?.message || "Failed to reach Groq";

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
