import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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


describe("runtime RLS role provisioning", () => {
  it("provisions the same runtime role the application SET ROLEs to", () => {
    const rlsSource = readFileSync(
      new URL("../app/lib/db/rls.ts", import.meta.url),
      "utf8",
    );
    const repairMigration = readFileSync(
      new URL(
        "../prisma/migrations/20260919070000_repair_afyvia_runtime_role/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );

    const match = rlsSource.match(/RLS_RUNTIME_ROLE\s*=\s*"([^"]+)"/);
    assert.ok(match, "RLS runtime role constant must be declared");
    const runtimeRole = match[1];

    assert.equal(runtimeRole, "afyvia_runtime");
    assert.match(repairMigration, new RegExp(`CREATE ROLE ${runtimeRole}\\b`));
    assert.match(repairMigration, new RegExp(`GRANT ${runtimeRole} TO CURRENT_USER`));
    assert.match(repairMigration, new RegExp(`ALL TABLES IN SCHEMA public TO ${runtimeRole}`));
    assert.match(repairMigration, new RegExp(`ALL SEQUENCES IN SCHEMA public TO ${runtimeRole}`));
    assert.match(repairMigration, new RegExp(`ALL FUNCTIONS IN SCHEMA app TO ${runtimeRole}`));
  });
});

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
    Object.assign(process.env, { NODE_ENV: "production" });
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
      if (oldNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
      else Object.assign(process.env, { NODE_ENV: oldNodeEnv });
    }
  });
});

describe("guest service booking account isolation", () => {
  it("never resolves an account from public email or phone fields", () => {
    const source = readFileSync(
      new URL("../app/actions/service-booking.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /const customerId = session\?\.customerId \?\? null;/);
    assert.doesNotMatch(source, /customerProfile\.findFirst/);
    assert.doesNotMatch(source, /contains:\s*digits\.slice\(-9\)/);
  });
});

describe("caregiver invitation account isolation", () => {
  it("requires proof of an existing account and preserves its global role", () => {
    const source = readFileSync(
      new URL("../app/actions/caregiver.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /verifyPassword\(password, existingUser\.passwordHash\)/);
    assert.match(source, /caregiver-accept:\$\{invite\.id\}/);
    assert.match(source, /failClosed:\s*true/);
    assert.equal((source.match(/role:\s*"caregiver"/g) ?? []).length, 1);
    assert.doesNotMatch(source, /passwordHash:\s*user\.passwordHash\s*\|\|/);
  });
});

describe("pharmacy regulatory verification boundary", () => {
  it("blocks owner submission until the verification dossier is complete", () => {
    const source = readFileSync(
      new URL("../app/actions/onboard.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /loadOwnerSubmissionReadiness\(pharmacyId\)/);
    assert.match(source, /Complete pharmacy verification before submitting/);
    assert.match(source, /verificationDossierComplete:\s*true/);
  });

  it("routes approval through the readiness guard rather than the raw review action", () => {
    const actionSource = readFileSync(
      new URL("../app/actions/pharmacy-verification.ts", import.meta.url),
      "utf8",
    );
    const formSource = readFileSync(
      new URL("../app/components/platform/ReviewDecisionForm.tsx", import.meta.url),
      "utf8",
    );

    assert.match(actionSource, /decision === "approve"/);
    assert.match(actionSource, /loadApprovalReadiness\(pharmacyId\)/);
    assert.match(actionSource, /Approval blocked\. Complete mandatory pharmacy verification first/);
    assert.match(formSource, /useActionState\(safeReviewPharmacyAction, initial\)/);
    assert.doesNotMatch(formSource, /useActionState\(reviewPharmacyAction, initial\)/);
  });

  it("stores owner verification evidence only in private R2", () => {
    const source = readFileSync(
      new URL("../app/api/onboard/verification-documents/route.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /isPrivateR2Configured\(\)/);
    assert.match(source, /uploadPrivateImageToR2/);
    assert.match(source, /pharmacy-verification\/\$\{pharmacyId\}\/\$\{kind\}/);
    assert.doesNotMatch(source, /uploadImageToR2\(/);
  });

  it("keeps a database-level trust gate and invalidates stale reviewer evidence", () => {
    const migration = readFileSync(
      new URL(
        "../prisma/migrations/20260912190000_pharmacy_verification_gate/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(migration, /CREATE TRIGGER pharmacy_verification_trust_gate/);
    assert.match(migration, /NEW\."status"::text NOT IN \('approved', 'active'\)/);
    assert.match(migration, /reviewer checklist is stale after pharmacy evidence changed/);
    assert.match(migration, /verification_input_changed/);
    assert.match(migration, /owner email is not verified/);
  });
});
