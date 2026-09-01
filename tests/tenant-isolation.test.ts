import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withPharmacy, withPlatformBypass, peekTenant, ZERO_UUID, failClosedId } from "../app/lib/tenant-context";
import { TENANT_MODELS, TENANT_RELATION_MODELS } from "../app/lib/tenant-models";

describe("tenant ALS", () => {
  it("withPharmacy sets tenant and withPlatformBypass clears isolation", () => {
    assert.equal(peekTenant(), undefined);
    withPharmacy("11111111-1111-4111-a111-111111111111", () => {
      const t = peekTenant();
      assert.equal(t?.pharmacyId, "11111111-1111-4111-a111-111111111111");
      assert.equal(t?.bypass, false);
    });
    withPlatformBypass(() => {
      const t = peekTenant();
      assert.equal(t?.bypass, true);
      assert.equal(t?.pharmacyId, null);
    });
  });

  it("fail-closed id is the zero UUID, not a real tenant", () => {
    assert.equal(failClosedId(), ZERO_UUID);
  });
});

describe("tenant model registry", () => {
  it("does not auto-scope network tables", () => {
    for (const model of ["User", "Session", "Pharmacy", "PharmacyMembership", "PharmacyIntegration"]) {
      assert.equal(TENANT_MODELS.has(model), false, model);
    }
  });

  it("scopes relation-owned rows through a parent", () => {
    assert.equal(TENANT_RELATION_MODELS.get("OrderItem"), "order");
    assert.equal(TENANT_RELATION_MODELS.get("InvoiceItem"), "invoice");
    assert.equal(TENANT_RELATION_MODELS.get("OrderAccessToken"), "order");
  });
});
