import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prismaUnscoped as db } from "../app/lib/db";
import { withPlatformBypass, withPharmacy } from "../app/lib/tenant-context";
import { claimPromotion, ensureVerificationInvoice, startPharmacyService, applyPromoCode } from "../app/lib/platform/pharmacy-enrolment";
import { completeBillingPayment, processSubscriptionCycle, collectInvoicePayment } from "../app/lib/platform/billing";
import { loadPharmacySetup } from "../app/lib/services/pharmacy-setup";

// Explicit opt-in outside CI so this suite can never fall back to a developer's
// normal database. GitHub CI already provisions a disposable Postgres service
// and sets CI=true, so its DATABASE_URL is safe and should not silently skip the
// payment/subscription regression suite.
const testDatabaseUrl = process.env.KYP_TEST_DATABASE_URL || (process.env.CI === "true" ? process.env.DATABASE_URL : undefined);

test("pharmacy billing: capped promotions, settlement, isolation and renewals", { skip: !testDatabaseUrl }, async () => {
  process.env.DATABASE_URL = testDatabaseUrl;
  await withPlatformBypass(async () => {
    const owner = await db.user.create({ data: { email: `kyp-${randomUUID()}@example.test`, passwordHash: "test-only", role: "manager" } });
    const promo = await db.pharmacyPromotion.create({ data: { name: "One promotional place", capacity: 1, verification: true, recurring: true, recurringMonths: 1, createdBy: owner.id } });
    const first = await db.pharmacy.create({ data: { name: "KYP test first", slug: randomUUID(), ownerUserId: owner.id } });
    const second = await db.pharmacy.create({ data: { name: "KYP test second", slug: randomUUID(), ownerUserId: owner.id } });
    try {
      const grants = await Promise.all([claimPromotion(first.id), claimPromotion(second.id)]);
      assert.equal(grants.filter(Boolean).length, 1, "capacity must hold under concurrent enrolments");
      const winner = grants[0] ? first : second;
      const payer = grants[0] ? second : first;
      assert.equal((await db.pharmacyPromotion.findUniqueOrThrow({ where: { id: promo.id } })).claimed, 1);
      assert.equal((await claimPromotion(winner.id))?.id, grants.find(Boolean)?.id, "redemption is idempotent");
      const waived = await ensureVerificationInvoice(winner.id);
      assert.equal(Number(waived.totalKes), 0);
      assert.equal(waived.status, "paid");
      const invoices = await Promise.all([ensureVerificationInvoice(payer.id), ensureVerificationInvoice(payer.id)]);
      assert.equal(invoices[0].id, invoices[1].id);
      assert.equal(Number(invoices[0].totalKes), 100);
      const checkout = randomUUID();
      const originalFetch = globalThis.fetch;
      const keys = ["DARAJA_CONSUMER_KEY", "DARAJA_CONSUMER_SECRET", "DARAJA_SHORTCODE", "DARAJA_PASSKEY", "DARAJA_CALLBACK_URL", "DARAJA_ENV"];
      const oldEnv = keys.map(k => process.env[k]);
      for (const key of keys) process.env[key] = key === "DARAJA_ENV" ? "sandbox" : "test-placeholder";
      let prompts = 0;
      globalThis.fetch = async (input, init) => {
        if (String(input).includes("oauth")) return Response.json({ access_token: "test-token", expires_in: "3599" });
        assert.ok(String(input).includes("stkpush/v1/processrequest"));
        assert.equal(JSON.parse(String(init?.body)).Amount, 100);
        prompts++;
        return Response.json({ ResponseCode: "0", CheckoutRequestID: checkout, MerchantRequestID: "merchant" });
      };
      try {
        const attempts = await Promise.allSettled([collectInvoicePayment(invoices[0].id, { phone: "254712345678" }), collectInvoicePayment(invoices[0].id, { phone: "254712345678" })]);
        const successfulStarts = attempts.filter((attempt) => attempt.status === "fulfilled" && attempt.value.ok);
        assert.equal(successfulStarts.length, 1, "concurrent clicks must start only one successful payment attempt");
        assert.equal(prompts, 1, "concurrent clicks must send only one provider prompt");
      } finally {
        globalThis.fetch = originalFetch;
        keys.forEach((key, index) => { if (oldEnv[index] === undefined) delete process.env[key]; else process.env[key] = oldEnv[index]; });
      }
      const payment = await db.billingPayment.findFirstOrThrow({ where: { checkoutRequestId: checkout } });
      await assert.rejects(db.billingPayment.create({ data: { pharmacyId: payer.id, invoiceId: invoices[0].id, provider: "mpesa", amountKes: 100 } }), "only one unsettled payment can exist");
      const success = { checkoutRequestId: checkout, merchantRequestId: "merchant", mpesaReceipt: randomUUID(), amount: 100, resultCode: 0 };
      await assert.rejects(completeBillingPayment({ ...success, amount: 99 }), /billing_evidence_mismatch/);
      assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoices[0].id } })).status, "open");
      await Promise.all([completeBillingPayment(success), completeBillingPayment(success)]);
      assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoices[0].id } })).status, "paid");
      assert.equal((await db.pharmacy.findUniqueOrThrow({ where: { id: payer.id } })).lifecycleStatus, "onboarding", "verification payment must not activate a pharmacy");
      await completeBillingPayment({ ...success, resultCode: 1032 });
      assert.equal((await db.billingPayment.findUniqueOrThrow({ where: { id: payment.id } })).status, "succeeded", "late failure cannot overwrite success");
      await withPharmacy(winner.id, async () => {
        assert.equal(await db.invoice.findUnique({ where: { id: invoices[0].id } }), null, "invoice is tenant isolated");
        assert.equal(await db.pharmacyPromotion.count(), 0, "tenant cannot inspect promotion inventory");
      });
      assert.equal((await loadPharmacySetup(winner.id)).ready, false, "verification waiver cannot bypass setup");
      const monthly = await startPharmacyService(winner.id);
      assert.equal(Number(monthly.totalKes), 0);
      const sub = await db.subscription.findUniqueOrThrow({ where: { id: monthly.subscriptionId! } });
      assert.equal(sub.status, "active");
      assert.equal((await startPharmacyService(winner.id)).id, monthly.id);
      await db.subscription.update({ where: { id: sub.id }, data: { status: "cancelled", cancelledAt: new Date() } });
      await processSubscriptionCycle();
      assert.equal((await db.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status, "cancelled", "historical paid invoices cannot resurrect cancelled subscriptions");
      const paidMonthly = await startPharmacyService(payer.id);
      assert.equal(Number(paidMonthly.totalKes), 500);
      assert.equal(paidMonthly.status, "open");
    } finally {
      // This suite runs only against an explicitly disposable test database.
      // Audit logs are intentionally append-only and keep a RESTRICT relation
      // to their pharmacy, so deleting these fixtures would weaken the same
      // immutability guarantee the test environment is supposed to exercise.
      // Random UUIDs/emails/slugs make retained fixtures safe across reruns.
    }
  });
});

