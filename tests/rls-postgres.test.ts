import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { config as loadEnv } from "dotenv";
import { withPharmacy, withPlatformBypass } from "../app/lib/tenant-context";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const hasDb = Boolean(process.env.DATABASE_URL);

describe("PostgreSQL RLS GUC", { skip: !hasDb }, () => {
  it("withPharmacy sets app.pharmacy_id on the connection used by Prisma", async () => {
    const { prismaUnscoped } = await import("../app/lib/db/prisma");
    const tenant = "11111111-1111-4111-a111-111111111111";
    const rows = await withPharmacy(tenant, async () =>
      prismaUnscoped.$queryRaw<Array<{ pharmacy_id: string | null; bypass: string | null }>>`
        SELECT current_setting('app.pharmacy_id', true) AS pharmacy_id,
               current_setting('app.platform_bypass', true) AS bypass
      `,
    );
    assert.equal(rows[0]?.pharmacy_id, tenant);
    assert.equal(rows[0]?.bypass ?? "", "");
  });

  it("withPlatformBypass sets app.platform_bypass=1", async () => {
    const { prismaUnscoped } = await import("../app/lib/db/prisma");
    const rows = await withPlatformBypass(async () =>
      prismaUnscoped.$queryRaw<Array<{ pharmacy_id: string | null; bypass: string | null }>>`
        SELECT current_setting('app.pharmacy_id', true) AS pharmacy_id,
               current_setting('app.platform_bypass', true) AS bypass
      `,
    );
    assert.equal(rows[0]?.bypass, "1");
  });

  it("blocks tenant B from tenant A usage rows and denies empty context", async () => {
    const { prismaUnscoped } = await import("../app/lib/db/prisma");
    const pharmacies = await withPlatformBypass(() =>
      prismaUnscoped.pharmacy.findMany({ take: 2, select: { id: true } }),
    );
    if (pharmacies.length < 2) return;

    const [a, b] = pharmacies;
    const eventId = `rls-test:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    await withPlatformBypass(() =>
      prismaUnscoped.usageRecord.create({
        data: {
          pharmacyId: a.id,
          metric: "rls_test",
          quantity: 1,
          period: "2099-01",
          eventId,
          billable: false,
        },
      }),
    );

    const asA = await withPharmacy(a.id, () =>
      prismaUnscoped.usageRecord.findMany({ where: { eventId } }),
    );
    const asB = await withPharmacy(b.id, () =>
      prismaUnscoped.usageRecord.findMany({ where: { eventId } }),
    );
    const asNone = await prismaUnscoped.usageRecord.findMany({ where: { eventId } });
    const asPlatform = await withPlatformBypass(() =>
      prismaUnscoped.usageRecord.findMany({ where: { eventId } }),
    );

    assert.equal(asA.length, 1);
    assert.equal(asB.length, 0);
    assert.equal(asNone.length, 0);
    assert.equal(asPlatform.length, 1);

    await withPlatformBypass(() => prismaUnscoped.usageRecord.deleteMany({ where: { eventId } }));
  });
});
