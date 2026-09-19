import path from "node:path";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "../app/lib/db/config";
import { createRlsPool } from "../app/lib/db/rls";
import { withPlatformBypass } from "../app/lib/tenant-context";
import { seedDirectoryPharmacies } from "../prisma/seed-directory-pharmacies";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for directory seeding");

const prisma = new PrismaClient({
  adapter: new PrismaPg(createRlsPool(buildPostgresConfig(connectionString))),
});

async function main() {
  const ddlPool = new pg.Pool({ connectionString });
  try {
    await ddlPool.query(`
      ALTER TABLE "pharmacies"
        ADD COLUMN IF NOT EXISTS "is_seeded" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "seeded_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "seeded_source_url" TEXT
    `);
    await ddlPool.query(`
      CREATE INDEX IF NOT EXISTS "pharmacies_is_seeded_idx" ON "pharmacies"("is_seeded")
    `);
  } finally {
    await ddlPool.end();
  }

  await withPlatformBypass(async () => {
    const count = await seedDirectoryPharmacies(prisma);
    console.log(`Upserted ${count} Kenya directory pharmacies.`);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
