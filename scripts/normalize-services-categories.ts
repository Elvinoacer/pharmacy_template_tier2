/**
 * One-shot helper: normalize public category visibility after migrate/seed.
 * Run: npx tsx scripts/normalize-services-categories.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPostgresConfig } from "../app/lib/db/config";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const adapter = new PrismaPg(buildPostgresConfig(process.env.DATABASE_URL!));
const prisma = new PrismaClient({ adapter });

const publicSlugs = [
  "pain-relief",
  "cold-flu",
  "allergy",
  "allergy-treatments",
  "digestive",
  "digestive-health",
  "first-aid",
  "topical-treatments",
  "skin-care",
  "antiseptics",
  "wound-care",
  "oral-care",
  "womens-health",
  "feminine-hygiene",
  "baby-care",
  "medical-consumables",
  "diabetes-care",
  "vitamins-supplements",
  "nutritional-products",
];

async function main() {
  await prisma.medicationCategory.updateMany({ data: { publicVisible: false } });
  await prisma.medicationCategory.updateMany({
    where: { slug: { in: publicSlugs } },
    data: { publicVisible: true },
  });

  const masters = await prisma.medicationMaster.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  console.log(
    "master categories:",
    masters.map((m) => `${m.category}:${m._count._all}`).join(", ") || "(none)",
  );

  const pub = await prisma.medicationCategory.findMany({
    where: { publicVisible: true },
    select: { slug: true, name: true, imageUrl: true },
    orderBy: { sortOrder: "asc" },
  });
  console.log(
    "public cats:",
    pub.map((c) => `${c.slug} img=${Boolean(c.imageUrl)}`).join(" | "),
  );

  const svcs = await prisma.pharmacyService.findMany({
    select: { slug: true, price: true, bookable: true },
    orderBy: { sortOrder: "asc" },
  });
  console.log(
    "services:",
    svcs.map((s) => `${s.slug}@${s.price ?? "free"}`).join(", "),
  );
  console.log(`OK — ${svcs.length} services, ${pub.length} public categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
