import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampOrderQuantity,
  pharmacySupportsDelivery,
  sellableAvailable,
  sellableFromInventory,
} from "../app/lib/inventory-availability";
import { buildDirectoryPharmacyWhere } from "../app/lib/pharmacy-directory-query";
import { isPublicIdentityPath, publicStorefrontRoute, tenantHref } from "../app/lib/public-storefront";

describe("sellable availability", () => {
  it("subtracts active reservations from physical stock", () => {
    assert.equal(sellableAvailable(5, 5), 0);
    assert.equal(sellableAvailable(5, 2), 3);
    assert.equal(sellableAvailable(0, 1), 0);
    assert.equal(sellableFromInventory({ currentStock: 4, reservations: [{ quantity: 1 }, { quantity: 2 }] }), 1);
  });

  it("never reports negative availability", () => {
    assert.equal(sellableAvailable(1, 8), 0);
  });
});

describe("delivery capability", () => {
  it("treats notes or a positive radius as delivery support", () => {
    assert.equal(pharmacySupportsDelivery({ deliveryNotes: "Same day", deliveryRadiusKm: null }), true);
    assert.equal(pharmacySupportsDelivery({ deliveryNotes: null, deliveryRadiusKm: 10 }), true);
    assert.equal(pharmacySupportsDelivery({ deliveryNotes: "  ", deliveryRadiusKm: 0 }), false);
    assert.equal(pharmacySupportsDelivery({ deliveryNotes: null, deliveryRadiusKm: null }), false);
  });
});

describe("guest quantity clamp", () => {
  it("reduces quantity to remaining sellable stock", () => {
    assert.equal(clampOrderQuantity(10, 2), 2);
    assert.equal(clampOrderQuantity(1, 0), 0);
    assert.equal(clampOrderQuantity(50, 40), 20);
  });
});

describe("pharmacy directory filters", () => {
  it("requires category inventory even when the pharmacy name matches the search", () => {
    const where = buildDirectoryPharmacyWhere({ q: "Aether", category: "pain-relief" });
    assert.ok(Array.isArray(where.AND));
    assert.equal(where.AND.length, 2);
    const categoryClause = where.AND[0] as { inventory: { some: { medicationMaster: { category: { equals: string } } } } };
    assert.equal(categoryClause.inventory.some.medicationMaster.category.equals, "pain-relief");
  });

  it("uses notes or radius for delivery, not notes alone", () => {
    const where = buildDirectoryPharmacyWhere({ delivery: true });
    const delivery = where.settings as { is: { OR: unknown[] } };
    assert.equal(delivery.is.OR.length, 2);
  });
});

describe("network vs pharmacy URLs", () => {
  it("keeps platform contact/faq URLs unless already on a storefront", () => {
    assert.equal(tenantHref(null, "/contact"), "/contact");
    assert.equal(tenantHref("westlands-pharmacy", "/contact"), "/p/westlands-pharmacy/contact");
    assert.equal(tenantHref("westlands-pharmacy", "/medicines/panadol"), "/p/westlands-pharmacy/medicines/panadol");
    assert.equal(tenantHref("westlands-pharmacy", "/p/other/medicines/panadol"), "/p/other/medicines/panadol");
    assert.equal(tenantHref("westlands-pharmacy", "/pharmacies"), "/pharmacies");
  });

  it("does not treat bare identity paths as cookie-owned pharmacy pages", () => {
    assert.equal(isPublicIdentityPath("/contact"), true);
    assert.equal(isPublicIdentityPath("/medicines"), false);
    assert.equal(isPublicIdentityPath("/vaccinations"), false);
  });

  it("keeps vaccinations inside an explicit storefront", () => {
    assert.deepEqual(publicStorefrontRoute(["vaccinations"]), { section: "vaccinations", detail: undefined });
    assert.deepEqual(publicStorefrontRoute(["vaccinations", "book"]), { section: "vaccinations", detail: "book" });
  });
});
