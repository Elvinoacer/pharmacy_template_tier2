const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const refillByStatus = await prisma.refillRequest.groupBy({
      by: ["status"],
      _count: true,
    });
    console.log(JSON.stringify(refillByStatus, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
