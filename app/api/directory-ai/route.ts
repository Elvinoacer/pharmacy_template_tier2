import { groqApiKey, groqClient, groqModelName } from "@/app/lib/groq";
import { getDirectoryFacets, listPharmacyDirectory } from "@/app/lib/services/pharmacy-directory";

export const runtime = "nodejs";
export const maxDuration = 30;

function detectFacet(input: string, values: string[]) {
  const lower = input.toLowerCase();
  return values.find((value) => lower.includes(value.toLowerCase())) || "";
}

export async function POST(request: Request) {
  const apiKey = groqApiKey();
  if (!apiKey) return Response.json({ error: "AI directory search is not configured." }, { status: 503 });

  let body: { query?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const query = String(body.query || "").trim().slice(0, 300);
  if (query.length < 2) return Response.json({ error: "Tell me what medicine, category or area you are looking for." }, { status: 400 });

  const facets = await getDirectoryFacets();
  const city = detectFacet(query, facets.cities);
  const county = detectFacet(query, facets.counties);
  const category = facets.categories.find((item) => query.toLowerCase().includes(item.name.toLowerCase()))?.slug || "";
  const results = await listPharmacyDirectory({ q: query, city: city || undefined, county: county || undefined, category: category || undefined });
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

  const prompt = `You are Aether's pharmacy directory assistant. The user is searching for a pharmacy, medicine, category, or service. You MUST only summarize the supplied live public results. Never invent stock, prices, opening hours, diagnoses, doses, or medical advice. If there are no results, say no public match was found and suggest changing the search or choosing another area. Keep the answer to 2 short sentences maximum. Tell the user to choose a pharmacy from the result cards below.`;
  const completion = await groqClient().chat.completions.create({
    model: groqModelName(),
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify({ query, detectedCity: city || null, detectedCounty: county || null, detectedCategory: category || null, results: top }) },
    ],
    temperature: 0.1,
    max_completion_tokens: 180,
  });

  return Response.json({
    answer: completion.choices[0]?.message?.content?.trim() || (top.length ? `I found ${top.length} public pharmacy matches. Choose a pharmacy below to continue.` : "I couldn't find a public pharmacy match. Try another medicine, category or area."),
    results: top,
  });
}
