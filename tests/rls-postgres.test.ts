import "./test-env";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";


const hasDb = Boolean(process.env.DATABASE_URL);

describe("PostgreSQL RLS GUC", { skip: !hasDb }, () => {
  it("withPharmacy sets app.pharmacy_id on the connection used by Prisma", async () => {
    const { prismaUnscoped } = await import("@/app/lib/db/prisma");
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
    const { prismaUnscoped } = await import("@/app/lib/db/prisma");
    const rows = await withPlatformBypass(async () =>
      prismaUnscoped.$queryRaw<Array<{ pharmacy_id: string | null; bypass: string | null }>>`
        SELECT current_setting('app.pharmacy_id', true) AS pharmacy_id,
               current_setting('app.platform_bypass', true) AS bypass
      `,
    );
    assert.equal(rows[0]?.bypass, "1");
  });

  it("blocks tenant B from tenant A usage rows and denies empty context", async () => {
    const { prismaUnscoped } = await import("@/app/lib/db/prisma");
    const pharmacies = await withPlatformBypass(() =>
      prismaUnscoped.pharmacy.findMany({ take: 2, select: { id: true } }),
    );
    if (pharmacies.length < 2) return;

    const [a, b] = pharmacies;
    const eventId = `rls-test:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    await withPlatformBypass(async () =>
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

    const asA = await withPharmacy(a.id, async () =>
      prismaUnscoped.usageRecord.findMany({ where: { eventId } }),
    );
    const asB = await withPharmacy(b.id, async () =>
      prismaUnscoped.usageRecord.findMany({ where: { eventId } }),
    );
    const asNone = await prismaUnscoped.usageRecord.findMany({ where: { eventId } });
    const asPlatform = await withPlatformBypass(async () =>
      prismaUnscoped.usageRecord.findMany({ where: { eventId } }),
    );

    assert.equal(asA.length, 1);
    assert.equal(asB.length, 0);
    assert.equal(asNone.length, 0);
    assert.equal(asPlatform.length, 1);

    await withPlatformBypass(async () => prismaUnscoped.usageRecord.deleteMany({ where: { eventId } }));
  });

  it("aborts query and throws fatal error when SET ROLE fails in strict/production mode", async () => {
    const { applyRlsGuc } = await import("@/app/lib/db/rls");
    const prevStrict = process.env.STRICT_RLS;
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.STRICT_RLS = "true";
      const failingClient = {
        query: async (sql: string) => {
          if (sql.startsWith("SET ROLE")) {
            throw new Error("permission denied to set role afyvia_runtime");
          }
          return { rows: [] };
        },
      };
      await assert.rejects(
        async () => {
          await applyRlsGuc(failingClient, { bypass: false, pharmacyId: "11111111-1111-4111-a111-111111111111" });
        },
        /FATAL: Failed to establish RLS runtime role/,
      );
    } finally {
      process.env.STRICT_RLS = prevStrict;
      Object.assign(process.env, { NODE_ENV: prevEnv });
    }
  });

  it("maintains tenant isolation concurrently without global state leakage", async () => {
    const tenantA = "11111111-1111-4111-a111-111111111111";
    const tenantB = "22222222-2222-4222-a222-222222222222";
    const { resolveRlsScope } = await import("@/app/lib/db/rls");

    const runA = withPharmacy(tenantA, async () => {
      await new Promise((r) => setTimeout(r, 20));
      const s = await resolveRlsScope();
      assert.equal(s.pharmacyId, tenantA);
      assert.equal(s.bypass, false);
      return s;
    });

    const runB = withPharmacy(tenantB, async () => {
      await new Promise((r) => setTimeout(r, 10));
      const s = await resolveRlsScope();
      assert.equal(s.pharmacyId, tenantB);
      assert.equal(s.bypass, false);
      return s;
    });

    const runPlatform = withPlatformBypass(async () => {
      await new Promise((r) => setTimeout(r, 15));
      const s = await resolveRlsScope();
      assert.equal(s.pharmacyId, null);
      assert.equal(s.bypass, true);
      return s;
    });

    await Promise.all([runA, runB, runPlatform]);
  });
});

