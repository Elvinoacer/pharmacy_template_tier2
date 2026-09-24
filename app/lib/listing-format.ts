export function shelfPrice(value: number | null | undefined, compact = true) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return compact ? "Ask" : "Ask the pharmacy";
  }
  return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

export function joinMeta(parts: Array<string | null | undefined | false>) {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}
