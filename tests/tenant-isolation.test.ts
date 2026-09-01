import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withPharmacy, withPlatformBypass, peekTenant, ZERO_UUID, failClosedId } from "../app/lib/tenant-context";
import { TENANT_MODELS, TENANT_RELATION_MODELS } from "../app/lib/tenant-models";
import { rlsGucValues } from "../app/lib/db/rls";
import { asPayload, fallbackChain, remainingChannels } from "../app/lib/platform/notification-fallback";
import { platformRoleAllowed } from "../app/lib/platform/permissions";

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

describe("RLS GUC values", () => {
  it("sets pharmacy id and clears bypass for a tenant", () => {
    const guc = rlsGucValues({ bypass: false, pharmacyId: "11111111-1111-4111-a111-111111111111" });
    assert.equal(guc.platformBypass, "");
    assert.equal(guc.pharmacyId, "11111111-1111-4111-a111-111111111111");
  });

  it("sets platform bypass and clears pharmacy id", () => {
    const guc = rlsGucValues({ bypass: true, pharmacyId: null });
    assert.equal(guc.platformBypass, "1");
    assert.equal(guc.pharmacyId, "");
  });

  it("fail-closed: no tenant and no bypass yields empty GUC", () => {
    const guc = rlsGucValues({ bypass: false, pharmacyId: null });
    assert.equal(guc.platformBypass, "");
    assert.equal(guc.pharmacyId, "");
  });
});

describe("notification fallback", () => {
  it("preserves the stored fallback chain", () => {
    const stored = asPayload({
      channel: "whatsapp",
      body: "hello",
      recipient: { phone: "+254700000000" },
      fallback: ["whatsapp", "sms", "email"],
      attempted: ["whatsapp"],
    });
    assert.ok(stored);
    assert.deepEqual(stored.fallback, ["whatsapp", "sms", "email"]);
    assert.deepEqual(remainingChannels(fallbackChain("whatsapp", stored.fallback), stored.attempted ?? []), ["sms", "email"]);
  });
});

describe("platform roles", () => {
  it("does not let super_admin implicitly pass a role they were not given", () => {
    assert.equal(platformRoleAllowed("super_admin", ["owner"]), false);
  });

  it("lets owner through any platform role gate", () => {
    assert.equal(platformRoleAllowed("owner", ["billing_admin"]), true);
  });
});
