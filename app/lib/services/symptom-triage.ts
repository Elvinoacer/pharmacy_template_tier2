import "server-only";

import Groq from "groq-sdk";
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions";
import { prisma } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { dispatchPushToStaff } from "@/app/lib/services/push";
import { recordAdminNotification } from "@/app/lib/services/admin-notifications";
import { getResolvedPharmacy } from "@/app/lib/services/pharmacy-settings";
import type {
  SymptomFeeling,
  SymptomSessionStatus,
  SymptomSeverity,
} from "@/app/generated/prisma/client";

export const SYMPTOM_CATEGORIES = [
  {
    id: "headache",
    label: "Headache",
    description: "Head pain, pressure, migraine-like symptoms",
    starter: "I have a headache",
  },
  {
    id: "stomach",
    label: "Stomach / digestion",
    description: "Nausea, cramps, indigestion, diarrhoea",
    starter: "I have stomach discomfort",
  },
  {
    id: "cold_flu",
    label: "Cold / flu",
    description: "Cough, congestion, sore throat, feverish",
    starter: "I feel like I have a cold or flu",
  },
  {
    id: "skin",
    label: "Skin / rash",
    description: "Rash, itch, bite, irritation — photos help",
    starter: "I have a skin issue or rash",
  },
  {
    id: "allergy",
    label: "Allergy / hay fever",
    description: "Sneezing, itchy eyes, mild allergic reaction",
    starter: "I think I have allergy symptoms",
  },
  {
    id: "other",
    label: "Something else",
    description: "Describe how you feel in your own words",
    starter: "I'd like to describe how I feel",
  },
] as const;

export type SymptomCategoryId = (typeof SYMPTOM_CATEGORIES)[number]["id"];

const RED_FLAG_PATTERNS = [
  "chest pain",
  "trouble breathing",
  "difficulty breathing",
  "shortness of breath",
  "can't breathe",
  "cannot breathe",
  "overdose",
  "suicidal",
  "self harm",
  "self-harm",
  "anaphylaxis",
  "severe allergic",
  "throat swelling",
  "face swelling",
  "blood in stool",
  "blood in vomit",
  "coughing blood",
  "seizure",
  "unconscious",
  "stroke",
  "worst headache of my life",
  "sudden severe headache",
  "stiff neck and fever",
  "pregnant and bleeding",
  "infant",
  "newborn",
];

const EMERGENCY_RESPONSE =
  "This may need urgent in-person care. If you or someone else could be in danger, call local emergency services now. I am pausing AI guidance and alerting the pharmacy team so a pharmacist can follow up when appropriate. For life-threatening symptoms, do not wait for a reply.";

const ESCALATED_HANDOFF =
  "A pharmacist has been notified and will review this conversation. AI clinical guidance is paused until staff reply. You can still add details or photos for the team.";

function client(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey });
}

