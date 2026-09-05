import assert from "node:assert/strict";
import { describe, it } from "node:test";

try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {}

import { parseDarajaCallbackEvidence } from "../app/lib/services/daraja-callback-verification";
import { isCronAuthorized } from "../app/lib/cron-auth";

describe("Daraja callback settlement evidence", () => {
  it("requires a positive amount and receipt for a successful result", () => {
    const missingAmount = parseDarajaCallbackEvidence({
      checkoutRequestId: "ws_CO_123",
      resultCode: 0,
      items: [{ Name: "MpesaReceiptNumber", Value: "ABC123" }],
    });
    assert.equal(missingAmount.ok, false);

    const missingReceipt = parseDarajaCallbackEvidence({
      checkoutRequestId: "ws_CO_123",
      resultCode: 0,
      items: [{ Name: "Amount", Value: 1500 }],
    });
    assert.equal(missingReceipt.ok, false);
  });

  it("parses complete successful evidence", () => {
    const result = parseDarajaCallbackEvidence({
      checkoutRequestId: "ws_CO_123",
      resultCode: 0,
      items: [
        { Name: "Amount", Value: 1500 },
        { Name: "MpesaReceiptNumber", Value: "ABC123XYZ" },
        { Name: "PhoneNumber", Value: 254712345678 },
      ],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amount, 1500);
      assert.equal(result.receipt, "ABC123XYZ");
      assert.equal(result.phone, "254712345678");
    }
  });
});

describe("cron authentication", () => {
  it("does not accept a query-string cron secret", () => {
    const old = process.env.CRON_SECRET;
    const oldNodeEnv = process.env.NODE_ENV;
    process.env.CRON_SECRET = "test-cron-secret";
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    try {
      const queryOnly = new Request("https://example.test/api/cron/job?secret=test-cron-secret");
      assert.equal(isCronAuthorized(queryOnly), false);

      const bearer = new Request("https://example.test/api/cron/job", {
        headers: { authorization: "Bearer test-cron-secret" },
      });
      assert.equal(isCronAuthorized(bearer), true);
    } finally {
      if (old === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = old;
      Object.defineProperty(process.env, "NODE_ENV", { value: oldNodeEnv, configurable: true });
    }
  });
});
