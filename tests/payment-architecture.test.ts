import "./test-env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

import { prismaUnscoped as db } from "../app/lib/db";
import { peekTenant, withPharmacy, withPlatformBypass } from "../app/lib/tenant-context";
import {
  ensureVerificationInvoice,
  startPharmacyService,
} from "../app/lib/platform/pharmacy-enrolment";
import {
  createIntasendBillingCheckout,
  completeIntasendBillingPayment,
} from "../app/lib/platform/billing";
import {
  saveTenantDaraja,
  resolveTenantDarajaCredentials,
  getPharmacyPaymentCapability,
  getPharmacyPaymentSettings,
  disconnectTenantDaraja,
} from "../app/lib/platform/integrations";
import {
  initiateStkPayment,
  initiatePharmacyDarajaPayment,
  completeDarajaPayment,
  createIntasendOrderCheckout,
  completeIntasendOrderPayment,
} from "../app/lib/services/payments";
import { isPharmacyCommissionEnabled } from "../app/lib/transaction-fee";
import { createTransactionFeeStatement } from "../app/actions/transaction-fees";
import { verifyIntasendWebhookChallenge } from "../app/lib/services/intasend";
import { decryptSecret } from "../app/lib/platform/secrets";
import { createRefund } from "../app/lib/services/commerce/refunds";

