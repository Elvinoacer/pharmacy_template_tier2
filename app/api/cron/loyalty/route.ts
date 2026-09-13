import type { NextRequest } from "next/server";
import type { LoyaltyTxType } from "@/app/generated/prisma/client";
import { prisma, prismaUnscoped } from "@/app/lib/db";
import { writeAuditLog } from "@/app/lib/auth";
import { sendDelivery } from "@/app/lib/services/delivery";
import { dispatchPushToUser } from "@/app/lib/services/push";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";
import { isCronAuthorized } from "@/app/lib/cron-auth";

export const runtime = "nodejs";

function tierFor(points: number) {
  return points >= 1000 ? "platinum" : points >= 400 ? "gold" : points >= 150 ? "silver" : "bronze";
}

/**
 * Serialize one logical loyalty award using a transaction-scoped PostgreSQL
 * advisory lock. The lock + exact account/source/idempotency marker makes the
 * balance increment and ledger insert atomic across retries/overlapping workers.
 */
async function awardOnce(opts: {
  accountId: string;
  idempotencyKey: string;
  source: string;
  description: string;
  points: number;
  type?: LoyaltyTxType;
}) {
  if (!Number.isFinite(opts.points) || opts.points <= 0) return false;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${opts.idempotencyKey}))`;

    const marker = `[${opts.idempotencyKey}]`;
    const existing = await tx.loyaltyTransaction.findFirst({
      where: {
        accountId: opts.accountId,
        source: opts.source,
        description: { endsWith: marker },
      },
      select: { id: true },
    });
    if (existing) return false;

    const account = await tx.loyaltyAccount.findUnique({
      where: { id: opts.accountId },
      select: { points: true },
    });
    if (!account) return false;

    const nextPoints = account.points + opts.points;
    await tx.loyaltyAccount.update({
      where: { id: opts.accountId },
      data: {
        points: { increment: opts.points },
        lifetimePoints: { increment: opts.points },
        tier: tierFor(nextPoints),
      },
    });
    await tx.loyaltyTransaction.create({
      data: {
        accountId: opts.accountId,
        points: opts.points,
        type: opts.type ?? "earn",
        description: `${opts.description} ${marker}`,
        source: opts.source,
      },
    });
    return true;
  });
}

async function processBirthdays(pharmacyId: string, pharmacyName: string): Promise<number> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();

  // Filter birthdays in PostgreSQL rather than loading every loyalty member for
  // every pharmacy into application memory on every daily run.
  const due = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT la.id
      FROM loyalty_accounts la
      JOIN customer_profiles cp ON cp.id = la.customer_id
     WHERE la.pharmacy_id = ${pharmacyId}::uuid
       AND cp.date_of_birth IS NOT NULL
       AND EXTRACT(MONTH FROM cp.date_of_birth) = ${month}
       AND EXTRACT(DAY FROM cp.date_of_birth) = ${day}
  `;
  if (!due.length) return 0;

  const accounts = await prisma.loyaltyAccount.findMany({
    where: { pharmacyId, id: { in: due.map((r) => r.id) } },
    include: {
      customer: {
        include: {
          user: { select: { id: true, email: true } },
          preferences: true,
        },
      },
    },
  });

  let count = 0;
  for (const account of accounts) {
    const bonus = 25;
    const key = `birthday:${pharmacyId}:${account.customerId}:${year}`;
    const awarded = await awardOnce({
      accountId: account.id,
      idempotencyKey: key,
      source: "cron:birthday",
      description: "Birthday bonus",
      points: bonus,
      type: "bonus",
    });
    if (!awarded) continue;

    const c = account.customer;
    if (c.preferences?.birthdayMessages !== false && c.user?.email) {
      await sendDelivery({
        channel: "email",
        recipient: { email: c.user.email, phone: c.phone },
        subject: `Happy birthday from ${pharmacyName}! 🎂`,
        body: `Hi ${c.fullName},\n\nWishing you a wonderful birthday from all of us at ${pharmacyName}! We've added ${bonus} bonus points to your loyalty account.\n\nStay well,\n${pharmacyName}`,
      }).catch(() => {});
      await dispatchPushToUser(c.user.id, {
        title: `Happy birthday from ${pharmacyName}! 🎂`,
        body: `You earned ${bonus} bonus points. Have a wonderful day!`,
        url: "/portal/loyalty",
        data: { tag: "birthday", pharmacyId },
      }).catch(() => {});
    }
    count++;
  }
  return count;
}

