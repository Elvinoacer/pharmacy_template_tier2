import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateTotpSecret,
  totpCode,
  verifyTotp,
  signHmacSha256,
  verifyHmacSha256,
} from "../app/lib/platform/totp";
import { ROLE_PERMISSIONS, roleHasPermission } from "../app/lib/platform/permissions";
import { TENANT_MODELS } from "../app/lib/tenant-models";
import { ZERO_UUID } from "../app/lib/tenant-context";

describe("TOTP", () => {
  it("verifies a code generated from the same secret", () => {
    const secret = generateTotpSecret();
    const code = totpCode(secret);
    assert.equal(verifyTotp(secret, code), true);
    assert.equal(verifyTotp(secret, "000000"), false);
  });
});

describe("webhook signatures", () => {
  it("accepts a matching HMAC and rejects a mismatch", () => {
    const body = JSON.stringify({ ok: true });
    const sig = signHmacSha256("secret", body);
    assert.equal(verifyHmacSha256("secret", body, sig), true);
    assert.equal(verifyHmacSha256("secret", body, "deadbeef"), false);
    assert.equal(verifyHmacSha256("secret", body, null), false);
  });
});

describe("RBAC", () => {
  it("gives owners every permission and staff a subset", () => {
    assert.equal(roleHasPermission("owner", "integrations.manage"), true);
    assert.equal(roleHasPermission("staff", "integrations.manage"), false);
    assert.equal(roleHasPermission("staff", "orders.create"), true);
    assert.ok(ROLE_PERMISSIONS.pharmacist.includes("prescriptions.dispense"));
  });
});

describe("tenant isolation conventions", () => {
  it("keeps fail-closed UUID distinct from the old Aether default", () => {
    assert.equal(ZERO_UUID, "00000000-0000-0000-0000-000000000000");
    assert.notEqual(ZERO_UUID, "00000000-0000-4000-a000-000000000001");
  });

  it("scopes new platform models through TENANT_MODELS", () => {
    for (const model of ["Payment", "ApiKey", "OutboxEvent", "Subscription", "PharmacyBranch"]) {
      assert.ok(TENANT_MODELS.has(model), `missing ${model}`);
    }
  });
});
