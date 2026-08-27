import { groqApiKey, groqClient, groqModelName } from "@/app/lib/groq";
import { getDirectoryFacets, listPharmacyDirectory } from "@/app/lib/services/pharmacy-directory";

export const runtime = "nodejs";
export const maxDuration = 30;

function detectFacet(input: string, values: string[]) {
  const lower = input.toLowerCase();
  return values.find((value) => lower.includes(value.toLowerCase())) || "";
}

function normalizeSearchQuery(input: string, facets: { cities: string[]; counties: string[]; categories: { name: string }[] }) {
  let value = input.toLowerCase().replace(/[?!.]/g, " ").replace(/\s+/g, " ").trim();

  const prefixes = [
    /^i\s+(?:need|want)\s+/,
    /^i(?:'m| am)\s+looking\s+for\s+/,
    /^looking\s+for\s+/,
    /^where\s+can\s+i\s+find\s+/,
    /^where\s+is\s+/,
    /^find\s+/,
    /^show\s+me\s+/,
    /^who\s+has\s+/,
    /^which\s+pharmacy\s+has\s+/,
    /^pharmacies?\s+with\s+/,
  ];

  for (const prefix of prefixes) value = value.replace(prefix, "");

  const removablePhrases = [
    /\bnear\b/g,
    /\baround\b/g,
    /\bin\b/g,
    /\bwithin\b/g,
    /\bpharmacy\b/g,
    /\bpharmacies\b/g,
    /\bshop\b/g,
    /\bstore\b/g,
  ];

  for (const phrase of removablePhrases) value = value.replace(phrase, " ");

  for (const place of [...facets.cities, ...facets.counties]) {
    value = value.replace(new RegExp(`\\b${place.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "gi"), " ");
  }

  for (const category of facets.categories) {
    value = value.replace(new RegExp(`\\b${category.name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "gi"), category.name);
  }

  value = value.replace(/\s+/g, " ").trim();
  return value || input.trim();
}

function fallbackAnswer(count: number) {
  return count > 0
    ? `I found ${count} public pharmacy match${count === 1 ? "" : "es"}. Choose a pharmacy below to continue.`
    : "I couldn't find a public pharmacy match. Try another medicine, category or area.";
}

export async function POST(request: Request) {
  if (!groqApiKey()) {
    return Response.json({ error: "AI directory search is not configured." }, { status: 503 });
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = String(body.query || "").trim().slice(0, 300);
  if (query.length < 2) {
    return Response.json(
      { error: "Tell me what medicine, category or area you are looking for." },
      { status: 400 },
    );
  }

  try {
    const facets = await getDirectoryFacets();
    const city = detectFacet(query, facets.cities);
    const county = detectFacet(query, facets.counties);
    const category =
      facets.categories.find((item) => query.toLowerCase().includes(item.name.toLowerCase()))?.slug || "";
    const searchQuery = normalizeSearchQuery(query, facets);

    const results = await listPharmacyDirectory({
      q: searchQuery,
      city: city || undefined,
      county: county || undefined,
      category: category || undefined,
    });

    const top = results.slice(0, 8).map((pharmacy) => ({
      name: pharmacy.name,
      slug: pharmacy.slug,
      city: pharmacy.city,
      county: pharmacy.county,
      featured: pharmacy.featured,
      stockCount: pharmacy.stockCount,
      otcCount: pharmacy.otcCount,
      services: pharmacy.services.slice(0, 4),
      categories: pharmacy.topCategories.slice(0, 4),
      delivery: pharmacy.hasDelivery,
      medicineMatch: pharmacy.hasSearchedMedicine,
      medicineMatches: pharmacy.searchedMedicineCount,
    }));

    let answer = fallbackAnswer(top.length);

    try {
      const prompt = `You are Aether's pharmacy directory assistant. The user is searching for a pharmacy, medicine, category, or service. You MUST only summarize the supplied live public results. Never invent stock, prices, opening hours, diagnoses, doses, or medical advice. If there are no results, say no public match was found and suggest changing the search or choosing another area. Keep the answer to 2 short sentences maximum. Tell the user to choose a pharmacy from the result cards below.`;
      const completion = await groqClient().chat.completions.create({
        model: groqModelName(),
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: JSON.stringify({
              query,
              searchQuery,
              detectedCity: city || null,
              detectedCounty: county || null,
              detectedCategory: category || null,
              results: top,
            }),
          },
        ],
        temperature: 0.1,
        max_completion_tokens: 180,
      });

      answer = completion.choices[0]?.message?.content?.trim() || answer;
    } catch (error) {
      console.error("[directory-ai] Groq request failed", error);
    }

    return Response.json({
      answer,
      results: top,
    });
  } catch (error) {
    console.error("[directory-ai] request failed", error);
    return Response.json(
      {
        error: "I couldn't search the pharmacy directory right now. Please try again.",
        results: [],
      },
      { status: 500 },
    );
  }
}
