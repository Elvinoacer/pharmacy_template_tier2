import "server-only";

import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import {
  getPublicMedicationBySlug,
  searchPublicMedications,
} from "@/app/lib/services/ai-medication-lookup";
import { searchKnowledgeArticles } from "@/app/lib/services/ai-knowledge-lookup";
import { generateDynamicCounsellingProfile } from "@/app/lib/medication-counselling";
import { getMedicationCounsellingBySlug } from "@/app/lib/services/medication-counselling-db";

/** Max tool invocations per user turn (security + cost). */
export const MAX_TOOL_ROUNDS = 3;
export const MAX_TOOL_CALLS_PER_ROUND = 3;

/**
 * Tools exposed to the pharmacy assistant.
 * Every handler is public-safe: no internal inventory, CRM, or confidential data.
 */
export const AI_CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_medications",
      description:
        "Search the pharmacy's public medicine catalogue for availability, price, and OTC/prescription notes. Use when the customer asks if a drug/product is stocked, available, or how much it costs. Only returns publicly listed products — never invent stock.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Medicine name, brand, or generic (e.g. 'panadol', 'paracetamol', 'amoxicillin').",
          },
          limit: {
            type: "integer",
            description: "Max results to return (1–8). Default 5.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_medication",
      description:
        "Get one publicly listed medicine by its URL slug (from a previous search result). Use to confirm availability or price for a specific product.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Pharmacy product slug, e.g. 'panadol-extra-500mg'.",
          },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description:
        "Search approved pharmacy knowledge articles (policies, delivery, insurance, services). Use when the answer is not in the pharmacy facts already provided and you need a specific policy detail.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Topic to look up, e.g. 'delivery fees', 'insurance', 'flu vaccine'.",
          },
          limit: {
            type: "integer",
            description: "Max articles (1–6). Default 4.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_medication_counselling",
      description:
        "Retrieve official 12-pillar patient medication counselling information (administration technique, timing, food rules, storage, special dosage forms, expected side effects, missed-dose instructions, device guides, safe handling, and when to seek medical attention). Use whenever the patient asks how to take a medication, what to do if a dose is missed, food interactions, or side effect management.",
      parameters: {
        type: "object",
        properties: {
          medication: {
            type: "string",
            description: "Medication name or generic active ingredient (e.g. 'amoxicillin', 'metformin', 'salbutamol', 'paracetamol', 'amlodipine').",
          },
        },
        required: ["medication"],
      },
    },
  },
];

type ToolArgs = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(1, Math.floor(n)), max);
}

function parseArgs(raw: string): ToolArgs {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ToolArgs;
    }
  } catch {
    /* model sometimes emits invalid JSON */
  }
  return {};
}

/**
 * Execute a single tool call. Always returns a JSON string for the model.
 * Unknown tools and failures return structured errors (no stack traces).
 */
export async function executeAiTool(
  name: string,
  rawArguments: string,
): Promise<string> {
  const args = parseArgs(rawArguments);

  try {
    switch (name) {
      case "search_medications": {
        const query = asString(args.query).trim();
        if (query.length < 2) {
          return JSON.stringify({
            error: "query_too_short",
            message: "Provide at least 2 characters to search medications.",
            results: [],
          });
        }
        const limit = asLimit(args.limit, 5, 8);
        const data = await searchPublicMedications(query, limit);
        return JSON.stringify({
          ...data,
          note:
            data.count === 0
              ? "No public listings matched. Suggest /medicines search, /contact, or /order for an availability enquiry. Do not invent stock."
              : "Availability is coarse (in_stock / low_stock / out_of_stock). Do not claim exact pack counts. Availability is operational info, not medical advice.",
        });
      }

      case "get_medication": {
        const slug = asString(args.slug).trim();
        if (!slug) {
          return JSON.stringify({
            error: "slug_required",
            message: "A product slug is required.",
            result: null,
          });
        }
        const result = await getPublicMedicationBySlug(slug);
        return JSON.stringify({
          result,
          note: result
            ? "Public listing only. Availability is not medical advice."
            : "Not found or not publicly listed. Offer /contact or /order for staff to check.",
        });
      }

      case "search_knowledge": {
        const query = asString(args.query).trim();
        if (query.length < 2) {
          return JSON.stringify({
            error: "query_too_short",
            message: "Provide at least 2 characters to search knowledge.",
            results: [],
          });
        }
        const limit = asLimit(args.limit, 4, 6);
        const data = await searchKnowledgeArticles(query, limit);
        return JSON.stringify({
          ...data,
          note:
            data.count === 0
              ? "No approved articles matched. Use pharmacy facts if relevant, or escalate to staff — do not invent policies."
              : "Answer only from these approved articles plus pharmacy facts.",
        });
      }

      case "get_medication_counselling": {
        const medName = asString(args.medication).trim();
        if (!medName) {
          return JSON.stringify({
            error: "medication_required",
            message: "Please specify a medication name.",
          });
        }

        const profile =
          (await getMedicationCounsellingBySlug(medName)) ||
          generateDynamicCounsellingProfile(medName, medName, "general");

        return JSON.stringify({
          medication: profile.brandNames[0],
          genericName: profile.genericName,
          category: profile.categoryName,
          standardDosage: profile.standardDosageSummary,
          howToTake: profile.howToTake,
          whenToTake: profile.whenToTake,
          howOftenToTake: profile.howOftenToTake,
          foodAndDrink: profile.foodAndDrink,
          storage: profile.storage,
          specialDosageForm: profile.specialDosageForm,
          sideEffects: profile.sideEffects,
          missedDose: profile.missedDose,
          courseCompletion: profile.courseCompletion,
          device: profile.device,
          safeHandling: profile.safeHandling,
          whenToReturn: profile.whenToReturn,
          hubUrl: `/health/counselling/${profile.medicineKey}`,
          note: "Present these official 12-pillar counselling points clearly and conversationally. Always remind patients that in emergencies in Kenya they must call 999 / 112 or their physician.",
        });
      }

      default:
        return JSON.stringify({
          error: "unknown_tool",
          message: `Tool "${name}" is not available.`,
        });
    }
  } catch (err) {
    console.error(`[ai-tools] ${name}`, err);
    return JSON.stringify({
      error: "tool_failed",
      message: "Lookup failed. Ask the customer to try again or contact the pharmacy.",
    });
  }
}
