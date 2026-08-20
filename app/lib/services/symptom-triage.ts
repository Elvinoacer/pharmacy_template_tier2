import "server-only";

import Groq from "groq-sdk";
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "groq-sdk/resources/chat/completions";
import { prisma } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { dispatchPushToStaff, dispatchPushToUser } from "@/app/lib/services/push";
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
    label: "Headache & Pain",
    description: "Headache, muscle tension, joint ache, fever",
    starter: "I have a headache or body aches",
  },
  {
    id: "cold_flu",
    label: "Cold, Flu & Cough",
    description: "Cough, congestion, sore throat, feverish",
    starter: "I feel like I have a cold, cough, or flu",
  },
  {
    id: "allergy",
    label: "Allergy & Hay Fever",
    description: "Sneezing, itchy watery eyes, nasal allergies",
    starter: "I think I have allergy or hay fever symptoms",
  },
  {
    id: "stomach",
    label: "Stomach & Digestion",
    description: "Heartburn, acid reflux, cramps, diarrhea, nausea",
    starter: "I have stomach discomfort or digestive issues",
  },
  {
    id: "skin",
    label: "Skin, Rashes & Itch",
    description: "Rash, eczema, itch, insect bite, irritation",
    starter: "I have a skin rash or irritation",
  },
  {
    id: "first_aid",
    label: "Minor Cuts & Burns",
    description: "Superficial cuts, scrapes, minor burns, sprains",
    starter: "I need first aid advice for a minor cut or burn",
  },
  {
    id: "oral",
    label: "Mouth & Dental",
    description: "Mouth ulcers, teething, dry mouth, gum discomfort",
    starter: "I have a mouth ulcer or oral discomfort",
  },
  {
    id: "women_baby",
    label: "Feminine & Baby Care",
    description: "Menstrual cramps, thrush, infant colic, diaper rash",
    starter: "I need guidance on feminine or infant care",
  },
  {
    id: "other",
    label: "Something Else",
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
- Help visitors describe mild, everyday symptoms in a structured way (headache, pain, cold/flu, allergy, stomach/digestion, skin/rashes, minor wounds/burns, oral care, baby/feminine care).
- Ask one clear question at a time when you need more detail.
- Help the visitor determine when their condition is appropriate for self-care (mild, short-term, responding to standard OTC non-prescription measures) and when they should seek medical attention (pharmacist review, GP clinic, or emergency services).
- Suggest only general, evidence-based self-care and non-prescription OTC classes that a community pharmacist might discuss for minor issues (rest, hydration, saline rinses, when OTC options like paracetamol, antacids, or barrier creams might be considered).
- NEVER diagnose disease. NEVER prescribe individual prescription doses. NEVER invent lab results.
- Always frame advice as general educational information, not personal medical diagnosis.
- Direct users to the pharmacy's Self-Care vs Doctor Guide (/health/self-care-guide) or OTC Medicines (/medicines) when helpful.
- Encourage seeing a pharmacist or clinician when unsure.

## Hard safety rules
- If symptoms sound urgent/emergency (chest pain/tightness, severe breathing trouble, anaphylaxis, suicidal thoughts, severe bleeding, sudden worst thunderclap headache, seizures, infant under 3 months with fever, black tarry stools, etc.):
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
- Self-care Guide: /health/self-care-guide
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
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          user: { select: { email: true } },
        },
      },
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
        // Legacy field only — How do you feel never creates Contact enquiries.
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

  // CRM conversation only — NEVER create an Enquiry (those come from /contact).
  // How do you feel is its own life-critical queue at /admin/feel.
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

  await prisma.symptomMessage.create({
    data: {
      sessionId: session.id,
      role: "system",
      content: `Escalated to pharmacy staff (${input.reason}). Pharmacist queue ticket opened — this is not a contact-page enquiry.`,
      metadata: {
        kind: "escalation",
        conversationId: conversation.id,
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
      // Do not set enquiryId — Contact enquiries are a separate product path.
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
        title: "How do you feel — pharmacist requested",
        description: (session.provisionalLabel || session.chiefComplaint || input.reason).slice(
          0,
          200,
        ),
        metadata: {
          symptomSessionId: session.id,
          conversationId: conversation.id,
        },
      },
    }).catch(() => undefined);
  }

  await recordAdminNotification({
    type: "symptom_escalation",
    title: "URGENT: How do you feel — needs pharmacist",
    body: (session.provisionalLabel || session.chiefComplaint || "Visitor requested help").slice(
      0,
      180,
    ),
    severity: "critical",
    relatedType: "symptom_session",
    relatedId: session.id,
  });

  await dispatchPushToStaff({
    title: "URGENT: Symptom needs pharmacist",
    body: (session.provisionalLabel || session.chiefComplaint || "A visitor needs pharmacist review.").slice(
      0,
      140,
    ),
    url: `/admin/feel/${session.id}`,
    data: {
      tag: "symptom-escalation",
      severity: "critical",
      symptomSessionId: session.id,
    },
  }).catch(() => undefined);

  return {
    error: null,
    alreadyEscalated: false as const,
    session: updated,
    ticket: {
      conversationId: conversation.id,
      enquiryId: null as string | null,
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
    // Keep monitoring but flag urgently for staff (push + critical inbox below).
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
    const label = (
      session.provisionalLabel ||
      session.chiefComplaint ||
      session.category ||
      "Symptom check-in"
    ).slice(0, 180);
    const who = session.customerId ? "A customer" : "A visitor";

    // Critical in-app admin inbox (bell + /admin/inbox)
    await recordAdminNotification({
      type: "symptom_checkin",
      title: "URGENT: Feeling worse",
      body: `${who} reports feeling worse — ${label}`,
      severity: "critical",
      relatedType: "symptom_session",
      relatedId: session.id,
    });

    // Background + foreground push to every staff device that enabled notifications
    await dispatchPushToStaff({
      title: "URGENT: Feeling worse",
      body: `${who} feels worse: ${label}`.slice(0, 140),
      url: `/admin/feel/${session.id}`,
      data: {
        tag: "symptom-worse",
        severity: "critical",
        symptomSessionId: session.id,
        feeling: "worse",
      },
    }).catch(() => undefined);

    // Offer escalation path via assistant message
    const offer = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content:
          "Sorry you're feeling worse — we've alerted the pharmacy team. Would you like me to connect you with a pharmacist for personalised advice right now? Tap **Talk to a pharmacist** anytime — or tell me more about what changed. If this is an emergency, call local emergency services immediately.",
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

/**
 * Mark How-do-you-feel admin alerts for a session as read.
 * Called when staff open the thread or resolve it so the sidebar badge clears
 * and room opens for new urgent alerts.
 */
export async function acknowledgeSymptomSessionForStaff(input: {
  sessionId: string;
  staffUserId?: string;
}) {
  const now = new Date();
  await prisma.adminNotification
    .updateMany({
      where: {
        isRead: false,
        relatedId: input.sessionId,
        type: { in: ["symptom_escalation", "symptom_checkin"] },
      },
      data: { isRead: true, readAt: now },
    })
    .catch(() => undefined);

  // Also match rows that only set relatedType without a typed filter miss.
  await prisma.adminNotification
    .updateMany({
      where: {
        isRead: false,
        relatedType: "symptom_session",
        relatedId: input.sessionId,
      },
      data: { isRead: true, readAt: now },
    })
    .catch(() => undefined);

  if (input.staffUserId) {
    await prisma.symptomSession
      .update({
        where: { id: input.sessionId },
        data: { assignedToId: input.staffUserId },
      })
      .catch(() => undefined);
  }
}

/**
 * Resolve a symptom session (optionally with a final staff note).
 * Clears urgent admin alerts so the badge frees room for new cases.
 */
export async function resolveSymptomSession(input: {
  sessionId: string;
  staffUserId: string;
  note?: string;
}) {
  const text = (input.note || "").trim().slice(0, 5000);

  const session = await prisma.symptomSession.findUnique({
    where: { id: input.sessionId },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          user: { select: { id: true } },
        },
      },
    },
  });
  if (!session) return { error: "not_found" as const };
  if (session.status === "closed") return { error: "closed" as const };

  let msg = null;
  if (text) {
    msg = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "staff",
        content: text,
        senderId: input.staffUserId,
        metadata: { kind: "staff_resolve" },
      },
    });
  } else {
    msg = await prisma.symptomMessage.create({
      data: {
        sessionId: session.id,
        role: "system",
        content: "Case marked resolved by pharmacy staff.",
        senderId: input.staffUserId,
        metadata: { kind: "staff_resolve" },
      },
    });
  }

  await prisma.symptomSession.update({
    where: { id: session.id },
    data: {
      status: "resolved",
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
      assignedToId: input.staffUserId,
    },
  });

  if (session.conversationId) {
    if (text) {
      await prisma.message
        .create({
          data: {
            conversationId: session.conversationId,
            direction: "outbound",
            channel: "ai",
            senderType: "staff",
            senderId: input.staffUserId,
            body: text,
            status: "sent",
            metadata: { source: "symptom_triage_resolve", symptomSessionId: session.id },
          },
        })
        .catch(() => undefined);
    }
    await prisma.conversation
      .update({
        where: { id: session.conversationId },
        data: {
          lastMessageAt: new Date(),
          status: "resolved",
          assignedToId: input.staffUserId,
        },
      })
      .catch(() => undefined);
  }

  await acknowledgeSymptomSessionForStaff({
    sessionId: session.id,
    staffUserId: input.staffUserId,
  });

  if (session.customerId && text) {
    const preview = text.length > 140 ? `${text.slice(0, 137)}…` : text;
    const feelUrl = session.customerId || session.userId ? "/portal/feel" : "/how-do-you-feel";
    await prisma.notification
      .create({
        data: {
          customerId: session.customerId,
          userId: session.userId ?? session.customer?.user?.id ?? undefined,
          channel: "in_app",
          type: "symptom_staff_reply",
          title: "Pharmacist closed your check-in",
          body: `Your pharmacist left a final note: ${preview}`,
          fullBody: text,
          status: "delivered",
          sentAt: new Date(),
          relatedType: "symptom_session",
          relatedId: session.id,
        },
      })
      .catch(() => undefined);

    const pushUserId = session.userId ?? session.customer?.user?.id;
    if (pushUserId) {
      await dispatchPushToUser(pushUserId, {
        title: "Pharmacist closed your check-in",
        body: preview.slice(0, 140),
        url: feelUrl,
        data: {
          tag: "symptom-staff-reply",
          severity: "info",
          symptomSessionId: session.id,
        },
      }).catch(() => undefined);
    }
  }

  return { error: null, message: msg };
}

