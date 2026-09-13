import "server-only";

import { articles, categories, faqs } from "./data";
import { SUGGESTED_PROMPTS } from "./suggested-prompts";
import type { SessionUser } from "@/app/lib/types";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { getAdherenceStatsForCustomer } from "@/app/lib/services/adherence";
import {
  findRelevantKnowledge,
  formatKnowledgeForPrompt,
} from "@/app/lib/services/ai-knowledge-lookup";
import { listNetworkServiceListings } from "@/app/lib/services/network-catalog";
import { prisma } from "@/app/lib/db";
import { toLocalDateInputValue } from "@/app/lib/time";
import { getResolvedPharmacy } from "@/app/lib/services/pharmacy-settings";

export { SUGGESTED_PROMPTS };

/**
 * Tenant-aware public context. Operational service availability always comes
 * from PharmacyService rows belonging to active, verified, listed pharmacies.
 * Static editorial content is allowed only for non-operational education/FAQ
 * context and must never be treated as proof of availability.
 */
export async function buildPharmacyContext(userQuery?: string): Promise<string> {
  const pharmacy = await getResolvedPharmacy();
  const hours = pharmacy.hours.length
    ? pharmacy.hours.map((h) => `${h.day}: ${h.time}`).join("; ")
    : "Hours not published — contact the pharmacy to confirm";

  const serviceData = await listNetworkServiceListings({
    pharmacySlug: pharmacy.unresolved ? undefined : pharmacy.slug || undefined,
  }).catch(() => ({ services: [], selectedPharmacy: null }));

  const serviceList = serviceData.services.length
    ? serviceData.services
        .map((service) => {
          const price = service.price != null ? ` | KES ${service.price.toLocaleString()}` : "";
          const booking = service.bookable ? " | booking available" : "";
          return `- ${service.title}: ${service.short} | provider: ${service.pharmacy.name}${price}${booking}`;
        })
        .join("\n")
    : "No live pharmacy-published services matched the current context.";

  const faqList = faqs
    .slice(0, 12)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");
  const cats = categories.map((c) => c.title).join(", ");
  const articleTitles = articles.map((a) => a.title).join("; ");

  let relevantKb = "";
  if (userQuery?.trim()) {
    try {
      const snippets = await findRelevantKnowledge(userQuery, 4);
      relevantKb = formatKnowledgeForPrompt(snippets);
    } catch {
      // DB/knowledge lookup failure must not cause invented operational facts.
    }
  }

  const identityWarning = pharmacy.unresolved
    ? "No pharmacy tenant is currently selected. Do not invent a specific address, phone, stock level, opening time, insurance policy, price, or service. You may still help the visitor discover medicines/services across the live network; introduce a specific pharmacy only when a provider is needed to fulfil the request."
    : "Use only the pharmacy facts below for identity/contact/hours. Never substitute network/default pharmacy details.";

  return `
You are Aether Care Assistant, the customer helper for ${pharmacy.unresolved ? "the Aether pharmacy network" : pharmacy.name}.

## Tenant identity rule
${identityWarning}

## Pharmacy facts
- Name: ${pharmacy.unresolved ? "Not selected" : pharmacy.name}
- Tagline: ${pharmacy.unresolved ? "—" : pharmacy.tagline || "—"}
- Description: ${pharmacy.unresolved ? "—" : pharmacy.description || "—"}
- Address: ${pharmacy.unresolved ? "Not selected" : pharmacy.address.full || "Not published"}
- Phone: ${pharmacy.unresolved ? "Not selected" : pharmacy.phone || "Not published"}
- Email: ${pharmacy.unresolved ? "Not selected" : pharmacy.email || "Not published"}
- WhatsApp: ${pharmacy.unresolved ? "Not selected" : pharmacy.whatsapp || "Not published"}
- Hours: ${pharmacy.unresolved ? "Provider-specific; resolve from the chosen result" : hours}
- Insurance accepted: ${pharmacy.unresolved ? "Provider-specific" : pharmacy.insurance.length ? pharmacy.insurance.join(", ") : "Not published"}
- Certifications: ${pharmacy.unresolved ? "Provider-specific" : pharmacy.certifications.length ? pharmacy.certifications.join(", ") : "Not published"}

## Live service catalogue
These entries came from current PharmacyService database rows for active, verified, listed pharmacies. If no tenant is selected, each entry keeps its real provider attached. Do not claim services that are absent from this list.
${serviceList}

## Medicine categories
The following labels are educational/browse vocabulary only, not evidence that a medicine is currently stocked. Use live medication search for availability.
${cats}

## Sample FAQs
FAQ text is general educational guidance. Provider-specific prices, hours, delivery, insurance and policies must be confirmed from live tenant/provider data.
${faqList}

## Health library topics
${articleTitles}
${relevantKb}

## How do you feel?
For mild everyday symptom questions, guide visitors to /how-do-you-feel. Emergencies require emergency services; personal clinical decisions require a pharmacist.

## Tools
1. search_medications — live public catalogue/availability questions.
2. get_medication — one public listing by slug.
3. search_knowledge — approved operational/policy detail.
4. get_medication_counselling — educational medicine-use/counselling information.

Security rules:
- Never invent stock, pack counts, policy, contact details or tenant service availability.
- Never reveal supplier, shelf, purchase price, internal inventory, CRM or another customer's data.
- Never diagnose, prescribe, change a prescription dose or interpret lab results.
- If a clinical decision is needed, escalate to a pharmacist.

## Useful pages
- /health/counselling
- /medicines
- /refill
- /portal
- /caregiver
- /order
- /register
- /login
- /delivery
- /contact
- /services
- /faq
- /health

## Behaviour
1. Be clear and concise.
2. Use live provider/tenant facts for operational claims.
3. Emergencies: direct to emergency services immediately.
4. For refills: /refill, /portal/refills/new, or /caregiver/refills/new as appropriate.
5. Do not force a pharmacy selection before understanding the user's need. Search/discover first, then surface the relevant provider when fulfilment requires one.
6. For product availability, use search_medications before answering.
7. Caregiver data, when enabled, is strictly limited to authorised linked patients and the minimum data needed for the current question.
`.trim();
}

