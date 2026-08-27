import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "../app/lib/db/config";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (.env / .env.local)");

  const parsed = new URL(url);
  console.log("Connecting to", parsed.hostname, parsed.pathname);
  console.log(
    "DATABASE_HOSTADDR:",
    process.env.DATABASE_HOSTADDR?.trim() || "(not set — using DNS)",
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg(buildPostgresConfig(url)),
  });

  const n = await prisma.user.count();
  console.log("users via PrismaPg:", n);

  const jane = await prisma.user.findUnique({
    where: { email: "jane@example.com" },
    include: { profile: true },
  });
  console.log("jane:", jane?.email ?? "(not seeded)", jane?.profile?.fullName ?? "");

  await prisma.$disconnect();
  console.log("OK — database reachable via Prisma");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
