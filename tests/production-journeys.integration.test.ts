import "./test-env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { prismaUnscoped as db } from "../app/lib/db";
import { withPlatformBypass } from "../app/lib/tenant-context";
import { submitApplicationForReview } from "../app/lib/services/pharmacy-application-submission";
import { processJobBatch } from "../app/lib/platform/jobs";
import { loadPharmacySetup, SETUP_SERVICES_DEFERRED_EVENT } from "../app/lib/services/pharmacy-setup";
import { ensureVerificationInvoice } from "../app/lib/platform/pharmacy-enrolment";
import { POST } from "../app/api/webhooks/intasend/route";

test("production journey: callback replay, durable reviewer email and optional services", { skip: !process.env.DATABASE_URL }, async (t) => {
  const originalFetch = globalThis.fetch;
  const keys = ["INTASEND_WEBHOOK_CHALLENGE", "RESEND_API_KEY", "PLATFORM_APPLICATION_REVIEW_EMAIL"];
  const previous = keys.map((key) => process.env[key]);
  process.env.INTASEND_WEBHOOK_CHALLENGE = "isolated-callback-challenge";
  process.env.RESEND_API_KEY = "isolated-test-key";
  process.env.PLATFORM_APPLICATION_REVIEW_EMAIL = "omondielvin@gmail.com";
  let failEmail = true;
  const deliveries: { key: string | null; recipient: unknown }[] = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "https://api.resend.com/emails", "No real external calls in this test");
    deliveries.push({ key: new Headers(init?.headers).get("Idempotency-Key"), recipient: JSON.parse(String(init?.body)).to });
    return Response.json(failEmail ? { message: "Simulated outage" } : { id: "test-email-accepted" }, { status: failEmail ? 503 : 200 });
  };
  t.after(async () => {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
    await db.$disconnect();
  });
  await withPlatformBypass(async () => {
    const owner = await db.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: "test-only", role: "manager" } });
    const pharmacy = await db.pharmacy.create({ data: { name: "Isolated readiness pharmacy", slug: randomUUID(), ownerUserId: owner.id } });
    const invoice = await ensureVerificationInvoice(pharmacy.id);
    const callback = (overrides: object = {}) => POST(new Request("http://localhost/api/webhooks/intasend", {
      method: "POST", body: JSON.stringify({ challenge: "isolated-callback-challenge", api_ref: invoice.number, invoice_id: `IS-${randomUUID()}`, value: 100, currency: "KES", state: "COMPLETE", ...overrides }),
    }));
    assert.equal((await callback({ challenge: "wrong" })).status, 401);
    assert.equal((await callback({ value: 99 })).status, 500);
    assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, "open");
    const providerId = `IS-${randomUUID()}`;
    const responses = await Promise.all([callback({ invoice_id: providerId }), callback({ invoice_id: providerId })]);
    assert.deepEqual(responses.map((r) => r.status), [200, 200]);
    assert.equal(await db.billingPayment.count({ where: { invoiceId: invoice.id, status: "succeeded" } }), 1);
    assert.equal((await db.pharmacy.findUniqueOrThrow({ where: { id: pharmacy.id } })).status, "draft", "Payment cannot approve or silently submit an application");
    await callback({ state: "FAILED" });
    assert.equal((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, "paid");
    await submitApplicationForReview({ pharmacyId: pharmacy.id, actorId: owner.id, expectedStatus: "draft", kind: "submitted" });
    assert.equal((await db.pharmacy.findUniqueOrThrow({ where: { id: pharmacy.id } })).status, "submitted");
    const job = await db.job.findFirstOrThrow({ where: { pharmacyId: pharmacy.id, type: "pharmacy.application.review" } });
    assert.equal(job.status, "failed", "Email outage must remain retryable");
    await submitApplicationForReview({ pharmacyId: pharmacy.id, actorId: owner.id, expectedStatus: "draft", kind: "submitted" });
    assert.equal(await db.job.count({ where: { pharmacyId: pharmacy.id } }), 1, "Repeated submission must not queue another email");
    failEmail = false;
    await db.job.update({ where: { id: job.id }, data: { runAt: new Date(0) } });
    await processJobBatch(1, "test-review-worker", job.id);
    assert.equal((await db.job.findUniqueOrThrow({ where: { id: job.id } })).status, "succeeded");
    assert.equal(deliveries.length, 2);
    assert.equal(deliveries[0].key, deliveries[1].key);
    assert.equal(deliveries[1].recipient, "omondielvin@gmail.com");
    assert.equal((await loadPharmacySetup(pharmacy.id)).checks.find((c) => c.key === "services")?.ok, false);
    await db.pharmacyOnboardingEvent.create({ data: { pharmacyId: pharmacy.id, actorId: owner.id, type: SETUP_SERVICES_DEFERRED_EVENT, message: "Deferred for test" } });
    const setup = await loadPharmacySetup(pharmacy.id);
    assert.equal(setup.checks.find((c) => c.key === "services")?.ok, true);
    assert.equal(setup.counts.services, 0, "Skipping must not publish a pretend service");
    assert.equal(setup.ready, false, "Skipping must not bypass verification or essential profile checks");
  });
});