test("Payment Architecture: Pure Platform Billing vs Pure Tenant Commerce", { skip: !process.env.DATABASE_URL }, async (t) => {
  // Architecture tests must not create a real provider checkout, even when a
  // developer has live credentials in .env.local.
  const intasendEnvironment = Object.fromEntries(
    ["INTASEND_PUBLISHABLE_KEY", "NEXT_PUBLIC_INTASEND_PUBLISHABLE_KEY", "INTASEND_TEST"].map(
      (key) => [key, process.env[key]],
    ),
  );
  delete process.env.INTASEND_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_INTASEND_PUBLISHABLE_KEY;
  process.env.INTASEND_TEST = "true";
  t.after(() => {
    for (const [key, value] of Object.entries(intasendEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  // Set up integration secret if not set
  if (!process.env.INTEGRATION_SECRET) {
    process.env.INTEGRATION_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  }
  if (!process.env.INTASEND_WEBHOOK_CHALLENGE) {
    process.env.INTASEND_WEBHOOK_CHALLENGE = "test-webhook-challenge-token";
  }

  // Create isolated test user and two test pharmacies
  const owner = await withPlatformBypass(() =>
    db.user.create({
      data: {
        email: `payarch-${randomUUID()}@example.test`,
        passwordHash: "test-hash",
        role: "manager",
      },
    }),
  );

  const pharmacyA = await withPlatformBypass(() =>
    db.pharmacy.create({
      data: {
        name: "Arch Pharmacy PayBill A",
        slug: `paybill-a-${randomUUID()}`,
        ownerUserId: owner.id,
        status: "submitted",
        lifecycleStatus: "onboarding",
      },
    }),
  );

  const pharmacyB = await withPlatformBypass(() =>
    db.pharmacy.create({
      data: {
        name: "Arch Pharmacy Till B",
        slug: `till-b-${randomUUID()}`,
        ownerUserId: owner.id,
        status: "submitted",
        lifecycleStatus: "onboarding",
      },
    }),
  );

  const pharmacyUnconfigured = await withPlatformBypass(() =>
    db.pharmacy.create({
      data: {
        name: "Arch Pharmacy Unconfigured C",
        slug: `unconf-c-${randomUUID()}`,
        ownerUserId: owner.id,
        status: "submitted",
        lifecycleStatus: "onboarding",
      },
    }),
  );

  await t.test("1. Platform Billing (IntaSend)", async (st) => {
    await st.test("generates distinct KES 100 verification invoice", async () => {
      const invoice = await ensureVerificationInvoice(pharmacyA.id);
      assert.equal(invoice.number, `KYP-${pharmacyA.id}`);
      assert.equal(Number(invoice.totalKes), 100);
      assert.equal(invoice.status, "open");
      assert.equal(invoice.subscriptionId, null);
    });

    await st.test("creates a checkout after the invoice's tenant scope has ended", async () => {
      const invoice = await ensureVerificationInvoice(pharmacyA.id);
      assert.equal(peekTenant(), undefined, "the service must not depend on a caller tenant scope");
      const checkout = await createIntasendBillingCheckout(pharmacyA.id, invoice.id);
      assert.equal(checkout.ok, true);
      assert.ok(checkout.checkoutUrl, "Must return IntaSend hosted checkout URL");

      // Verify billingPayment was recorded as pending
      const payment = await withPlatformBypass(() =>
        db.billingPayment.findFirst({
          where: { invoiceId: invoice.id, provider: "intasend" },
        }),
      );
      assert.ok(payment, "Must record billingPayment row");
      assert.equal(payment?.status, "pending");
      assert.equal(Number(payment?.amountKes), 100);
    });

    await st.test("IntaSend webhook verification and settlement", async () => {
      // 1. Challenge verification
      assert.equal(verifyIntasendWebhookChallenge(null), false);
      assert.equal(verifyIntasendWebhookChallenge("invalid_token"), false);

      // 2. Settlement of verification invoice
      const invoice = await ensureVerificationInvoice(pharmacyA.id);
      const checkoutAttempt = await withPlatformBypass(() => db.billingPayment.findFirstOrThrow({
        where: { invoiceId: invoice.id, provider: "intasend", status: "pending" },
      }));
      const apiRef = checkoutAttempt.attemptRef!;
      const fakeIntasendId = checkoutAttempt.providerRef!;
      assert.ok(apiRef.startsWith("BILL-"));

      // Mismatch amount is rejected
      await assert.rejects(
        completeIntasendBillingPayment({
          apiRef,
          intasendInvoiceId: fakeIntasendId,
          amount: 50, // wrong amount
        }),
        /billing_amount_mismatch/,
      );

      // Correct amount settles invoice
      const settled = await completeIntasendBillingPayment({
        apiRef,
        intasendInvoiceId: fakeIntasendId,
        amount: 100,
        provider: "INTASEND",
      });
      assert.ok(settled);
      assert.equal(settled.status, "paid");

      // Verification payment does NOT automatically approve or activate the pharmacy
      const pharmacy = await withPlatformBypass(() =>
        db.pharmacy.findUniqueOrThrow({ where: { id: pharmacyA.id } }),
      );
      assert.equal(pharmacy.status, "submitted", "Verification fee must not approve pharmacy");
      assert.equal(pharmacy.lifecycleStatus, "onboarding", "Verification fee must not activate pharmacy");

      // 3. Idempotent webhook processing
      const duplicateSettled = await completeIntasendBillingPayment({
        apiRef,
        intasendInvoiceId: fakeIntasendId,
        amount: 100,
        provider: "INTASEND",
      });
      assert.equal(duplicateSettled?.status, "paid", "Duplicate webhook returns paid invoice safely");

      // 4. IntaSend Webhook rejects customer commerce orders
      const { POST: intasendWebhookHandler } = await import("../app/api/webhooks/intasend/route");
      const fakeOrderEvent = new Request("http://localhost:3000/api/webhooks/intasend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge: process.env.INTASEND_WEBHOOK_CHALLENGE || "test",
          state: "COMPLETE",
          api_ref: `ORD_${randomUUID()}`,
          invoice_id: "IS_123",
          value: 1500,
          currency: "KES",
        }),
      });

      const orderRes = await intasendWebhookHandler(fakeOrderEvent);
      // Even if challenge is not configured or fails, it cannot succeed
      assert.ok(orderRes.status === 400 || orderRes.status === 401);
    });

    await st.test("KES 500 monthly platform subscription is distinct", async () => {
      // Start monthly service
      const subInvoice = await startPharmacyService(pharmacyA.id);
      assert.ok(subInvoice.subscriptionId, "Must have an associated subscription");
      assert.equal(Number(subInvoice.totalKes), 500, "Monthly fee must be KES 500");
      assert.ok(subInvoice.number.startsWith("INV-"), "Subscription invoice follows INV- format");

      // Settle monthly subscription
      const fakeSubIntasendId = `IS_SUB_${randomUUID().slice(0, 8)}`;
      const settledSub = await completeIntasendBillingPayment({
        apiRef: subInvoice.number,
        intasendInvoiceId: fakeSubIntasendId,
        amount: 500,
      });
      assert.equal(settledSub?.status, "paid");
    });
  });

  await t.test("2. Pharmacy Daraja Credentials Configuration", async (st) => {
    await st.test("Pharmacy A configures PayBill (CustomerPayBillOnline)", async () => {
      await saveTenantDaraja(pharmacyA.id, {
        shortcode: "174379",
        shortcodeType: "paybill",
        consumerKey: "KeyPharmacyA_Test123",
        consumerSecret: "SecretPharmacyA_Test456",
        passkey: "PasskeyPharmacyA_Test789",
        env: "sandbox",
      });

      // Verify encrypted at rest in canonical IntegrationAccount
      const account = await withPlatformBypass(() =>
        db.integrationAccount.findUniqueOrThrow({
          where: { pharmacyId_kind_provider: { pharmacyId: pharmacyA.id, kind: "daraja", provider: "daraja" } },
        }),
      );
      assert.equal(account.status, "connected");
      assert.ok(account.secretsEnc, "Secrets must be encrypted at rest");
      assert.notEqual(account.secretsEnc, "SecretPharmacyA_Test456", "Secrets must not be stored in plaintext");

      const decrypted = JSON.parse(decryptSecret(account.secretsEnc) || "{}");
      assert.equal(decrypted.consumerKey, "KeyPharmacyA_Test123");
      assert.equal(decrypted.consumerSecret, "SecretPharmacyA_Test456");

      // Resolve tenant credentials
      const credsA = await resolveTenantDarajaCredentials(pharmacyA.id);
      assert.ok(credsA);
      assert.equal(credsA.shortcode, "174379");
      assert.equal(credsA.shortcodeType, "paybill");
      assert.equal(credsA.transactionType, "CustomerPayBillOnline");
      assert.equal(credsA.source, "tenant");
    });

    await st.test("Pharmacy B configures Till (CustomerBuyGoodsOnline)", async () => {
      await saveTenantDaraja(pharmacyB.id, {
        shortcode: "654321",
        shortcodeType: "till",
        consumerKey: "KeyPharmacyB_TestAAA",
        consumerSecret: "SecretPharmacyB_TestBBB",
        passkey: "PasskeyPharmacyB_TestCCC",
        env: "production",
      });

      const credsB = await resolveTenantDarajaCredentials(pharmacyB.id);
      assert.ok(credsB);
      assert.equal(credsB.shortcode, "654321");
      assert.equal(credsB.shortcodeType, "till");
      assert.equal(credsB.transactionType, "CustomerBuyGoodsOnline");
      assert.equal(credsB.env, "production");
      assert.equal(credsB.source, "tenant");
    });

    await st.test("Tenant Isolation: Pharmacy A cannot get Pharmacy B credentials", async () => {
      const credsA = await resolveTenantDarajaCredentials(pharmacyA.id);
      const credsB = await resolveTenantDarajaCredentials(pharmacyB.id);

      assert.equal(credsA?.shortcode, "174379");
      assert.equal(credsB?.shortcode, "654321");
      assert.notEqual(credsA?.consumerKey, credsB?.consumerKey);
    });

    await st.test("Safe settings view masks shortcode and exposes zero secrets", async () => {
      const settingsA = await getPharmacyPaymentSettings(pharmacyA.id);
      assert.equal(settingsA.connected, true);
      assert.equal(settingsA.maskedShortcode, "****4379");
      assert.equal(settingsA.shortcodeType, "paybill");
      assert.equal((settingsA as any).consumerKey, undefined);
      assert.equal((settingsA as any).consumerSecret, undefined);
      assert.equal((settingsA as any).passkey, undefined);
      assert.equal((settingsA as any).secretsEnc, undefined);

      const settingsB = await getPharmacyPaymentSettings(pharmacyB.id);
      assert.equal(settingsB.connected, true);
      assert.equal(settingsB.maskedShortcode, "****4321");
      assert.equal(settingsB.shortcodeType, "till");
    });

    await st.test("Secret rotation preserves blank fields", async () => {
      // Update shortcode without retyping consumer secret
      await saveTenantDaraja(pharmacyA.id, {
        shortcode: "174380",
        consumerSecret: "", // left blank
      });

      const updated = await resolveTenantDarajaCredentials(pharmacyA.id);
      assert.equal(updated?.shortcode, "174380");
      assert.equal(updated?.consumerSecret, "SecretPharmacyA_Test456", "Existing secret preserved");
    });

    await st.test("Disconnect tenant Daraja resets integration", async () => {
      await disconnectTenantDaraja(pharmacyB.id);
      const creds = await resolveTenantDarajaCredentials(pharmacyB.id);
      assert.equal(creds, null);

      const capability = await getPharmacyPaymentCapability(pharmacyB.id);
      assert.equal(capability.onlinePaymentsEnabled, false);
      assert.equal(capability.reason, "not_configured");
    });
  });

  await t.test("3. Customer Commerce Payments (Daraja M-Pesa)", async (st) => {
    // Create an order for Pharmacy A
    const orderA = await withPlatformBypass(() =>
      db.order.create({
        data: {
          pharmacyId: pharmacyA.id,
          total: 850,
          status: "pending",
          currency: "KES",
          guestPhone: "0712345678",
        },
      }),
    );

    // Create an order for Unconfigured Pharmacy
    const orderUnconf = await withPlatformBypass(() =>
      db.order.create({
        data: {
          pharmacyId: pharmacyUnconfigured.id,
          total: 1200,
          status: "pending",
          currency: "KES",
          guestPhone: "0722000000",
        },
      }),
    );

    await st.test("Fails closed without tenant credentials (no platform fallback, no IntaSend)", async () => {
      // Capability check
      const cap = await getPharmacyPaymentCapability(pharmacyUnconfigured.id);
      assert.equal(cap.onlinePaymentsEnabled, false);
      assert.equal(cap.reason, "not_configured");

      // STK push must fail closed with 503
      const result = await initiateStkPayment({
        orderId: orderUnconf.id,
        phone: "0722000000",
      });
      assert.equal(result.ok, false);
      assert.equal(result.error, "daraja_not_configured");
      assert.equal(result.statusCode, 503);
    });

    await st.test("Customer order cannot be checked out with IntaSend", async () => {
      const result = await createIntasendOrderCheckout({
        orderId: orderA.id,
      });
      assert.equal(result.ok, false);
      assert.equal(result.error, "unsupported_payment_method");

      const completeResult = await completeIntasendOrderPayment({
        apiRef: `ORD_${orderA.id}`,
        providerAmount: 850,
      });
      assert.equal(completeResult, null);
    });

    await st.test("initiateStkPayment uses Pharmacy A's credentials and records expected values", async () => {
      // Mock global fetch for Daraja STK push and OAuth
      const originalFetch = globalThis.fetch;
      let usedShortcode: string | undefined;

      globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.includes("oauth")) {
          return Response.json({ access_token: "test_oauth_token", expires_in: "3599" });
        }
        if (url.includes("stkpush/v1/processrequest")) {
          const body = JSON.parse(String(init?.body || "{}"));
          usedShortcode = String(body.BusinessShortCode);
          return Response.json({
            ResponseCode: "0",
            CheckoutRequestID: `ws_CO_${randomUUID().slice(0, 8)}`,
            MerchantRequestID: "merch_123",
            CustomerMessage: "Success",
          });
        }
        return Response.json({ error: "not_found" }, { status: 404 });
      };

      try {
        const res = await initiatePharmacyDarajaPayment({
          orderId: orderA.id,
          phone: "0712345678",
        });

        assert.equal(res.ok, true);
        assert.equal(usedShortcode, "174380", "Must use Pharmacy A's configured shortcode");

        // Verify Payment record
        const payment = await withPlatformBypass(() =>
          db.payment.findUniqueOrThrow({ where: { id: (res as any).paymentId } }),
        );
        assert.equal(payment.pharmacyId, pharmacyA.id);
        assert.equal(payment.orderId, orderA.id);
        assert.equal(payment.provider, "daraja");
        assert.equal(payment.status, "pending");
        assert.equal(Number(payment.expectedAmount), 850);
        assert.equal(payment.expectedShortcode, "174380");
        const retries = await Promise.all([
          initiatePharmacyDarajaPayment({ orderId: orderA.id, phone: "0712345678", forceRetry: true }),
          initiatePharmacyDarajaPayment({ orderId: orderA.id, phone: "0712345678", forceRetry: true }),
        ]);
        assert.ok(retries.every((retry) => !retry.ok && retry.error === "pending_payment_exists"));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await st.test("Daraja payment settlement and idempotency", async () => {
      const payment = await withPlatformBypass(() =>
        db.payment.findFirstOrThrow({
          where: { orderId: orderA.id, provider: "daraja", status: "pending" },
        }),
      );

      // 1. Missing receipt is rejected
      await assert.rejects(
        completeDarajaPayment({
          paymentId: payment.id,
          providerAmount: 850,
          mpesaReceipt: "",
        }),
        /payment_receipt_required/,
      );

      // 2. Amount mismatch is rejected
      await assert.rejects(
        completeDarajaPayment({
          paymentId: payment.id,
          providerAmount: 500, // expected 850
          mpesaReceipt: "QA12345678",
        }),
        /payment_amount_mismatch/,
      );

      // 3. Valid settlement
      const settled = await completeDarajaPayment({
        paymentId: payment.id,
        providerAmount: 850,
        mpesaReceipt: "QA12345678",
        resultDesc: "The service request is processed successfully.",
      });
      assert.equal(settled.status, "paid");
      assert.equal(settled.alreadyDone, false);

      const orderUpdated = await withPlatformBypass(() =>
        db.order.findUniqueOrThrow({ where: { id: orderA.id } }),
      );
      assert.equal(orderUpdated.status, "paid");

      // 4. Duplicate callback idempotency
      const duplicate = await completeDarajaPayment({
        paymentId: payment.id,
        providerAmount: 850,
        mpesaReceipt: "QA12345678",
      });
      assert.equal(duplicate.alreadyDone, true);
    });

    await st.test("parallel partial refunds cannot reserve more than collected", async () => {
      const payment = await withPlatformBypass(() => db.payment.findFirstOrThrow({
        where: { orderId: orderA.id, provider: "daraja", status: "completed" },
      }));
      const requests = await withPharmacy(pharmacyA.id, () => Promise.all([
        createRefund({ paymentId: payment.id, amount: 500, provider: "other", reason: "parallel-check" }),
        createRefund({ paymentId: payment.id, amount: 500, provider: "other", reason: "parallel-check" }),
      ]));
      assert.equal(requests.filter((result) => result.ok).length, 1);
      const reserved = await withPharmacy(pharmacyA.id, () => db.refund.aggregate({
        where: { paymentId: payment.id, status: { in: ["pending", "approved", "completed"] } },
        _sum: { amount: true },
      }));
      assert.equal(Number(reserved._sum.amount), 500);
    });
  });

  await t.test("4. The 1% Commission Invariant", async (st) => {
    await st.test("isPharmacyCommissionEnabled() defaults to false", () => {
      delete process.env.PHARMACY_TRANSACTION_COMMISSION_ENABLED;
      assert.equal(isPharmacyCommissionEnabled(), false);
    });

    await st.test("zero usageRecord created when commission disabled", async () => {
      process.env.PHARMACY_TRANSACTION_COMMISSION_ENABLED = "false";

      // Count usage records for Pharmacy A
      const count = await withPlatformBypass(() =>
        db.usageRecord.count({
          where: { pharmacyId: pharmacyA.id, metric: "transaction_fee_cents" },
        }),
      );
      assert.equal(count, 0, "No usageRecord must exist when commission is disabled");
    });

    await st.test("createTransactionFeeStatement fails closed when commission is disabled", async () => {
      process.env.PHARMACY_TRANSACTION_COMMISSION_ENABLED = "false";
      await assert.rejects(
        createTransactionFeeStatement(),
        /Pharmacy transaction commission is currently disabled/i,
      );
    });
  });

  // The CI database is disposable and audit_logs are intentionally append-only.
  // Keep these randomized fixtures until the database container is destroyed;
  // deleting their pharmacies would violate the audit log RESTRICT foreign key.
});
