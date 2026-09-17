import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, proximityOrder, validCoordinates } from "../app/lib/proximity";
import { availabilityOffer } from "../app/lib/care-availability";
import { transactionFeeCents, billableFeeKes } from "../app/lib/transaction-fee";
import { publicStorefrontRoute, publicImageUrl, isPublicIdentityPath } from "../app/lib/public-storefront";

test("nearby sorting puts unknown pins last and measures realistic distances", () => {
  const origin = { latitude: -1.286389, longitude: 36.817223 };
  const near = distanceKm(origin, { latitude: -1.292, longitude: 36.821 });
  const far = distanceKm(origin, { latitude: -4.0435, longitude: 39.6682 });
  assert.ok(near! < 1); assert.ok(far! > 400);
  assert.equal(distanceKm(origin, { latitude: null, longitude: null }), null);
  assert.equal(validCoordinates(NaN, 36), false);
  assert.equal(validCoordinates(-91, 36), false);
  assert.deepEqual([{ distanceKm: null }, { distanceKm: far }, { distanceKm: near }].sort(proximityOrder).map(x => x.distanceKm), [near, far, null]);
});
test("equally complete refill offers prefer nearby supply before cheapest price", () => {
  const offer = availabilityOffer([{ name: "Medicine", truncated: false, matches: [
    { id: "far", name: "Medicine", price: 10, updatedAt: "", href: "", pharmacy: { id: "far", slug: "far", name: "Far", city: null, county: null, distanceKm: 20 } },
    { id: "near", name: "Medicine", price: 12, updatedAt: "", href: "", pharmacy: { id: "near", slug: "near", name: "Near", city: null, county: null, distanceKm: 1 } },
  ] }]);
  assert.equal(offer?.pharmacy.id, "near");
});
test("1% pharmacy fees preserve cents and never round a statement up", () => {
  assert.equal(transactionFeeCents(1000), 1000);
  assert.equal(transactionFeeCents(125.50), 126);
  assert.equal(billableFeeKes(126), 1);
  assert.equal(billableFeeKes(99), 0);
  assert.equal(billableFeeKes(-100), 0);
  assert.throws(() => transactionFeeCents(NaN));
});
test("storefront routes exclude private rooms and accept checkout and published media", () => {
  assert.equal(publicStorefrontRoute(["admin"]), null);
  assert.equal(publicStorefrontRoute(["about", "private"]), null);
  assert.deepEqual(publicStorefrontRoute(["order"]), { section: "order", detail: undefined });
  assert.deepEqual(publicStorefrontRoute(["careers"]), { section: "careers", detail: undefined });
  assert.deepEqual(publicStorefrontRoute(["delivery"]), { section: "delivery", detail: undefined });
  assert.deepEqual(publicStorefrontRoute(["faq"]), { section: "faq", detail: undefined });
  assert.deepEqual(publicStorefrontRoute(["contact"]), { section: "contact", detail: undefined });
  assert.deepEqual(publicStorefrontRoute(["vaccinations"]), { section: "vaccinations", detail: undefined });
  assert.equal(publicStorefrontRoute(["careers", "extra"]), null);
  assert.equal(isPublicIdentityPath("/careers"), true);
  assert.equal(isPublicIdentityPath("/api/delivery"), true);
  assert.equal(isPublicIdentityPath("/medicines"), false);
  assert.equal(publicImageUrl("javascript:alert(1)"), null);
  assert.equal(publicImageUrl("//evil.example/photo"), null);
  assert.equal(publicImageUrl("/images/pharmacy.png"), "/images/pharmacy.png");
});