test("production journey: receive stock, reserve, fulfil once and manage free services", { skip: !process.env.DATABASE_URL }, async (t) => {
  const { withPharmacy } = await import("../app/lib/tenant-context");
  const { prisma } = await import("../app/lib/db");
  const { applyStockChange } = await import("../app/lib/services/stock");
  const { createReservation } = await import("../app/lib/services/commerce/reservations");
  const { markOrderFulfilled } = await import("../app/lib/services/commerce/orders");
  const { createService, updateService, listPublicServices } = await import("../app/lib/services/pharmacy-services");
  t.after(() => db.$disconnect());
  const pharmacy = await withPlatformBypass(() => db.pharmacy.create({ data: { name: "Stock journey test", slug: randomUUID() } }));
  const master = await withPlatformBypass(() => db.medicationMaster.create({ data: { name: "Audit stock medicine", genericName: "Audit stock medicine", slug: randomUUID() } }));
  await withPharmacy(pharmacy.id, async () => {
    const inventory = await prisma.pharmacyInventory.create({ data: { medicationMasterId: master.id, slug: randomUUID(), price: 100, prescriptionRequired: false, overTheCounter: true } });
    await prisma.$transaction((tx) => applyStockChange(tx, { inventoryId: inventory.id, quantityDelta: 10, reason: "purchase_receive", batchNumber: "AUDIT-BATCH", expiryDate: new Date("2030-12-31") }));
    const order = await prisma.order.create({ data: { total: 300, status: "pending", currency: "KES" } });
    await prisma.$transaction((tx) => createReservation(tx, { orderId: order.id, inventoryId: inventory.id, quantity: 3 }));
    assert.equal((await prisma.pharmacyInventory.findUniqueOrThrow({ where: { id: inventory.id } })).currentStock, 10, "Holding stock must not decrement physical stock");
    await Promise.all([
      prisma.$transaction((tx) => markOrderFulfilled(tx, { orderId: order.id })),
      prisma.$transaction((tx) => markOrderFulfilled(tx, { orderId: order.id })),
    ]);
    assert.equal((await prisma.pharmacyInventory.findUniqueOrThrow({ where: { id: inventory.id } })).currentStock, 7, "Concurrent fulfil clicks must deduct stock once");
    assert.equal(await prisma.stockMovement.count({ where: { pharmacyInventoryId: inventory.id, reason: "sale" } }), 1);
    await assert.rejects(prisma.$transaction((tx) => applyStockChange(tx, { inventoryId: inventory.id, quantityDelta: -8, reason: "adjust" })), /Insufficient stock/);
    const input = { short: "Service test", description: "Service test description", active: true, bookable: true };
    const first = await createService({ ...input, title: "Blood pressure check" });
    await createService({ ...input, title: "Pharmacist consultation" });
    await assert.rejects(createService({ ...input, title: "Third active service" }), /free plan|FREE_SERVICE_LIMIT/i);
    await updateService(first.id, { active: false });
    await createService({ ...input, title: "Third active service" });
    assert.equal((await listPublicServices()).length, 2);
  });
});
