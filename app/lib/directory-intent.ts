export type DirectoryIntentFacets = {
  cities: string[];
  counties: string[];
  categories: { name: string; slug: string }[];
};

export type DirectoryIntent = {
  searchQuery: string;
  city: string;
  county: string;
  category: string;
  deliveryOnly: boolean;
  visibleStockOnly: boolean;
};

const SEARCH_PREFIXES = [
  /^i\s+(?:need|want)\s+/,
  /^i(?:'m| am)\s+looking\s+for\s+/,
  /^looking\s+for\s+/,
  /^where\s+can\s+i\s+find\s+/,
  /^where\s+is\s+/,
  /^find\s+/,
  /^show\s+me\s+/,
  /^who\s+has\s+/,
  /^which\s+pharmac(?:y|ies)\s+has\s+/,
  /^pharmac(?:y|ies)\s+with\s+/,
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectFacet(input: string, values: string[]) {
  const lower = input.toLowerCase();
  return values.find((value) => lower.includes(value.toLowerCase())) || "";
}

export function parseDirectoryIntent(input: string, facets: DirectoryIntentFacets): DirectoryIntent {
  const city = detectFacet(input, facets.cities);
  const county = detectFacet(input, facets.counties);
  const matchedCategory = facets.categories.find((item) =>
    input.toLowerCase().includes(item.name.toLowerCase()),
  );
  const deliveryOnly = /\b(?:home\s+delivery|delivery|deliver(?:s|ies)?)\b/i.test(input);
  const visibleStockOnly =
    /\b(?:visible|public|available|in)\s+(?:medicine\s+)?stock\b/i.test(input) ||
    /\bstock\s+(?:available|shown|listed)\b/i.test(input);

  let value = input.toLowerCase().replace(/[?!.]/g, " ").replace(/\s+/g, " ").trim();
  for (const prefix of SEARCH_PREFIXES) value = value.replace(prefix, "");

  // Unknown neighbourhoods cannot be applied as a database facet. Preserve
  // the useful medicine/service term rather than searching one literal phrase
  // such as "panadol westlands" in every field.
  if (!city && !county) value = value.replace(/\b(?:near|around|within)\s+[^,]+$/i, " ");

  for (const place of [...facets.cities, ...facets.counties]) {
    value = value.replace(new RegExp(`\\b${escapeRegExp(place)}\\b`, "gi"), " ");
  }
  if (matchedCategory) {
    value = value.replace(new RegExp(`\\b${escapeRegExp(matchedCategory.name)}\\b`, "gi"), " ");
  }

  value = value
    .replace(/\b(?:home\s+delivery|delivery|deliver(?:s|ies)?)\b/g, " ")
    .replace(/\b(?:visible|public|available|in)\s+(?:medicine\s+)?stock\b/g, " ")
    .replace(/\bstock\s+(?:available|shown|listed)\b/g, " ")
    .replace(/\b(?:pharmac(?:y|ies)|shops?|stores?|services?)\b/g, " ")
    .replace(/\b(?:near|around|within|in|with|that|has|have|offers?|offering|for|me|please)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    searchQuery: value,
    city,
    county,
    category: matchedCategory?.slug || "",
    deliveryOnly,
    visibleStockOnly,
  };
}