function modelName(): string {
  return (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();
}

/** Vision-capable model for image turns (falls back to text model). */
function visionModelName(): string {
  return (
    process.env.GROQ_VISION_MODEL ||
    process.env.GROQ_MODEL ||
    "meta-llama/llama-4-scout-17b-16e-instruct"
  ).trim();
}

export function detectRedFlags(text: string): boolean {
  const lower = text.toLowerCase();
  return RED_FLAG_PATTERNS.some((p) => lower.includes(p));
}

async function buildTriageSystemPrompt(): Promise<string> {
  const pharmacy = await getResolvedPharmacy();
  return `You are the Aether Pharmacy "How do you feel?" triage assistant.

## Role
- Help visitors describe mild, everyday symptoms in a structured way (headache, stomach upset, cold/flu, mild skin issues, allergies).
- Ask one clear question at a time when you need more detail.
- Suggest only general self-care that a community pharmacist might discuss for minor issues (rest, hydration, when OTC options *might* be discussed in-store).
- NEVER diagnose disease. NEVER prescribe doses. NEVER invent lab results.
- Always frame advice as general information, not personal medical advice.
- Encourage seeing a pharmacist or clinician when unsure.

## Hard safety rules
- If symptoms sound urgent/emergency (chest pain, severe breathing trouble, anaphylaxis, suicidal thoughts, severe bleeding, sudden worst headache, seizures, infant under 3 months with fever, etc.):
  1. Tell them to seek emergency care immediately.
  2. Say you are escalating to the pharmacy team.
  3. Do not continue routine self-care advice.
- Do not interpret prescription labels as authority to change doses.
- When images are provided, describe only what is visible cautiously and ask clarifying questions; never claim a definitive diagnosis from a photo.

## Pharmacy
- Name: ${pharmacy.name}
- Phone: ${pharmacy.phone}
- Address: ${pharmacy.address.full}
- Hours: ${pharmacy.hours.map((h) => `${h.day}: ${h.time}`).join("; ")}
- Contact page: /contact
- Talk to pharmacist CTA: ask them if they want pharmacist feedback anytime.

## Output style
- Warm, calm, concise (2–5 short paragraphs or a short list).
- End mild cases with: (1) what to watch for, (2) when to escalate, (3) optional offer to speak with a pharmacist.
- When enough info is gathered for a mild case, you may suggest a short check-in later ("How do you feel now?").

## Structured capture
When useful, silently keep track of: onset, severity 1–10, location, associated symptoms, what they already tried, red flags ruled out. Reflect key points back briefly.`;
}

type SessionAccess = {
  sessionId: string;
  guestKey?: string | null;
};

export async function assertSessionAccess(access: SessionAccess) {
  const session = await prisma.symptomSession.findUnique({
    where: { id: access.sessionId },
  });
  if (!session) return { error: "not_found" as const, session: null };

  const user = await getSessionUser();
  if (user && (user.role === "pharmacist" || user.role === "staff" || user.role === "manager")) {
    return { error: null, session, user, isStaff: true as const };
  }

  if (user?.customerId && session.customerId === user.customerId) {
    return { error: null, session, user, isStaff: false as const };
  }
  if (user?.id && session.userId === user.id) {
    return { error: null, session, user, isStaff: false as const };
  }
  if (access.guestKey && session.guestKey && access.guestKey === session.guestKey) {
    return { error: null, session, user, isStaff: false as const };
  }

  return { error: "forbidden" as const, session: null };
}

export async function createSymptomSession(input: {
  guestKey?: string;
  category?: string;
  chiefComplaint?: string;
}) {
  const user = await getSessionUser();
  const category = input.category?.trim() || null;
  const chief = input.chiefComplaint?.trim() || null;

  const catMeta = SYMPTOM_CATEGORIES.find((c) => c.id === category);
  const welcome =
    catMeta
      ? `Thanks for sharing. You selected **${catMeta.label}**. I'll ask a few short questions to understand what you're feeling — this is not a medical diagnosis.\n\nTo start: how long have you been feeling this way, and how bad is it on a scale of 1–10?`
      : `Hi — I'm here to help you describe how you feel in a structured way, then suggest general next steps for mild issues. I'm not a doctor and I don't diagnose.\n\nWhat's bothering you most right now, and how long has it been going on?`;

  const created = await prisma.symptomSession.create({
    data: {
      guestKey: user?.customerId ? null : input.guestKey || null,
      customerId: user?.customerId ?? null,
      userId: user?.id ?? null,
      category,
      chiefComplaint: chief || catMeta?.starter || null,
      status: "active",
      messageCount: 1,
      lastMessageAt: new Date(),
      nextCheckInAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      messages: {
        create: {
          role: "assistant",
          content: welcome,
          metadata: { kind: "welcome" },
        },
      },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      checkIns: { orderBy: { createdAt: "asc" } },
    },
  });

  return created;
}

export async function getSymptomSessionDetail(sessionId: string) {
  return prisma.symptomSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      checkIns: { orderBy: { createdAt: "asc" } },
      customer: { select: { id: true, fullName: true, phone: true } },
    },
  });
}

