import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {}

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
    for (const model of ["Payment", "ApiKey", "OutboxEvent", "Subscription", "PharmacyBranch", "WebhookDelivery", "BillingPayment", "InventorySyncConflict"]) {
      assert.ok(TENANT_MODELS.has(model), `missing ${model}`);
    }
  });
});

describe("export storage adapter", () => {
  it("saves and loads export archive correctly with checksum", async () => {
    const { saveExportArchive, loadExportArchive, deleteExportArchive } = await import(
      "../app/lib/platform/export-storage"
    );
    const testData = JSON.stringify({ schemaVersion: "2.0", test: true, count: 42 });
    const pharmacyId = "11111111-1111-4111-a111-111111111111";
    const requestId = `test-exp-${Date.now()}`;

    const meta = await saveExportArchive(pharmacyId, requestId, testData);
    assert.ok(meta.storageUrl);
    assert.ok(meta.checksum);
    assert.equal(meta.sizeBytes, Buffer.from(testData).length);

    const loaded = await loadExportArchive(meta.storageUrl);
    assert.ok(loaded);
    assert.equal(loaded?.toString("utf8"), testData);

    await deleteExportArchive(meta.storageUrl);
  });
});

describe("rate limiting", () => {
  it("allows requests up to limit and rejects beyond limit", async () => {
    const { checkRateLimitAsync } = await import("../app/lib/rate-limit");
    const key = `test-rl-${Date.now()}`;
    const opts = { limit: 3, windowMs: 60000 };

    const r1 = await checkRateLimitAsync(key, opts);
    assert.equal(r1.allowed, true);
    const r2 = await checkRateLimitAsync(key, opts);
    assert.equal(r2.allowed, true);
    const r3 = await checkRateLimitAsync(key, opts);
    assert.equal(r3.allowed, true);
    const r4 = await checkRateLimitAsync(key, opts);
    assert.equal(r4.allowed, false);
    assert.ok(r4.retryAfterSeconds > 0);
  });
});

describe("platform observability", () => {
  it("returns structured health check results", async () => {
    const { platformHealthCheck, platformOpsSnapshot } = await import(
      "../app/lib/platform/observability"
    );
    const health = await platformHealthCheck();
    assert.ok(health.status === "healthy" || health.status === "degraded" || health.status === "unhealthy");
    assert.ok(typeof health.checks.queueBacklog === "number");

    const snap = await platformOpsSnapshot();
    assert.ok(snap.jobs);
    assert.ok(snap.billing);
    assert.ok(snap.pos);
  });
});
