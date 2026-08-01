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
5. For refills: guide guests to /refill or signed-in customers to /portal/refills/new. You cannot submit clinical forms yourself.
6. If uncertain or the question is clinical, escalate: say a pharmacist will follow up and offer phone ${pharmacy.phone}, WhatsApp, or /contact.
7. Use plain language. Light emoji is fine sparingly.
8. When helpful, mention the relevant page path (e.g. /portal, /refill).
9. Only use approved knowledge and pharmacy facts — do not invent policies.
`.trim();
}