function caregiverClinicalAiEnabled(): boolean {
  // Privacy-first default: detailed clinical context never leaves the app unless
  // an operator has explicitly enabled this processing relationship.
  return process.env.AI_CLINICAL_CONTEXT_ENABLED?.trim().toLowerCase() === "true";
}

function queryNeeds(query: string | undefined, terms: string[]) {
  const q = (query || "").toLowerCase();
  return terms.some((term) => q.includes(term));
}

/**
 * Build minimum-necessary caregiver context. Detailed clinical data is
 * disabled by default and must be explicitly enabled by deployment policy.
 * Even when enabled, only categories relevant to the current query are read.
 */
export async function buildCaregiverPatientContext(
  user: SessionUser,
  userQuery?: string,
): Promise<string> {
  const links = await getActiveCaregiverLinks(user.id);
  if (links.length === 0) return "";

  if (!caregiverClinicalAiEnabled()) {
    return `
## Caregiver privacy boundary
The signed-in user is an authorised caregiver for ${links.length} linked patient${links.length === 1 ? "" : "s"}. Detailed patient medications, adherence, dose logs and refill history are intentionally not sent to the external AI provider in this deployment. For patient-specific clinical information, direct the caregiver to the caregiver portal or a pharmacist. Never infer or invent patient details.
`.trim();
  }

  const needsMedication = queryNeeds(userQuery, ["medicine", "medication", "prescription", "dose", "dosage", "schedule"]);
  const needsRefill = queryNeeds(userQuery, ["refill", "pickup", "ready", "collect"]);
  const needsAdherence = queryNeeds(userQuery, ["adherence", "taken", "missed", "late", "dose log", "streak"]);

  // If the question is not about linked-patient clinical data, disclose only
  // the existence of authorised links—not patient names or health records.
  if (!needsMedication && !needsRefill && !needsAdherence) {
    return `
## Caregiver context
The signed-in user has ${links.length} authorised caregiver link${links.length === 1 ? "" : "s"}. No patient clinical data was included because the current question does not require it. Do not infer patient details.
`.trim();
  }

  const sections = await Promise.all(
    links.map(async (link, index) => {
      const label = `Linked patient ${index + 1}`;
      const [rxs, refills, stats] = await Promise.all([
        needsMedication
          ? prisma.prescription.findMany({
              where: { customerId: link.customerId, status: "active" },
              select: {
                medicineName: true,
                dosage: true,
                schedule: true,
                refillsRemaining: true,
                nextRefillDue: true,
              },
              orderBy: { medicineName: "asc" },
              take: 20,
            })
          : Promise.resolve([]),
        needsRefill
          ? prisma.refillRequest.findMany({
              where: {
                customerId: link.customerId,
                status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] },
              },
              select: { medicineName: true, status: true, createdAt: true },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          : Promise.resolve([]),
        needsAdherence
          ? getAdherenceStatsForCustomer(link.customerId, 14)
          : Promise.resolve(null),
      ]);

      const blocks: string[] = [
        `### ${label} (relationship: ${link.relationship || "caregiver"})`,
        `Permissions: ${link.canRequestRefills ? "refills allowed" : "refills not allowed"}; ${link.canLogAdherence ? "adherence logging allowed" : "adherence logging not allowed"}`,
      ];

      if (needsMedication) {
        blocks.push(
          `Active medications:\n${rxs.length ? rxs.map((r) => `- ${r.medicineName} | dosage: ${r.dosage || "—"} | schedule: ${r.schedule || "—"} | refills: ${r.refillsRemaining ?? 0} | next refill: ${r.nextRefillDue ? toLocalDateInputValue(r.nextRefillDue) : "—"}`).join("\n") : "— none —"}`,
        );
      }
      if (needsRefill) {
        blocks.push(
          `Open refills:\n${refills.length ? refills.map((r) => `- ${r.medicineName}: ${r.status.replace(/_/g, " ")} (${toLocalDateInputValue(r.createdAt)})`).join("\n") : "— none —"}`,
        );
      }
      if (needsAdherence && stats) {
        blocks.push(
          `14-day adherence summary: ${stats.adherenceRate}% (taken ${stats.takenCount}, missed ${stats.missedCount}, late ${stats.lateCount}, streak ${stats.currentStreakDays}d)`,
        );
      }
      return blocks.join("\n\n");
    }),
  );

  return `
## Caregiver context — minimum necessary, authorised links only
Patient names, emails, phone numbers and raw dose-log histories are omitted. Use only the linked-patient data below and only to answer the current question. Never disclose CRM, loyalty, campaigns, unrelated patients or admin operations.

${sections.join("\n\n")}
`.trim();
}
