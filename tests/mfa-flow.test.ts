import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { it } from "node:test";
import { config as loadEnv } from "dotenv";
import { totpCode } from "../app/lib/platform/totp";
import { withPlatformBypass } from "../app/lib/tenant-context";

loadEnv({ path: path.resolve(process.cwd(), ".env"), quiet: true });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true, quiet: true });

it("MFA enrollment, retry, recovery, and network audit work without pharmacy membership", { skip: !process.env.DATABASE_URL }, async () => {
  const { prismaUnscoped: db } = await import("../app/lib/db");
  const { enrollMfa, confirmMfa, verifyUserMfa } = await import("../app/lib/platform/mfa");
  const { recordAuditRequired } = await import("../app/lib/platform/audit");
  const user = await db.user.create({ data: { email: `mfa-test-${randomUUID()}@example.test`, platformAdmin: true, platformRole: "super_admin", role: "manager" } });
  try {
    const setup = await enrollMfa(user.id, user.email);
    assert.equal(setup.recoveryCodes.length, 8);
    assert.equal(await confirmMfa(user.id, "invalid"), false);
    const pending = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(pending.twoFactorSecret, setup.secret);
    assert.equal(pending.twoFactorEnabled, false);
    assert.equal(await confirmMfa(user.id, totpCode(setup.secret)), true);
    await assert.rejects(() => enrollMfa(user.id, user.email), /already enabled/);
    assert.equal(await verifyUserMfa(user.id, totpCode(setup.secret)), true);
    const recovered = await Promise.all([verifyUserMfa(user.id, setup.recoveryCodes[0]), verifyUserMfa(user.id, setup.recoveryCodes[0])]);
    assert.equal(recovered.filter(Boolean).length, 1, "A recovery code can only be consumed once, even concurrently");
    await recordAuditRequired({ actorType: "test", action: "test.mfa.network", resource: "user", resourceId: user.id });
    const events = await withPlatformBypass(async () => db.auditLog.findMany({ where: { entityId: user.id } }));
    assert.equal(events.length, 1);
    assert.equal(events[0].pharmacyId, null);
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
