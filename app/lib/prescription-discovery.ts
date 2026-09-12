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

/** Require every name/strength token; never treat a different strength as a substitute. */
export function matchesPrescriptionName(
  query: string,
  fields: Array<string | null>,
): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/(\d)\s+(mg|mcg|ml|g|iu)\b/g, "$1$2")
      .replace(/[^a-z0-9./%]+/g, " ")
      .trim();
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const names = fields
    .filter((field): field is string => Boolean(field))
    .map(normalize);
  return (
    tokens.length > 0 &&
    names.some((name) => {
      const available = new Set(name.split(/\s+/));
      const descriptive = new Set([
        "tablet",
        "tablets",
        "capsule",
        "capsules",
        "oral",
        "solution",
        "suspension",
        "syrup",
        "cream",
        "ointment",
        "gel",
        "drops",
        "injection",
        "inhaler",
        "mg",
        "mcg",
        "ml",
        "g",
        "iu",
      ]);
      return (
        tokens.every((token) => available.has(token)) &&
        [...available].every(
          (token) =>
            tokens.includes(token) ||
            descriptive.has(token) ||
            /^\d/.test(token),
        )
      );
    })
  );
}

/** Preserve the listing strength in customer requests and staff queues. */
export function medicineDisplayName(name: string, strength?: string | null): string {
  const clean = strength?.trim();
  if (!clean) return name;
  const compact = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  return compact(name).includes(compact(clean)) ? name : `${name} ${clean}`;
}
