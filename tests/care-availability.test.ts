import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availabilityOffer,
  type CareMatch,
  type CareResult,
} from "../app/lib/care-availability";
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
