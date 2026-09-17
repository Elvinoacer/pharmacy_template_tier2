import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import {
  searchWorkspace,
  canAccessDestination,
  getDestinationsForRole,
  type WorkspaceRole,
} from "@/app/lib/navigation/workspace-registry";
import { groqApiKey, groqClient, groqModelName } from "@/app/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 30;

type SuggestedAction = {
  label: string;
  href: string;
  description?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.query !== "string") {
      return NextResponse.json({ error: "Missing or invalid query" }, { status: 400 });
    }

    const query = body.query.trim().slice(0, 300);
    const role = (body.role as WorkspaceRole) || (user.role === "customer" ? "portal" : "admin");
    const currentPath = typeof body.currentPath === "string" ? body.currentPath : "";

    if (!query) {
      return NextResponse.json({
        message: "What would you like to do in your workspace?",
        suggestedActions: [],
      });
    }

    // 1. Get deterministic matches matching workspace permissions
    const directMatches = searchWorkspace(query, role, user, currentPath);
    const accessibleDestinations = getDestinationsForRole(role, user);

    let message: string | null = null;
    const suggestedActions: SuggestedAction[] = [];

    // Attempt Groq LLM completion if configured
    const apiKey = groqApiKey();
    if (apiKey) {
      try {
        const client = groqClient(apiKey);
        const completion = await client.chat.completions.create({
          model: groqModelName(),
          temperature: 0.2,
          max_tokens: 350,
          messages: [
            {
              role: "system",
              content: `You are the Aether Workspace Command Assistant for an authenticated healthcare & pharmacy platform.
Role: ${role}
User: ${user.fullName || user.email} (${user.role})
Current screen: ${currentPath || "workspace"}

Provide concise, direct operational guidance (1-2 sentences). Do not use fluff.
Suggest up to 3 exact relevant paths from available destinations:
${accessibleDestinations.slice(0, 40).map((d) => `${d.label}: ${d.href}`).join(", ")}

Respond with JSON strictly in this format:
{"message": "Concise guidance text", "paths": ["/admin/inventory"]}`,
            },
            {
              role: "user",
              content: query,
            },
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
        if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
          message = parsed.message.trim();
        }

        if (Array.isArray(parsed.paths)) {
          for (const path of parsed.paths) {
            const dest = accessibleDestinations.find(
              (d) => d.href === path || path.startsWith(d.href)
            );
            if (dest && canAccessDestination(user, dest)) {
              if (!suggestedActions.some((a) => a.href === dest.href)) {
                suggestedActions.push({
                  label: dest.label,
                  href: dest.href,
                  description: dest.description,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("[Aether Workspace Assist] Groq fallback:", err);
      }
    }

    // Populate actions from deterministic search if not enough from LLM
    for (const match of directMatches) {
      if (suggestedActions.length >= 4) break;
      if (!suggestedActions.some((a) => a.href === match.destination.href)) {
        suggestedActions.push({
          label: match.destination.label,
          href: match.destination.href,
          description: match.destination.description,
        });
      }
    }

    // Default intelligent rule-based message if none from LLM
    if (!message) {
      const topAction = suggestedActions[0];
      if (topAction) {
        message = `To ${query.toLowerCase()}, you can jump straight to ${topAction.label}.`;
      } else {
        message = `I couldn't find a direct match for "${query}". You can browse all tasks from your workspace rail or type a specific keyword.`;
      }
    }

    return NextResponse.json({
      message,
      suggestedActions: suggestedActions.slice(0, 4),
    });
  } catch (error) {
    console.error("[Aether Workspace Assist Error]", error);
    return NextResponse.json(
      { error: "Internal workspace assist error" },
      { status: 500 }
    );
  }
}
