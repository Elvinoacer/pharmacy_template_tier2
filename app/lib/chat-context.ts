import "server-only";

import {
  articles,
  categories,
  faqs,
  pharmacy,
  services,
  team,
} from "./data";
import { SUGGESTED_PROMPTS } from "./suggested-prompts";
import type { SessionUser } from "@/app/lib/types";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { getAdherenceStatsForCustomer } from "@/app/lib/services/adherence";
import {
  findRelevantKnowledge,
  formatKnowledgeForPrompt,
} from "@/app/lib/services/ai-knowledge-lookup";
import { prisma } from "@/app/lib/db";
import { toLocalDateInputValue } from "@/app/lib/time";

export { SUGGESTED_PROMPTS };

/**
 * Compact always-on context for the AI assistant.
 * Does NOT dump the full knowledge base or medication catalogue —
 * those are retrieved per-query (relevant snippets + tools).
 */
export async function buildPharmacyContext(userQuery?: string): Promise<string> {
  const hours = pharmacy.hours.map((h) => `${h.day}: ${h.time}`).join("; ");
  const serviceList = services.map((s) => `- ${s.title}: ${s.short}`).join("\n");
  const faqList = faqs
    .slice(0, 12)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
  const teamList = team.map((t) => `${t.name} (${t.role})`).join("; ");
  const cats = categories.map((c) => c.title).join(", ");
  const articleTitles = articles.map((a) => a.title).join("; ");

  let relevantKb = "";
  if (userQuery?.trim()) {
    try {
      const snippets = await findRelevantKnowledge(userQuery, 4);
      relevantKb = formatKnowledgeForPrompt(snippets);
    } catch {
      // DB may be unavailable; fall back to static context only
    }
  }

  return `
You are Aether Care Assistant, the friendly AI helper for ${pharmacy.name}.

## Pharmacy facts (use these; do not invent different hours, address, or phone)
- Name: ${pharmacy.name}
- Tagline: ${pharmacy.tagline}
- Description: ${pharmacy.description}
- Address: ${pharmacy.address.full}
- Phone: ${pharmacy.phone}
- Email: ${pharmacy.email}
- WhatsApp: available at the same number
- Hours: ${hours}
- Insurance accepted: ${pharmacy.insurance.join(", ")}
- Certifications: ${pharmacy.certifications.join(", ")}
- Team: ${teamList}

## Services
${serviceList}

## Medicine categories (browse at /medicines — use tools for live stock)
${cats}

## Sample FAQs
${faqList}

## Health library topics
${articleTitles}
${relevantKb}

## How do you feel?
For mild everyday symptom questions (headache, stomach upset, cold, mild rash), gently point visitors to the guided check-in at /how-do-you-feel — structured questions, optional photos, check-ins over time, and pharmacist handoff. Still apply safety rules: emergencies → emergency services; personal clinical decisions → pharmacist.

## Tools (use when needed — never invent stock or policies)
You have tools that query live, public-safe data only:
1. search_medications — when the customer asks if a product/drug is available, in stock, listed, or its price.
2. get_medication — when you already have a product slug and need a single public listing.
3. search_knowledge — when you need an approved policy/detail not already in this prompt.
4. get_medication_counselling — when the customer asks how to take a medicine, missed dose guidance, food interactions, device usage (inhaler, spacer, eye drops, glucometer, insulin), storage, side effects, or when to return to a doctor.

Security rules for tools:
- Only public catalogue rows are returned. If a tool returns no results, say so and offer /medicines, /order, /contact — do NOT invent availability.
- Availability is coarse: in_stock, low_stock, or out_of_stock. Never invent pack counts.
- Tool data is operational (stock/price/listing) and educational counselling. Never modify prescribed dosages or diagnose serious illness.
- Never reveal internal fields (supplier, shelf, purchase price, full inventory, other customers).

## Website & portal actions you can suggest
- Digital Medication Counselling Hub: /health/counselling
- Browse public medicines: /medicines
- Request a refill (guest): /refill
- Customer portal (signed-in refills, caregivers, loyalty, counselling): /portal
- Caregiver portal (manage medications for a family member): /caregiver
- Place / enquire about an order: /order
- Create account: /register
- Sign in: /login
- Delivery enquiry: /delivery
- Contact form: /contact
- Services: /services
- FAQ: /faq
- Health library: /health
- Careers: /careers

## Behaviour rules
1. Be warm, clear, and concise (2–4 short paragraphs max unless the user asks for detail).
2. Answer questions about hours, location, services, refills, delivery, insurance, and general wellness using the facts and relevant approved knowledge above.
3. You are NOT a doctor. Never diagnose, prescribe, recommend specific medication for a symptom, modify prescriptions, interpret lab results, or make clinical decisions.
4. Emergencies (chest pain, severe allergic reaction, overdose, trouble breathing): tell them to call emergency services immediately.
5. For refills: guide guests to /refill or signed-in customers to /portal/refills/new. Caregivers should use /caregiver/refills/new. You cannot submit clinical forms yourself.
6. If uncertain or the question is clinical, escalate: say a pharmacist will follow up and offer phone ${pharmacy.phone}, WhatsApp, or /contact.
7. Use plain language. Light emoji is fine sparingly.
8. When helpful, mention the relevant page path (e.g. /portal, /refill, /medicines/slug).
9. Only use approved knowledge, pharmacy facts, and tool results — do not invent policies or stock.
10. If the caller is a caregiver, you may answer questions about patients linked to them (medications, adherence, refill status). You may NOT reveal information about other customers, the pharmacy's CRM, loyalty, segmentation, or admin operations.
11. For product availability questions, call search_medications before answering. Quote tool results honestly; link to the product path when present.
`.trim();
}