export async function staffReplyToSymptomSession(input: {
  sessionId: string;
  content: string;
  staffUserId: string;
  markResolved?: boolean;
}) {
  const text = input.content.trim().slice(0, 5000);

  // Resolve-only path (no reply text required) — frees the urgent badge.
  if (!text && input.markResolved) {
    return resolveSymptomSession({
      sessionId: input.sessionId,
      staffUserId: input.staffUserId,
    });
  }
  if (!text) return { error: "empty" as const };

  const session = await prisma.symptomSession.findUnique({
    where: { id: input.sessionId },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          user: { select: { id: true } },
        },
      },
    },
  });
  if (!session) return { error: "not_found" as const };

  const msg = await prisma.symptomMessage.create({
    data: {
      sessionId: session.id,
      role: "staff",
      content: text,
      senderId: input.staffUserId,
      metadata: { kind: input.markResolved ? "staff_resolve" : "staff_reply" },
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

  // Staff engaged — clear urgent alerts so the badge only shows new unseen work.
  await acknowledgeSymptomSessionForStaff({
    sessionId: session.id,
    staffUserId: input.staffUserId,
  });

  // Notify the customer (in-app + push). Guests rely on live polling + toast on the feel page.
  const preview = text.length > 140 ? `${text.slice(0, 137)}…` : text;
  const notifTitle = input.markResolved
    ? "Pharmacist closed your check-in"
    : "Pharmacist replied to your check-in";
  const notifBody = input.markResolved
    ? `Your pharmacist left a final note: ${preview}`
    : preview;
  const feelUrl = session.customerId || session.userId ? "/portal/feel" : "/how-do-you-feel";

  if (session.customerId) {
    await prisma.notification
      .create({
        data: {
          customerId: session.customerId,
          userId: session.userId ?? session.customer?.user?.id ?? undefined,
          channel: "in_app",
          type: "symptom_staff_reply",
          title: notifTitle,
          body: notifBody,
          fullBody: text,
          status: "delivered",
          sentAt: new Date(),
          relatedType: "symptom_session",
          relatedId: session.id,
        },
      })
      .catch(() => undefined);

    const pushUserId = session.userId ?? session.customer?.user?.id;
    if (pushUserId) {
      await dispatchPushToUser(pushUserId, {
        title: notifTitle,
        body: notifBody.slice(0, 140),
        url: feelUrl,
        data: {
          tag: "symptom-staff-reply",
          severity: "info",
          symptomSessionId: session.id,
        },
      }).catch(() => undefined);
    }
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
          email: session.customer.user?.email ?? null,
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
