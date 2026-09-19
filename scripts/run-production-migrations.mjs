import { spawnSync } from "node:child_process";
import pg from "pg";

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

function buildVerificationConfig(connectionString) {
  const url = new URL(connectionString);
  const hostaddr = process.env.DATABASE_HOSTADDR?.trim();

  if (!hostaddr) {
    return {
      connectionString: url.toString(),
      connectionTimeoutMillis: 30_000,
    };
  }

  return {
    host: hostaddr,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: {
      rejectUnauthorized: false,
      servername: url.hostname,
    },
    connectionTimeoutMillis: 30_000,
  };
}

async function verifyRlsRuntimeRole() {
  const client = new pg.Client(buildVerificationConfig(process.env.DATABASE_URL));
  try {
    await client.connect();
    const role = await client.query(
      "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'afyvia_runtime') AS exists",
    );
    if (!role.rows[0]?.exists) {
      throw new Error("role afyvia_runtime does not exist after migrations");
    }

    await client.query("BEGIN");
    await client.query("SET ROLE afyvia_runtime");
    await client.query("ROLLBACK");
  } finally {
    await client.end().catch(() => {});
  }
}

try {
  await verifyRlsRuntimeRole();
} catch (error) {
  console.error(
    "[db:migrate] RLS runtime role verification failed. Refusing to publish this build:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

console.log("[db:migrate] Production database schema is up to date.");
