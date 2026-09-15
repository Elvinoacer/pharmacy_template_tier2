import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availabilityOffer,
  splitAvailabilityOffers,
  type CareMatch,
  type CareResult,
} from "../app/lib/care-availability";
import { isServicePayableAfter } from "../app/lib/services/pharmacy-services";
function match(pharmacy: string, price: number, name = "Medicine"): CareMatch {
  return {
    id: `${pharmacy}-${name}`,
    name,
    price,
    updatedAt: "2026-09-12",
    href: "/medicines",
    pharmacy: {
      id: pharmacy,
      name: pharmacy,
      slug: pharmacy,
      city: null,
      county: null,
    },
  };
}
describe("availability-led requests", () => {
  it("prefers covering all medicines to a cheaper partial option", () => {
    const results: CareResult[] = [
      {
        name: "A",
        truncated: false,
        matches: [match("complete", 100, "A"), match("partial", 10, "A")],
      },
      { name: "B", truncated: false, matches: [match("complete", 100, "B")] },
    ];
    assert.equal(availabilityOffer(results)?.pharmacy.slug, "complete");
    assert.deepEqual(availabilityOffer(results)?.missing, []);
  });
  it("uses listed price when coverage is equal and returns the exact inventory record", () => {
    const result = availabilityOffer([
      {
        name: "A",
        truncated: false,
        matches: [match("first", 100), match("second", 80)],
      },
    ]);
    assert.equal(result?.pharmacy.slug, "second");
    assert.equal(result?.lines[0].match.id, "second-Medicine");
  });
  it("reports unmet medicines explicitly and does not mutate search results", () => {
    const results: CareResult[] = [
      { name: "A", truncated: false, matches: [match("only", 50)] },
      { name: "B", truncated: false, matches: [] },
    ];
    const before = structuredClone(results);
    assert.deepEqual(availabilityOffer(results)?.missing, ["B"]);
    assert.deepEqual(results, before);
  });
  it("does not manufacture an option when there is no available stock", () => {
    assert.equal(
      availabilityOffer([{ name: "A", truncated: false, matches: [] }]),
      null,
    );
  });
});

describe("multi-pharmacy split availability solver", () => {
  it("returns single offer when one pharmacy covers all medicines", () => {
    const results: CareResult[] = [
      { name: "A", truncated: false, matches: [match("solo", 100, "A")] },
      { name: "B", truncated: false, matches: [match("solo", 150, "B")] },
    ];
    const plan = splitAvailabilityOffers(results);
    assert.equal(plan.offers.length, 1);
    assert.equal(plan.offers[0].pharmacy.slug, "solo");
    assert.equal(plan.totalCovered, 2);
    assert.equal(plan.totalPrice, 250);
    assert.deepEqual(plan.unfulfillable, []);
    assert.deepEqual(plan.offers[0].missing, []);
  });

  it("splits across multiple pharmacies when no single pharmacy has all medications", () => {
    const results: CareResult[] = [
      { name: "A", truncated: false, matches: [match("alpha", 120, "A")] },
      { name: "B", truncated: false, matches: [match("beta", 180, "B")] },
    ];
    const plan = splitAvailabilityOffers(results);
    assert.equal(plan.offers.length, 2);
    assert.equal(plan.totalCovered, 2);
    assert.equal(plan.totalPrice, 300);
    assert.deepEqual(plan.unfulfillable, []);

    const alphaOffer = plan.offers.find((o) => o.pharmacy.slug === "alpha");
    const betaOffer = plan.offers.find((o) => o.pharmacy.slug === "beta");
    assert.ok(alphaOffer);
    assert.ok(betaOffer);
    assert.equal(alphaOffer.lines.length, 1);
    assert.equal(alphaOffer.lines[0].requested, "A");
    assert.deepEqual(alphaOffer.missing, ["B"]);
    assert.equal(betaOffer.lines.length, 1);
    assert.equal(betaOffer.lines[0].requested, "B");
    assert.deepEqual(betaOffer.missing, ["A"]);
  });

  it("greedily selects the pharmacy covering the most remaining medicines first", () => {
    const results: CareResult[] = [
      {
        name: "A",
        truncated: false,
        matches: [match("two-meds", 100, "A"), match("cheap-one", 40, "A")],
      },
      {
        name: "B",
        truncated: false,
        matches: [match("two-meds", 100, "B")],
      },
      {
        name: "C",
        truncated: false,
        matches: [match("solo-c", 80, "C")],
      },
    ];
    const plan = splitAvailabilityOffers(results);
    assert.equal(plan.offers.length, 2);
    assert.equal(plan.offers[0].pharmacy.slug, "two-meds");
    assert.equal(plan.offers[1].pharmacy.slug, "solo-c");
    assert.equal(plan.totalCovered, 3);
    assert.equal(plan.totalPrice, 280);
    assert.deepEqual(plan.unfulfillable, []);
  });

  it("records unfulfillable items when no pharmacy has stock", () => {
    const results: CareResult[] = [
      { name: "A", truncated: false, matches: [match("alpha", 50, "A")] },
      { name: "B", truncated: false, matches: [] },
      { name: "C", truncated: false, matches: [] },
    ];
    const plan = splitAvailabilityOffers(results);
    assert.equal(plan.offers.length, 1);
    assert.equal(plan.totalCovered, 1);
    assert.deepEqual(plan.unfulfillable, ["B", "C"]);
  });

  it("handles completely empty results or no stock gracefully", () => {
    const plan = splitAvailabilityOffers([
      { name: "A", truncated: false, matches: [] },
      { name: "B", truncated: false, matches: [] },
    ]);
    assert.equal(plan.offers.length, 0);
    assert.equal(plan.totalCovered, 0);
    assert.equal(plan.totalPrice, 0);
    assert.deepEqual(plan.unfulfillable, ["A", "B"]);
  });

  it("does not mutate search results", () => {
    const results: CareResult[] = [
      { name: "A", truncated: false, matches: [match("alpha", 50, "A")] },
      { name: "B", truncated: false, matches: [match("beta", 60, "B")] },
    ];
    const before = structuredClone(results);
    splitAvailabilityOffers(results);
    assert.deepEqual(results, before);
  });
});

describe("care service payment timing detection", () => {
  it("detects [payable:after] tag in eligibility", () => {
    assert.equal(
      isServicePayableAfter({
        eligibility: "Patients aged 18+ [payable:after]",
        description: "Blood pressure and sugar check",
      }),
      true,
    );
  });

  it("detects natural language pay at visit in description or eligibility", () => {
    assert.equal(
      isServicePayableAfter({
        eligibility: null,
        description: "Comprehensive health review. Pay at visit upon arrival.",
      }),
      true,
    );
    assert.equal(
      isServicePayableAfter({
        eligibility: "Walk-ins welcome, pay at clinic",
        description: null,
      }),
      true,
    );
    assert.equal(
      isServicePayableAfter({
        eligibility: null,
        description: "Medication counseling. Pay at pharmacy counter.",
      }),
      true,
    );
  });

  it("returns false for standard services payable online upfront", () => {
    assert.equal(
      isServicePayableAfter({
        eligibility: "Adults 18+",
        description: "Comprehensive diagnostic panel with immediate results.",
      }),
      false,
    );
  });

  it("handles null or undefined attributes gracefully without throwing", () => {
    assert.equal(isServicePayableAfter({}), false);
    assert.equal(isServicePayableAfter({ eligibility: null, description: null }), false);
  });

  it("is case-insensitive", () => {
    assert.equal(
      isServicePayableAfter({
        eligibility: "[PAYABLE:AFTER]",
      }),
      true,
    );
  });
});