async function processRefillCompletions(pharmacyId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const completed = await prisma.refillRequest.findMany({
    where: {
      pharmacyId,
      status: "collected",
      statusUpdatedAt: { gte: since },
      customerId: { not: null },
    },
    select: {
      id: true,
      pharmacyId: true,
      customerId: true,
      medicineName: true,
    },
  });
  const customerIds = [...new Set(completed.map((r) => r.customerId).filter((v): v is string => Boolean(v)))];
  if (!customerIds.length) return 0;
  const accounts = await prisma.loyaltyAccount.findMany({
    where: { pharmacyId, customerId: { in: customerIds } },
    select: { id: true, customerId: true },
  });
  const byCustomer = new Map(accounts.map((a) => [a.customerId, a.id]));

  let count = 0;
  for (const refill of completed) {
    if (!refill.customerId) continue;
    const accountId = byCustomer.get(refill.customerId);
    if (!accountId) continue;

    const bonus = 10;
    const key = `refill:${refill.pharmacyId}:${refill.id}`;
    if (
      await awardOnce({
        accountId,
        idempotencyKey: key,
        source: "cron:refill_completed",
        description: `Refill completed (${refill.medicineName})`,
        points: bonus,
      })
    ) count++;
  }
  return count;
}

async function processOrderBonuses(pharmacyId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const integration = await prisma.pharmacyIntegration.findUnique({
    where: { pharmacyId },
    select: { loyaltySpendMultiplier: true },
  });
  const envMultiplier = Number(process.env.LOYALTY_SPEND_MULTIPLIER);
  const defaultMultiplier =
    Number.isFinite(envMultiplier) && envMultiplier > 0 ? envMultiplier : 0.01;
  const multiplier = Number(integration?.loyaltySpendMultiplier ?? defaultMultiplier);

  const payments = await prisma.payment.findMany({
    where: {
      pharmacyId,
      status: "completed",
      OR: [
        { paidAt: { gte: since } },
        { paidAt: null, updatedAt: { gte: since } },
      ],
    },
    include: {
      order: {
        select: {
          id: true,
          pharmacyId: true,
          customerId: true,
          waived: true,
        },
      },
    },
  });
  const customerIds = [...new Set(payments.map((p) => p.order?.customerId).filter((v): v is string => Boolean(v)))];
  if (!customerIds.length) return 0;
  const accounts = await prisma.loyaltyAccount.findMany({
    where: { pharmacyId, customerId: { in: customerIds } },
    select: { id: true, customerId: true },
  });
  const byCustomer = new Map(accounts.map((a) => [a.customerId, a.id]));

  let count = 0;
  for (const payment of payments) {
    const order = payment.order;
    if (!order?.customerId || order.waived || order.pharmacyId !== pharmacyId) continue;
    const accountId = byCustomer.get(order.customerId);
    if (!accountId) continue;

    const points = Math.max(1, Math.floor(Number(payment.amount) * multiplier));
    const key = `order:${pharmacyId}:${order.id}`;
    if (
      await awardOnce({
        accountId,
        idempotencyKey: key,
        source: "cron:order_paid",
        description: `Order paid (${order.id.slice(0, 8)})`,
        points,
      })
    ) count++;
  }
  return count;
}

async function processTenant(pharmacyId: string, pharmacyName: string) {
  return withPharmacy(pharmacyId, async () => {
    const [birthdays, refills, orders] = await Promise.all([
      processBirthdays(pharmacyId, pharmacyName),
      processRefillCompletions(pharmacyId),
      processOrderBonuses(pharmacyId),
    ]);

    await writeAuditLog(null, "cron_loyalty_processed", "loyalty_account", undefined, {
      pharmacyId,
      birthdays,
      refills,
      orders,
    });
    return { pharmacyId, birthdays, refills, orders };
  });
}

async function runLoyaltyCron(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Global bypass is used only to enumerate tenants. Business writes run under
  // explicit tenant context below, reducing the blast radius of missing filters.
  const pharmacies = await withPlatformBypass(() =>
    prismaUnscoped.pharmacy.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  );

  const results: Array<{
    pharmacyId: string;
    birthdays: number;
    refills: number;
    orders: number;
    error?: string;
  }> = [];

  for (const pharmacy of pharmacies) {
    try {
      results.push(await processTenant(pharmacy.id, pharmacy.name));
    } catch (err) {
      console.error("[cron loyalty] tenant failed", pharmacy.id, err);
      results.push({
        pharmacyId: pharmacy.id,
        birthdays: 0,
        refills: 0,
        orders: 0,
        error: err instanceof Error ? err.message : "tenant_failed",
      });
    }
  }

  const totals = results.reduce(
    (acc, row) => ({
      birthdays: acc.birthdays + row.birthdays,
      refills: acc.refills + row.refills,
      orders: acc.orders + row.orders,
      failedTenants: acc.failedTenants + (row.error ? 1 : 0),
    }),
    { birthdays: 0, refills: 0, orders: 0, failedTenants: 0 },
  );

  return Response.json({ ...totals, tenants: results.length, results });
}

export async function GET(request: NextRequest) {
  return runLoyaltyCron(request);
}

export async function POST(request: NextRequest) {
  return runLoyaltyCron(request);
}
