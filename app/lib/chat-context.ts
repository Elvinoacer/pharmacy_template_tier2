import "server-only";

import {
  articles,
  categories,
  faqs,
  pharmacy,
  services,
  team,
} from "./data";
import { prisma } from "@/app/lib/db";
import { SUGGESTED_PROMPTS } from "./suggested-prompts";
import type { SessionUser } from "@/app/lib/types";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { getAdherenceStatsForCustomer } from "@/app/lib/services/adherence";

export { SUGGESTED_PROMPTS };

/** Compact knowledge base for the AI assistant (Tier 1 facts + approved CRM knowledge). */
export async function buildPharmacyContext(): Promise<string> {
  const hours = pharmacy.hours.map((h) => `${h.day}: ${h.time}`).join("; ");
  const serviceList = services.map((s) => `- ${s.title}: ${s.short}`).join("\n");
  const faqList = faqs
    .slice(0, 12)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
  const teamList = team.map((t) => `${t.name} (${t.role})`).join("; ");
  const cats = categories.map((c) => c.title).join(", ");
  const articleTitles = articles.map((a) => a.title).join("; ");

  let approvedKb = "";
  try {
    const articlesKb = await prisma.knowledgeArticle.findMany({
      where: { isApproved: true },
      orderBy: [{ priority: "desc" }, { title: "asc" }],
    });
    if (articlesKb.length) {
      approvedKb =
        "\n\n## Approved knowledge base (CRM — prefer these answers)\n" +
        articlesKb
          .map((a) => `### ${a.title} [${a.category}]\n${a.content}`)
          .join("\n\n");
    }
  } catch {
    // DB may be unavailable during build; fall back to static context only
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

## Medicine categories (informational only — no online checkout)
${cats}

## Sample FAQs
${faqList}

## Health library topics
${articleTitles}
${approvedKb}

## Website & portal actions you can suggest
- Request a refill (guest): /refill
- Customer portal (signed-in refills, caregivers, loyalty): /portal
- Caregiver portal (manage medications for a family member): /caregiver
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
2. Answer questions about hours, location, services, refills, delivery, insurance, and general wellness using the facts and approved knowledge above.
3. You are NOT a doctor. Never diagnose, prescribe, recommend specific medication, modify prescriptions, interpret lab results, or make clinical decisions.
4. Emergencies (chest pain, severe allergic reaction, overdose, trouble breathing): tell them to call emergency services immediately.
5. For refills: guide guests to /refill or signed-in customers to /portal/refills/new. Caregivers should use /caregiver/refills/new. You cannot submit clinical forms yourself.
6. If uncertain or the question is clinical, escalate: say a pharmacist will follow up and offer phone ${pharmacy.phone}, WhatsApp, or /contact.
7. Use plain language. Light emoji is fine sparingly.
8. When helpful, mention the relevant page path (e.g. /portal, /refill).
9. Only use approved knowledge and pharmacy facts — do not invent policies.
10. If the caller is a caregiver, you may answer questions about patients linked to them (medications, adherence, refill status). You may NOT reveal information about other customers, the pharmacy's CRM, loyalty, segmentation, or admin operations.
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
        `- ${r.medicineName} | dosage: ${r.dosage || "—"} | schedule: ${r.schedule || "—"} | refills: ${r.refillsRemaining ?? 0} | next refill: ${r.nextRefillDue ? r.nextRefillDue.toISOString().slice(0, 10) : "—"}`,
      ).join("\n");

      const openRefills = refills.map((r) =>
        `- ${r.medicineName}: ${r.status.replace(/_/g, " ")} (submitted ${r.createdAt.toISOString().slice(0, 10)})`,
      ).join("\n");

      const recentDoses = recentDoseLogs.map((d) =>
        `- ${d.prescription.medicineName} on ${d.scheduledDate.toISOString().slice(0, 10)}${d.scheduledTime ? ` ${d.scheduledTime}` : ""}: ${d.status} (by ${d.recordedBy})`,
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
