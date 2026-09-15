import { proximityOrder } from "./proximity";
export type CarePharmacy = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  county: string | null;
  distanceKm?: number | null;
};
export type CareMatch = {
  id: string;
  name: string;
  price: number;
  updatedAt: string;
  href: string;
  pharmacy: CarePharmacy;
};
export type CareResult = {
  name: string;
  truncated: boolean;
  matches: CareMatch[];
};
export type CareOffer = {
  pharmacy: CarePharmacy;
  lines: Array<{ requested: string; match: CareMatch }>;
  missing: string[];
};
/** Availability determines context. Prefer coverage, then the sum of listed unit prices. */
export function availabilityOffer(results: CareResult[]): CareOffer | null {
  const byPharmacy = new Map<string, CareOffer>();
  for (const result of results)
    for (const match of result.matches) {
      if (!Number.isFinite(match.price) || match.price < 0) continue;
      let offer = byPharmacy.get(match.pharmacy.id);
      if (!offer) {
        offer = { pharmacy: match.pharmacy, lines: [], missing: [] };
        byPharmacy.set(match.pharmacy.id, offer);
      }
      const line = offer.lines.find((l) => l.requested === result.name);
      if (!line) offer.lines.push({ requested: result.name, match });
      else if (
        match.price < line.match.price ||
        (match.price === line.match.price && match.id < line.match.id)
      )
        line.match = match;
    }
  const offers = [...byPharmacy.values()];
  offers.sort(
    (a, b) =>
      b.lines.length - a.lines.length ||
      proximityOrder(a.pharmacy, b.pharmacy) ||
      a.lines.reduce((n, l) => n + l.match.price, 0) -
        b.lines.reduce((n, l) => n + l.match.price, 0) ||
      a.pharmacy.slug.localeCompare(b.pharmacy.slug),
  );
  const best = offers[0];
  if (!best) return null;
  best.missing = results
    .filter((r) => !best.lines.some((l) => l.requested === r.name))
    .map((r) => r.name);
  return best;
}

export type SplitFulfillmentPlan = {
  offers: CareOffer[];
  totalPrice: number;
  totalCovered: number;
  unfulfillable: string[];
};

/**
 * Multi-pharmacy split availability solver.
 * When a single pharmacy cannot fulfill all medications, this finds the minimal set
 * of optimal pharmacies that together provide maximum coverage across the requested medicines.
 */
export function splitAvailabilityOffers(results: CareResult[]): SplitFulfillmentPlan {
  const unfulfilled = new Set(results.map((r) => r.name));
  const planOffers: CareOffer[] = [];

  while (unfulfilled.size > 0) {
    const candidates = new Map<string, CareOffer>();
    for (const result of results) {
      if (!unfulfilled.has(result.name)) continue;
      for (const match of result.matches) {
        if (!Number.isFinite(match.price) || match.price < 0) continue;
        let offer = candidates.get(match.pharmacy.id);
        if (!offer) {
          offer = { pharmacy: match.pharmacy, lines: [], missing: [] };
          candidates.set(match.pharmacy.id, offer);
        }
        const line = offer.lines.find((l) => l.requested === result.name);
        if (!line) offer.lines.push({ requested: result.name, match });
        else if (
          match.price < line.match.price ||
          (match.price === line.match.price && match.id < line.match.id)
        )
          line.match = match;
      }
    }

    const candidateList = [...candidates.values()];
    if (candidateList.length === 0) break;

    candidateList.sort(
      (a, b) =>
        b.lines.length - a.lines.length ||
        proximityOrder(a.pharmacy, b.pharmacy) ||
        a.lines.reduce((n, l) => n + l.match.price, 0) -
          b.lines.reduce((n, l) => n + l.match.price, 0) ||
        a.pharmacy.slug.localeCompare(b.pharmacy.slug),
    );

    const chosen = candidateList[0];
    chosen.missing = results
      .filter((r) => !chosen.lines.some((l) => l.requested === r.name))
      .map((r) => r.name);
    planOffers.push(chosen);
    for (const line of chosen.lines) {
      unfulfilled.delete(line.requested);
    }
  }

  const totalPrice = planOffers.reduce(
    (sum, o) => sum + o.lines.reduce((lSum, l) => lSum + l.match.price, 0),
    0,
  );
  const totalCovered = planOffers.reduce((sum, o) => sum + o.lines.length, 0);
  const unfulfillable = [...unfulfilled];

  return {
    offers: planOffers,
    totalPrice,
    totalCovered,
    unfulfillable,
  };
}