test("pharmacy onboarding: voucher redemption, code variants, and capacity checks", { skip: !testDatabaseUrl }, async () => {
  process.env.DATABASE_URL = testDatabaseUrl;
  const admin = await withPlatformBypass(() =>
    db.user.create({ data: { email: `admin-${randomUUID()}@example.test`, passwordHash: "test-only", role: "manager" } })
  );

  const codeSuffix = `XCQD-${randomUUID().slice(0, 4).toUpperCase()}`;
  const testCode = `AFY-${codeSuffix}`;
  const promo = await withPlatformBypass(() =>
    db.pharmacyPromotion.create({
      data: {
        name: "Onboarding Launch Voucher",
        code: testCode,
        capacity: 2,
        verification: true,
        verificationDiscountKes: 100,
        recurring: true,
        recurringDiscountKes: 500,
        recurringMonths: 3,
        createdBy: admin.id,
      },
    })
  );

  const owner1 = await withPlatformBypass(() =>
    db.user.create({ data: { email: `owner1-${randomUUID()}@example.test`, passwordHash: "test-only", role: "manager" } })
  );
  const pharmacy1 = await withPlatformBypass(() =>
    db.pharmacy.create({ data: { name: "Onboard Chemist 1", slug: randomUUID(), ownerUserId: owner1.id } })
  );

  const owner2 = await withPlatformBypass(() =>
    db.user.create({ data: { email: `owner2-${randomUUID()}@example.test`, passwordHash: "test-only", role: "manager" } })
  );
  const pharmacy2 = await withPlatformBypass(() =>
    db.pharmacy.create({ data: { name: "Onboard Chemist 2", slug: randomUUID(), ownerUserId: owner2.id } })
  );

  const owner3 = await withPlatformBypass(() =>
    db.user.create({ data: { email: `owner3-${randomUUID()}@example.test`, passwordHash: "test-only", role: "manager" } })
  );
  const pharmacy3 = await withPlatformBypass(() =>
    db.pharmacy.create({ data: { name: "Onboard Chemist 3", slug: randomUUID(), ownerUserId: owner3.id } })
  );

  try {
    // 1. Non-existent code throws expected error
    await withPharmacy(pharmacy1.id, async () => {
      await assert.rejects(
        applyPromoCode(pharmacy1.id, "DOES-NOT-EXIST"),
        /Promotional code "DOES-NOT-EXIST" was not found\. Ask the platform team to confirm that the code is listed as active before retrying\./,
      );
    });

    // 2. Pharmacy 1 redeems using lowercase with stripped dashes and no prefix: "xcqd..."
    const result1 = await withPharmacy(pharmacy1.id, async () => {
      return applyPromoCode(pharmacy1.id, codeSuffix.toLowerCase().replace("-", ""), owner1.id);
    });
    assert.equal(result1.promotion.id, promo.id);
    assert.equal(result1.alreadyApplied, false);
    assert.equal(Number(result1.grant.verificationDiscountKes), 100);
    assert.equal(Number(result1.grant.recurringDiscountKes), 500);
    assert.equal(result1.grant.recurringMonths, 3);

    // 3. Idempotent re-application returns alreadyApplied: true
    const result1Repeat = await withPharmacy(pharmacy1.id, async () => {
      return applyPromoCode(pharmacy1.id, testCode, owner1.id);
    });
    assert.equal(result1Repeat.alreadyApplied, true);

    // 4. Pharmacy 2 redeems using exact code format
    const result2 = await withPharmacy(pharmacy2.id, async () => {
      return applyPromoCode(pharmacy2.id, testCode, owner2.id);
    });
    assert.equal(result2.promotion.id, promo.id);
    assert.equal(result2.alreadyApplied, false);

    // 5. Pharmacy 3 attempts to redeem, but capacity (2) is now exhausted
    await withPharmacy(pharmacy3.id, async () => {
      await assert.rejects(
        applyPromoCode(pharmacy3.id, testCode, owner3.id),
        new RegExp(`Promotional code "${testCode}" has reached its maximum redemptions\\.`),
      );
    });

    // 6. Test stopped code error
    const stoppedCode = `AFY-STOP-${randomUUID().slice(0, 6).toUpperCase()}`;
    await withPlatformBypass(() =>
      db.pharmacyPromotion.create({
        data: {
          name: "Stopped Voucher",
          code: stoppedCode,
          capacity: 10,
          active: false,
          verification: true,
          recurring: false,
          recurringMonths: 1,
          createdBy: admin.id,
        },
      })
    );
    await withPharmacy(pharmacy3.id, async () => {
      await assert.rejects(
        applyPromoCode(pharmacy3.id, stoppedCode, owner3.id),
        new RegExp(`Promotional code "${stoppedCode}" exists but has been stopped and can no longer be redeemed\\.`),
      );
    });
  } finally {
    await db.$disconnect();
  }
});

