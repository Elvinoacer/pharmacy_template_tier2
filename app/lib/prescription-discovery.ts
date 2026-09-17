/** Shared limits and conservative matching for prescription discovery. */
export const MAX_PRESCRIPTION_MEDICINES = 12;

export function prescriptionNames(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/\n/)
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

const DESCRIPTIVE_TERMS = new Set([
  "tablet",
  "tablets",
  "tab",
  "tabs",
  "capsule",
  "capsules",
  "cap",
  "caps",
  "caplet",
  "caplets",
  "pill",
  "pills",
  "oral",
  "solution",
  "suspension",
  "susp",
  "syrup",
  "syr",
  "cream",
  "ointment",
  "gel",
  "drops",
  "injection",
  "inj",
  "inhaler",
  "spray",
  "infusion",
  "lotion",
  "suppository",
  "suppositories",
  "effervescent",
  "dispersible",
  "chewable",
  "sachet",
  "sachets",
  "powder",
  "mg",
  "mcg",
  "ml",
  "g",
  "iu",
  "units",
]);

const PRODUCT_EXTENSIONS = new Set([
  "extra",
  "advance",
  "advanced",
  "plus",
  "forte",
  "actifast",
  "fast",
  "rapid",
  "ultra",
  "max",
  "maximum",
  "regular",
  "original",
  "classic",
  "express",
  "relief",
  "care",
  "comfort",
  "night",
  "day",
  "pm",
  "am",
  "pro",
  "optizorb",
  "retard",
  "duo",
  "junior",
  "infant",
  "adult",
  "children",
  "kids",
  "pediatric",
  "sugarfree",
  "free",
  "bd",
  "cr",
  "sr",
  "er",
  "mr",
  "la",
  "aqueous",
  "evohaler",
  "accuhaler",
  "diskus",
  "turbohaler",
  "respimat",
]);

export type MatchCategory = "exact" | "likely" | "alternative" | "none";

export type PrescriptionMatchClassification = {
  match: boolean;
  kind: MatchCategory;
  score: number;
};

function normalizePrescriptionString(value: string): string {
  return value
    .toLowerCase()
    .replace(/(\d)\s+(mg|mcg|ml|g|iu)\b/g, "$1$2")
    .replace(/[^a-z0-9./%]+/g, " ")
    .trim();
}

/** Classify clinical prescription matches: exact clinical match, likely product match, or none. */
export function classifyPrescriptionMatch(
  query: string,
  fields: Array<string | null>,
): PrescriptionMatchClassification {
  const queryNorm = normalizePrescriptionString(query);
  const tokens = queryNorm.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { match: false, kind: "none", score: 0 };

  const names = fields
    .filter((field): field is string => Boolean(field))
    .map(normalizePrescriptionString);

  let bestMatch: PrescriptionMatchClassification = { match: false, kind: "none", score: 0 };

  for (const name of names) {
    const available = new Set(name.split(/\s+/));

    // Every token in query must exist in candidate
    const hasAllTokens = tokens.every((token) => available.has(token));
    if (!hasAllTokens) continue;

    // Check tokens in available candidate that were not explicitly queried
    const extraTokens = [...available].filter((token) => !tokens.includes(token));

    // All extra tokens must either be descriptive forms/routes, numbers/strengths, or recognized product extensions
    const allValid = extraTokens.every(
      (token) =>
        DESCRIPTIVE_TERMS.has(token) ||
        PRODUCT_EXTENSIONS.has(token) ||
        /^\d/.test(token),
    );

    if (!allValid) {
      // Contains unknown active ingredients or different drug compounds (e.g. clavulanate)
      continue;
    }

    const hasExtension = extraTokens.some((token) => PRODUCT_EXTENSIONS.has(token));

    if (!hasExtension) {
      // Exact clinical match (e.g. "Panadol 500mg" vs "Panadol 500mg tablets")
      return { match: true, kind: "exact", score: 100 };
    } else {
      // Likely product match (e.g. "Panadol" vs "Panadol Extra")
      if (bestMatch.score < 80) {
        bestMatch = { match: true, kind: "likely", score: 80 };
      }
    }
  }

  return bestMatch;
}

/** Require every name/strength token; allows valid product extensions while maintaining clinical safety. */
export function matchesPrescriptionName(
  query: string,
  fields: Array<string | null>,
): boolean {
  const classification = classifyPrescriptionMatch(query, fields);
  return classification.match;
}

/** Preserve the listing strength in customer requests and staff queues. */
export function medicineDisplayName(name: string, strength?: string | null): string {
  const clean = strength?.trim();
  if (!clean) return name;
  const compact = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  return compact(name).includes(compact(clean)) ? name : `${name} ${clean}`;
}
