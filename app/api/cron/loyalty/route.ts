import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { writeAuditLog } from "@/app/lib/auth";
import { sendDelivery } from "@/app/lib/services/delivery";
import { dispatchPushToUser } from "@/app/lib/services/push";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

/**
 * Daily cron — runs at 06:00 in the project timezone. Three jobs:
 *
 * 1. Birthday bonus: any customer whose DOB == today gets +25 points and a greeting.
 * 2. Refill completion: any refill collected in the last 24h credits +10 points.
 * 3. Order bonus: any order paid in the last 24h credits 1 point per KES 100 spent
 *    (or local currency — multiplier configurable).
 *
 * Configure: `0 6 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/loyalty`
 */

async function processBirthdays(): Promise<number> {
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();
  // Postgres date_part for month and day.
  const customers = await prisma.customerProfile.findMany({
    where: {
      dateOfBirth: { not: null },
      // Approximate match using raw SQL — Prisma doesn't support month/day extraction.
    },
    include: {
      user: { select: { id: true, email: true } },
      loyaltyAccount: true,
      preferences: true,
    },
  });
  // Filter in TS for those whose DOB month/day matches today.
  const birthdayCustomers = customers.filter((c) => {
    if (!c.dateOfBirth) return false;
    const dob = new Date(c.dateOfBirth);
    return dob.getMonth() + 1 === month && dob.getDate() === day;
  });

  let count = 0;
  for (const c of birthdayCustomers) {
    if (!c.loyaltyAccount) continue;
    // Check if we already credited birthday bonus this year.
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: {
        accountId: c.loyaltyAccount.id,
        type: "bonus",
        description: { contains: "Birthday" },
        createdAt: { gte: startOfYear },
      },
    });
    if (existing) continue;

    const bonus = 25;
    const newPoints = c.loyaltyAccount.points + bonus;
    const newLifetime = c.loyaltyAccount.lifetimePoints + bonus;
    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: c.loyaltyAccount.id },
        data: {
          points: newPoints,
          lifetimePoints: newLifetime,
          tier: newPoints >= 1000 ? "platinum" : newPoints >= 400 ? "gold" : newPoints >= 150 ? "silver" : "bronze",
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          accountId: c.loyaltyAccount.id,
          points: bonus,
          type: "bonus",
          description: "Birthday bonus",
          source: "cron:birthday",
        },
      }),
    ]);

    // Send a birthday greeting if customer has consented to birthday messages.
    if (c.preferences?.birthdayMessages !== false && c.user?.email) {
      await sendDelivery({
        channel: "email",
        recipient: { email: c.user.email, phone: c.phone },
        subject: "Happy birthday from Aether Pharmacy! 🎂",
        body: `Hi ${c.fullName},\n\nWishing you a wonderful birthday from all of us at Aether Pharmacy! We've added **${bonus} bonus points** to your loyalty account as a small gift.\n\nStay well,\nThe Aether Pharmacy Team`,
      }).catch(() => {});
      if (c.user.id) {
        await dispatchPushToUser(c.user.id, {
          title: "Happy birthday! 🎂",
          body: `You earned ${bonus} bonus points. Have a wonderful day!`,
          url: "/portal/loyalty",
          data: { tag: "birthday" },
        }).catch(() => {});
      }
    }
    count++;
  }
  return count;
}

async function processRefillCompletions(): Promise<number> {
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const completed = await prisma.refillRequest.findMany({
    where: { status: "collected", statusUpdatedAt: { gte: since } },
    include: { customer: { include: { loyaltyAccount: true } } },
  });
  let count = 0;
  for (const r of completed) {
    if (!r.customer?.loyaltyAccount) continue;
    // Check we haven't already credited for this refill.
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: {
        accountId: r.customer.loyaltyAccount.id,
        source: "cron:refill_completed",
        description: { contains: r.id },
      },
    });
    if (existing) continue;
    const bonus = 10;
    const newPoints = r.customer.loyaltyAccount.points + bonus;
    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: r.customer.loyaltyAccount.id },
        data: {
          points: newPoints,
          lifetimePoints: r.customer.loyaltyAccount.lifetimePoints + bonus,
          tier: newPoints >= 1000 ? "platinum" : newPoints >= 400 ? "gold" : newPoints >= 150 ? "silver" : "bronze",
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          accountId: r.customer.loyaltyAccount.id,
          points: bonus,
          type: "earn",
          description: `Refill completed (${r.medicineName}, ${r.id.slice(0, 8)})`,
          source: "cron:refill_completed",
        },
      }),
    ]);
    count++;
  }
  return count;
}

async function processOrderBonuses(): Promise<number> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  // ── Commerce ledger path (audit §23, §62) ──
  // Drive loyalty from *completed payments*, not order.status='paid'/'updatedAt'.
  // A successfully paid counter order can later become "fulfilled" — the old
  // logic would miss those. The new logic uses Payment.status='completed'
  // joined via Order.customer → LoyaltyAccount.
  const payments = await prisma.payment.findMany({
    where: {
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
          customerId: true,
          status: true,
          waived: true,
          customer: { include: { loyaltyAccount: true } },
        },
      },
    },
  });

  let count = 0;
  for (const p of payments) {
    if (!p.order?.customer?.loyaltyAccount) continue;
    if (p.order.waived) continue; // waived orders do not earn points
    const accountId = p.order.customer.loyaltyAccount.id;
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: {
        accountId,
        source: "cron:order_paid",
        description: { contains: p.order.id },
      },
    });
    if (existing) continue;
    const multiplier = Number(process.env.LOYALTY_SPEND_MULTIPLIER || "0.01");
    const points = Math.max(1, Math.floor(Number(p.amount) * multiplier));
    const newPoints = p.order.customer.loyaltyAccount.points + points;
    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: accountId },
        data: {
          points: newPoints,
          lifetimePoints: p.order.customer.loyaltyAccount.lifetimePoints + points,
          tier: newPoints >= 1000 ? "platinum" : newPoints >= 400 ? "gold" : newPoints >= 150 ? "silver" : "bronze",
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          accountId,
          points,
          type: "earn",
          description: `Order paid (${p.order.id.slice(0, 8)})`,
          source: "cron:order_paid",
        },
      }),
    ]);
    count++;
  }
  return count;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [birthdays, refills, orders] = await Promise.all([
    processBirthdays(),
    processRefillCompletions(),
    processOrderBonuses(),
  ]);
  await writeAuditLog(null, "cron_loyalty_processed", "loyalty_account", undefined, {
    birthdays,
    refills,
    orders,
  });
  return Response.json({ birthdays, refills, orders });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
