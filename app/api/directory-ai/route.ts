import { parseDirectoryIntent } from "@/app/lib/directory-intent";
import { GROQ_LOW_REASONING, groqApiKey, groqClient, groqModelName } from "@/app/lib/groq";
import { getDirectoryFacets, listPharmacyDirectory } from "@/app/lib/services/pharmacy-directory";

export const runtime = "nodejs";
export const maxDuration = 30;

function fallbackAnswer(count: number) {
  return count > 0
    ? `I found ${count} public pharmacy match${count === 1 ? "" : "es"}. Choose a pharmacy below to continue.`
    : "I couldn't find a public pharmacy match. Try another medicine, category or area.";
}

export async function POST(request: Request) {
  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", message: "We couldn't read that search. Please try again." },
      { status: 400 },
    );
  }

  const query = String(body.query || "").trim().slice(0, 300);
  if (query.length < 2) {
    return Response.json(
      { error: "invalid_query", message: "Tell me what medicine, category or area you are looking for." },
      { status: 400 },
    );
  }

  try {
    const facets = await getDirectoryFacets();
    const intent = parseDirectoryIntent(query, facets);
    const directoryResults = await listPharmacyDirectory({
      q: intent.searchQuery || undefined,
      city: intent.city || undefined,
      county: intent.county || undefined,
      category: intent.category || undefined,
      delivery: intent.deliveryOnly || undefined,
    });
    const results = intent.visibleStockOnly
      ? directoryResults.filter((pharmacy) => pharmacy.stockCount > 0)
      : directoryResults;

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
    let source: "ai" | "directory" = "directory";
    const apiKey = groqApiKey();

    if (apiKey) {
      try {
        const prompt = `You are Aether's pharmacy directory assistant. The user is searching for a pharmacy, medicine, category, or service. You MUST only summarize the supplied live public results. Never invent stock, prices, opening hours, diagnoses, doses, or medical advice. If there are no results, say no public match was found and suggest changing the search or choosing another area. Keep the answer to 2 short sentences maximum. Tell the user to choose a pharmacy from the result cards below.`;
        const completion = await groqClient(apiKey).chat.completions.create({
          model: groqModelName(),
          messages: [
            { role: "system", content: prompt },
            {
              role: "user",
              content: JSON.stringify({ query, interpretedIntent: intent, results: top }),
            },
          ],
          temperature: 0.1,
          max_completion_tokens: 180,
          ...GROQ_LOW_REASONING,
        });

        const generated = completion.choices[0]?.message?.content?.trim();
        if (generated) {
          answer = generated;
          source = "ai";
        }
      } catch (error) {
        console.error("[directory assistant] provider request failed", error);
      }
    }

    return Response.json({ answer, results: top, source });
  } catch (error) {
    console.error("[directory assistant] request failed", error);
    return Response.json(
      {
        error: "directory_search_failed",
        message: "I couldn't search the pharmacy directory right now. Please try again.",
        results: [],
      },
      { status: 500 },
    );
  }
}
