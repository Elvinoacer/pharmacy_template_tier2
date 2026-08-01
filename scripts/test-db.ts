import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("no DATABASE_URL");
  const prisma = new PrismaClient({
    adapter: new PrismaNeonHttp(url, { arrayMode: false, fullResults: true }),
  });
  const n = await prisma.user.count();
  console.log("users via PrismaNeonHttp:", n);
  const jane = await prisma.user.findUnique({
    where: { email: "jane@example.com" },
    include: { profile: true },
  });
  console.log("jane:", jane?.email, jane?.profile?.fullName);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