/**
 * Build a caregiver-scoped context with the patient data the caregiver is
 * authorised to see: active prescriptions, recent adherence stats, open
 * refill requests, and today's scheduled doses. This is appended to the
 * base pharmacy context when the caller is an active caregiver.
 *
 * The AI must ONLY answer questions about patients listed here. Questions
 * about other customers, the pharmacy's broader customer base, or admin
 * operations must be refused with an offer to escalate.
 */
export async function buildCaregiverPatientContext(user: SessionUser): Promise<string> {
  const links = await getActiveCaregiverLinks(user.id);
  if (links.length === 0) return "";

  const sections = await Promise.all(
    links.map(async (link) => {
      const [rxs, refills, stats, recentDoseLogs] = await Promise.all([
        prisma.prescription.findMany({
          where: { customerId: link.customerId, status: "active" },
          select: {
            id: true,
            medicineName: true,
            dosage: true,
            schedule: true,
            refillsRemaining: true,
            nextRefillDue: true,
          },
          orderBy: { medicineName: "asc" },
        }),
        prisma.refillRequest.findMany({
          where: {
            customerId: link.customerId,
            status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] },
          },
          select: { id: true, medicineName: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        getAdherenceStatsForCustomer(link.customerId, 14),
        prisma.doseLog.findMany({
          where: {
            customerId: link.customerId,
            scheduledDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          include: { prescription: { select: { medicineName: true } } },
          orderBy: { scheduledDate: "desc" },
          take: 14,
        }),
      ]);

      const meds = rxs.map((r) =>
        `- ${r.medicineName} | dosage: ${r.dosage || "—"} | schedule: ${r.schedule || "—"} | refills: ${r.refillsRemaining ?? 0} | next refill: ${r.nextRefillDue ? toLocalDateInputValue(r.nextRefillDue) : "—"}`,
      ).join("\n");

      const openRefills = refills.map((r) =>
        `- ${r.medicineName}: ${r.status.replace(/_/g, " ")} (submitted ${toLocalDateInputValue(r.createdAt)})`,
      ).join("\n");

      const recentDoses = recentDoseLogs.map((d) =>
        `- ${d.prescription.medicineName} on ${toLocalDateInputValue(d.scheduledDate)}${d.scheduledTime ? ` ${d.scheduledTime}` : ""}: ${d.status} (by ${d.recordedBy})`,
      ).join("\n");

      return `### Patient: ${link.customer.fullName} (relationship: ${link.relationship || "caregiver"})
Permissions: ${link.canRequestRefills ? "can request refills" : "no refill requests"} · ${link.canLogAdherence ? "can log adherence" : "no adherence logging"} · ${link.canReceivePickupNotifications ? "receives pickup alerts" : "no pickup alerts"}

Active medications:
${meds || "— none —"}

Open refill requests:
${openRefills || "— none —"}

14-day adherence: ${stats.adherenceRate}% (taken ${stats.takenCount}, missed ${stats.missedCount}, late ${stats.lateCount}, streak ${stats.currentStreakDays}d)

Recent dose logs (last 7 days):
${recentDoses || "— none —"}`;
    }),
  );

  return `
## Caregiver context — authorised patients only
You are speaking to a caregiver (${user.email}). You may ONLY discuss the patients listed below. If asked about any other customer, the pharmacy's broader customer base, CRM notes, loyalty, campaigns, or admin operations, refuse and offer to escalate to staff.

${sections.join("\n\n")}
`.trim();
}
