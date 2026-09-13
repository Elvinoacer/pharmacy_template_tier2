import { spawnSync } from "node:child_process";

const vercelEnv = process.env.VERCEL_ENV;

if (vercelEnv !== "production") {
  console.log(`[db:migrate] Skipping Prisma migrations for VERCEL_ENV=${vercelEnv ?? "local"}.`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[db:migrate] DATABASE_URL is required for production migrations.");
  process.exit(1);
}

console.log("[db:migrate] Applying pending Prisma migrations before the production build...");

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["--no-install", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("[db:migrate] Failed to start Prisma migration process:", result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[db:migrate] Prisma migrate deploy exited with status ${result.status}.`);
  process.exit(result.status ?? 1);
}

console.log("[db:migrate] Production database schema is up to date.");
