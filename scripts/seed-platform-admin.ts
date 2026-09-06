/** Add one platform administrator without running the destructive demo seed. */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "../app/lib/db/config";
import { validatePassword } from "../app/lib/password";

loadEnv({ path: path.resolve(process.cwd(), ".env"), quiet: true });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true, quiet: true });

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const url = process.env.DATABASE_URL;
  if (!url || !email || !password) throw new Error("Set DATABASE_URL, PLATFORM_ADMIN_EMAIL, and PLATFORM_ADMIN_PASSWORD.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid administrator email is required.");
  const invalid = validatePassword(password);
  if (invalid) throw new Error(invalid);
  const prisma = new PrismaClient({ adapter: new PrismaPg(buildPostgresConfig(url)) });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.status !== "active") throw new Error("This account is inactive. Review its status before granting access.");
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash: await bcrypt.hash(password, 12), role: "manager", status: "active", platformAdmin: true, platformRole: "super_admin", mfaEnforced: true },
      // Preserve an existing password, identity, memberships, and authenticator.
      update: { platformAdmin: true, platformRole: "super_admin", mfaEnforced: true },
      select: { id: true, email: true, twoFactorEnabled: true },
    });
    if (!existing?.platformAdmin) {
      await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    console.log(`Platform admin ready: ${user.email}. ${existing ? "Existing password preserved." : "Requested password set."}`);
    console.log(user.twoFactorEnabled ? "Sign in and verify with your existing authenticator." : "Sign in at /login, then complete authenticator setup at /platform/security.");
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Admin setup failed."); process.exitCode = 1; });