function buildUserContent(
  text: string,
  imageUrls: string[],
): string | ChatCompletionContentPart[] {
  const trimmed = text.trim();
  if (!imageUrls.length) return trimmed || "(no text)";

  const parts: ChatCompletionContentPart[] = [];
  if (trimmed) {
    parts.push({ type: "text", text: trimmed });
  } else {
    parts.push({
      type: "text",
      text: "The visitor shared image(s) related to how they feel. Please review carefully and ask clarifying questions. Do not diagnose from photos alone.",
    });
  }
  for (const url of imageUrls.slice(0, 4)) {
    parts.push({
      type: "image_url",
      image_url: { url },
    });
  }
  return parts;
}

async function generateRollingSummary(
  groq: Groq,
  history: { role: string; content: string }[],
): Promise<{ summary: string; provisionalLabel: string | null; severity: SymptomSeverity | null }> {
  try {
    const transcript = history
      .slice(-16)
      .map((m) => `${m.role}: ${m.content.slice(0, 500)}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: modelName(),
      temperature: 0.2,
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `Summarize a pharmacy symptom triage chat for staff. Return strict JSON:
{"summary":"3-6 sentence clinical-style summary of what the visitor reported and what AI suggested","provisionalLabel":"short non-diagnostic phrase e.g. possible tension-type headache symptoms","severity":"mild|moderate|urgent|emergency"}
No markdown. provisionalLabel must never claim a definitive diagnosis.`,
        },
        { role: "user", content: transcript || "No messages yet." },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { summary: raw.slice(0, 800) || "No summary yet.", provisionalLabel: null, severity: null };
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string;
      provisionalLabel?: string;
      severity?: string;
    };
    const sev = parsed.severity;
    const severity: SymptomSeverity | null =
      sev === "mild" || sev === "moderate" || sev === "urgent" || sev === "emergency"
        ? sev
        : null;
    return {
      summary: (parsed.summary || raw).slice(0, 2000),
      provisionalLabel: parsed.provisionalLabel?.slice(0, 120) || null,
      severity,
    };
  } catch (err) {
    console.error("[symptom summary]", err);
    return { summary: "Summary unavailable.", provisionalLabel: null, severity: null };
  }
}

export async function sendSymptomMessage(input: {
  sessionId: string;
  guestKey?: string | null;
  content: string;
  imageUrls?: string[];
  forceEscalate?: boolean;
}) {
  const access = await assertSessionAccess({
    sessionId: input.sessionId,
    guestKey: input.guestKey,
  });
  if (access.error === "not_found") return { error: "not_found" as const };
  if (access.error === "forbidden") return { error: "forbidden" as const };

  const session = access.session!;
  const text = (input.content || "").trim().slice(0, 4000);
  const imageUrls = (input.imageUrls || []).filter(Boolean).slice(0, 4);

  if (!text && imageUrls.length === 0) {
    return { error: "empty" as const };
  }

  // After escalation, AI does not give clinical advice — only acknowledge and wait for staff.
  if (session.status === "escalated" || session.status === "closed") {
    const userMsg = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: text || "(shared image)",
        imageUrls,
      },
    });
    const assistantMsg = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: ESCALATED_HANDOFF,
        metadata: { kind: "post_escalation" },
      },
    });
    await prisma.symptomSession.update({
      where: { id: session.id },
      data: {
        messageCount: { increment: 2 },
        lastMessageAt: new Date(),
      },
    });

    await recordAdminNotification({
      type: "symptom_escalation",
      title: "New message on escalated symptom case",
      body: (text || "Visitor added images/details").slice(0, 180),
      severity: "warning",
      relatedType: "symptom_session",
      relatedId: session.id,
    });

    return {
      error: null,
      escalated: true as const,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      sessionId: session.id,
    };
  }

  const redFlag = detectRedFlags(text) || input.forceEscalate;
  const userMsg = await prisma.symptomMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: text || "(shared image)",
      imageUrls,
    },
  });

  if (redFlag) {
    const assistantMsg = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: EMERGENCY_RESPONSE,
        metadata: { kind: "red_flag" },
      },
    });

    const escalated = await escalateSymptomSession({
      sessionId: session.id,
      reason: input.forceEscalate ? "user_requested_pharmacist" : "red_flag_detected",
      guestKey: input.guestKey,
      skipAccessCheck: true,
    });

    return {
      error: null,
      escalated: true as const,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      sessionId: session.id,
      ticket: escalated.ticket ?? null,
    };
  }

  // Load history for AI
  const history = await prisma.symptomMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const systemPrompt = await buildTriageSystemPrompt();
  const groq = client();
  const hasImages = imageUrls.length > 0 || history.some((m) => m.imageUrls?.length);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const m of history) {
    if (m.role === "user") {
      messages.push({
        role: "user",
        content: buildUserContent(m.content, m.imageUrls || []),
      });
    } else if (m.role === "assistant" || m.role === "staff") {
      messages.push({
        role: "assistant",
        content:
          m.role === "staff"
            ? `[Pharmacist reply]: ${m.content}`
            : m.content,
      });
    } else if (m.role === "system") {
      messages.push({ role: "system", content: m.content });
    }
  }

  let assistantText = "";
  try {
    const completion = await groq.chat.completions.create({
      model: hasImages ? visionModelName() : modelName(),
      messages,
      temperature: 0.4,
      max_completion_tokens: 900,
    });
    assistantText =
      completion.choices[0]?.message?.content?.trim() ||
      "I had trouble forming a reply. Please try again, or ask to speak with a pharmacist.";
  } catch (err) {
    console.error("[symptom chat]", err);
    // Fallback: if vision model fails, retry text-only with image URLs listed.
    try {
      const textOnly: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => {
          if (m.role === "user") {
            const imgNote =
              m.imageUrls?.length > 0
                ? `\n[Attached images: ${m.imageUrls.join(", ")}]`
                : "";
            return {
              role: "user" as const,
              content: `${m.content}${imgNote}`,
            };
          }
          return {
            role: "assistant" as const,
            content: m.content,
          };
        }),
      ];
      const completion = await groq.chat.completions.create({
        model: modelName(),
        messages: textOnly,
        temperature: 0.4,
        max_completion_tokens: 900,
      });
      assistantText =
        completion.choices[0]?.message?.content?.trim() ||
        "Sorry — I could not generate a reply. Please try again.";
    } catch (err2) {
      console.error("[symptom chat fallback]", err2);
      assistantText =
        "Sorry — the assistant is temporarily unavailable. You can try again shortly, or choose **Talk to a pharmacist** for human help.";
    }
  }

  // Soft escalate if model itself signals handoff
  const lowerAssistant = assistantText.toLowerCase();
  const modelWantsEscalation =
    lowerAssistant.includes("speak to a pharmacist") &&
    (lowerAssistant.includes("escalat") ||
      lowerAssistant.includes("not able to") ||
      lowerAssistant.includes("cannot advise") ||
      lowerAssistant.includes("can't advise"));

  const assistantMsg = await prisma.symptomMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: assistantText,
    },
  });

  const summaryBits = await generateRollingSummary(
    groq,
    history
      .map((m) => ({ role: m.role, content: m.content }))
      .concat([
        { role: "user", content: text || "(image)" },
        { role: "assistant", content: assistantText },
      ]),
  );

  const nextStatus: SymptomSessionStatus =
    session.messageCount >= 4 ? "monitoring" : session.status === "active" ? "active" : session.status;

  await prisma.symptomSession.update({
    where: { id: session.id },
    data: {
      messageCount: { increment: 2 },
      lastMessageAt: new Date(),
      aiSummary: summaryBits.summary,
      provisionalLabel: summaryBits.provisionalLabel,
      severity: summaryBits.severity ?? undefined,
      status: nextStatus,
      chiefComplaint: session.chiefComplaint || text.slice(0, 200) || session.chiefComplaint,
      nextCheckInAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });

  if (modelWantsEscalation || summaryBits.severity === "urgent" || summaryBits.severity === "emergency") {
    await escalateSymptomSession({
      sessionId: session.id,
      reason:
        summaryBits.severity === "emergency"
          ? "ai_severity_emergency"
          : summaryBits.severity === "urgent"
            ? "ai_severity_urgent"
            : "ai_requested_handoff",
      guestKey: input.guestKey,
      skipAccessCheck: true,
    });
    return {
      error: null,
      escalated: true as const,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      sessionId: session.id,
    };
  }

  return {
    error: null,
    escalated: false as const,
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    sessionId: session.id,
    summary: summaryBits,
  };
}

export async function escalateSymptomSession(input: {
  sessionId: string;
  reason: string;
  guestKey?: string | null;
  skipAccessCheck?: boolean;
}) {
  if (!input.skipAccessCheck) {
    const access = await assertSessionAccess({
      sessionId: input.sessionId,
      guestKey: input.guestKey,
    });
    if (access.error === "not_found") return { error: "not_found" as const };
    if (access.error === "forbidden") return { error: "forbidden" as const };
  }

  const session = await prisma.symptomSession.findUnique({
    where: { id: input.sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 40 },
      customer: true,
    },
  });
  if (!session) return { error: "not_found" as const };

  if (session.status === "escalated" && session.conversationId) {
    return {
      error: null,
      alreadyEscalated: true as const,
      ticket: {
        conversationId: session.conversationId,
        enquiryId: session.enquiryId,
      },
    };
  }

  const transcript = session.messages
    .map((m) => {
      const imgs = m.imageUrls?.length ? ` [images: ${m.imageUrls.join(", ")}]` : "";
      return `${m.role.toUpperCase()}: ${m.content}${imgs}`;
    })
    .join("\n\n");

  const subject = `How do you feel: ${session.provisionalLabel || session.category || "symptom check-in"}`;
  const bodyIntro = [
    session.aiSummary ? `AI summary:\n${session.aiSummary}` : null,
    session.provisionalLabel ? `Provisional label: ${session.provisionalLabel}` : null,
    `Escalation reason: ${input.reason}`,
    "",
    "Full transcript:",
    transcript.slice(0, 8000),
  ]
    .filter(Boolean)
    .join("\n");

  // Create CRM conversation ticket + enquiry for staff boards
  const conversation = await prisma.conversation.create({
    data: {
      customerId: session.customerId ?? undefined,
      channel: "ai",
      subject: subject.slice(0, 200),
      status: "open",
      lastMessageAt: new Date(),
      messages: {
        create: {
          direction: "inbound",
          channel: "ai",
          senderType: "customer",
          body: bodyIntro.slice(0, 15000),
          subject: subject.slice(0, 200),
          status: "sent",
          metadata: {
            source: "symptom_triage",
            symptomSessionId: session.id,
            reason: input.reason,
          },
        },
      },
    },
  });

  const enquiry = await prisma.enquiry.create({
    data: {
      customerId: session.customerId ?? undefined,
      type: "contact",
      status: "new",
      subject: subject.slice(0, 200),
      message: (session.aiSummary || session.chiefComplaint || bodyIntro).slice(0, 4000),
      name: session.customer?.fullName || "Guest visitor",
      email: undefined,
      phone: session.customer?.phone || undefined,
      source: `symptom_triage:${session.id}`,
    },
  });

  await prisma.symptomMessage.create({
    data: {
      sessionId: session.id,
      role: "system",
      content: `Escalated to pharmacy staff (${input.reason}). Ticket created.`,
      metadata: {
        kind: "escalation",
        conversationId: conversation.id,
        enquiryId: enquiry.id,
      },
    },
  });

  const updated = await prisma.symptomSession.update({
    where: { id: session.id },
    data: {
      status: "escalated",
      escalatedAt: new Date(),
      escalatedReason: input.reason.slice(0, 200),
      conversationId: conversation.id,
      enquiryId: enquiry.id,
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
    },
  });

  if (session.customerId) {
    await prisma.timelineEvent.create({
      data: {
        customerId: session.customerId,
        userId: session.userId ?? undefined,
        eventType: "symptom_escalation",
        title: "Symptom check-in escalated",
        description: (session.provisionalLabel || session.chiefComplaint || input.reason).slice(
          0,
          200,
        ),
        metadata: {
          symptomSessionId: session.id,
          conversationId: conversation.id,
          enquiryId: enquiry.id,
        },
      },
    }).catch(() => undefined);
  }

  await recordAdminNotification({
    type: "symptom_escalation",
    title: "Symptom triage needs pharmacist",
    body: (session.provisionalLabel || session.chiefComplaint || "Visitor requested help").slice(
      0,
      180,
    ),
    severity: "critical",
    relatedType: "symptom_session",
    relatedId: session.id,
  });

  await dispatchPushToStaff({
    title: "Symptom check-in escalated",
    body: (session.provisionalLabel || session.chiefComplaint || "A visitor needs pharmacist review.").slice(
      0,
      140,
    ),
    url: `/admin/feel/${session.id}`,
    data: {
      tag: "symptom-escalation",
      symptomSessionId: session.id,
    },
  }).catch(() => undefined);

  return {
    error: null,
    alreadyEscalated: false as const,
    session: updated,
    ticket: {
      conversationId: conversation.id,
      enquiryId: enquiry.id,
    },
  };
}

export async function recordSymptomCheckIn(input: {
  sessionId: string;
  guestKey?: string | null;
  feeling: SymptomFeeling;
  notes?: string;
  score?: number;
}) {
  const access = await assertSessionAccess({
    sessionId: input.sessionId,
    guestKey: input.guestKey,
  });
  if (access.error === "not_found") return { error: "not_found" as const };
  if (access.error === "forbidden") return { error: "forbidden" as const };

  const session = access.session!;
  const score =
    typeof input.score === "number" && input.score >= 1 && input.score <= 10
      ? Math.round(input.score)
      : null;

  const checkIn = await prisma.symptomCheckIn.create({
    data: {
      sessionId: session.id,
      feeling: input.feeling,
      notes: input.notes?.trim().slice(0, 1000) || null,
      score,
    },
  });

  const systemNote = await prisma.symptomMessage.create({
    data: {
      sessionId: session.id,
      role: "system",
      content: `Check-in: feeling **${input.feeling}**${score ? ` (score ${score}/10)` : ""}${
        input.notes?.trim() ? ` — ${input.notes.trim()}` : ""
      }`,
      metadata: { kind: "check_in", feeling: input.feeling, score },
    },
  });

  let status: SymptomSessionStatus = session.status;
  if (input.feeling === "better" && session.status !== "escalated") {
    status = "monitoring";
  }
  if (input.feeling === "worse" && session.status !== "escalated") {
    // Auto-nudge toward pharmacist
    status = "monitoring";
  }

  await prisma.symptomSession.update({
    where: { id: session.id },
    data: {
      feelingTrend: input.feeling,
      lastCheckInAt: new Date(),
      nextCheckInAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      status,
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
    },
  });

  if (input.feeling === "worse") {
    await recordAdminNotification({
      type: "symptom_checkin",
      title: "Symptom check-in: feeling worse",
      body: (session.provisionalLabel || session.chiefComplaint || "Visitor feels worse").slice(
        0,
        180,
      ),
      severity: "warning",
      relatedType: "symptom_session",
      relatedId: session.id,
    });

    // Offer escalation path via assistant message
    const offer = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content:
          "Sorry you're feeling worse. Would you like me to connect you with a pharmacist for personalised advice? Tap **Talk to a pharmacist** anytime — or tell me more about what changed.",
        metadata: { kind: "worse_offer" },
      },
    });

    await prisma.symptomSession.update({
      where: { id: session.id },
      data: { messageCount: { increment: 1 } },
    });

    return { error: null, checkIn, systemNote, offer, shouldOfferEscalation: true as const };
  }

  if (input.feeling === "better") {
    const offer = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content:
          "Glad you're feeling better. Keep an eye on symptoms, and come back here or visit the pharmacy if anything returns. You can still ask for pharmacist feedback if you'd like peace of mind.",
        metadata: { kind: "better_ack" },
      },
    });
    await prisma.symptomSession.update({
      where: { id: session.id },
      data: { messageCount: { increment: 1 } },
    });
    return { error: null, checkIn, systemNote, offer, shouldOfferEscalation: false as const };
  }

  return { error: null, checkIn, systemNote, shouldOfferEscalation: false as const };
}

export async function staffReplyToSymptomSession(input: {
  sessionId: string;
  content: string;
  staffUserId: string;
  markResolved?: boolean;
}) {
  const text = input.content.trim().slice(0, 5000);
  if (!text) return { error: "empty" as const };

  const session = await prisma.symptomSession.findUnique({ where: { id: input.sessionId } });
  if (!session) return { error: "not_found" as const };

  const msg = await prisma.symptomMessage.create({
    data: {
      sessionId: session.id,
      role: "staff",
      content: text,
      senderId: input.staffUserId,
      metadata: { kind: "staff_reply" },
    },
  });

  await prisma.symptomSession.update({
    where: { id: session.id },
    data: {
      status: input.markResolved ? "resolved" : session.status === "closed" ? "closed" : "escalated",
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
      assignedToId: input.staffUserId,
    },
  });

  // Mirror into CRM conversation if present
  if (session.conversationId) {
    await prisma.message.create({
      data: {
        conversationId: session.conversationId,
        direction: "outbound",
        channel: "ai",
        senderType: "staff",
        senderId: input.staffUserId,
        body: text,
        status: "sent",
        metadata: { source: "symptom_triage_staff_reply", symptomSessionId: session.id },
      },
    }).catch(() => undefined);

    await prisma.conversation.update({
      where: { id: session.conversationId },
      data: {
        lastMessageAt: new Date(),
        status: input.markResolved ? "resolved" : "open",
        assignedToId: input.staffUserId,
      },
    }).catch(() => undefined);
  }

  return { error: null, message: msg };
}

export function serializeSession(
  session: NonNullable<Awaited<ReturnType<typeof getSymptomSessionDetail>>>,
) {
  return {
    id: session.id,
    guestKey: session.guestKey,
    customerId: session.customerId,
    status: session.status,
    category: session.category,
    chiefComplaint: session.chiefComplaint,
    structuredAnswers: session.structuredAnswers,
    aiSummary: session.aiSummary,
    provisionalLabel: session.provisionalLabel,
    severity: session.severity,
    feelingTrend: session.feelingTrend,
    escalatedAt: session.escalatedAt?.toISOString() ?? null,
    escalatedReason: session.escalatedReason,
    conversationId: session.conversationId,
    enquiryId: session.enquiryId,
    lastCheckInAt: session.lastCheckInAt?.toISOString() ?? null,
    nextCheckInAt: session.nextCheckInAt?.toISOString() ?? null,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    customer: session.customer
      ? {
          id: session.customer.id,
          fullName: session.customer.fullName,
          phone: session.customer.phone,
        }
      : null,
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      imageUrls: m.imageUrls,
      senderId: m.senderId,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    })),
    checkIns: session.checkIns.map((c) => ({
      id: c.id,
      feeling: c.feeling,
      notes: c.notes,
      score: c.score,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}
