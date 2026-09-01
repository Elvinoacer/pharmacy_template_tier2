import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Usage" };
export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const rows = await prismaUnscoped.usageRecord.groupBy({
    by: ["pharmacyId", "metric", "period"],
    _sum: { quantity: true },
    orderBy: { period: "desc" },
    take: 80,
  }).catch(() => []);

  const pharmacies = await prismaUnscoped.pharmacy.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.pharmacyId))] } },
    select: { id: true, name: true },
  }).catch(() => []);
  const names = Object.fromEntries(pharmacies.map((p) => [p.id, p.name]));

  return (
    <PlatformPage title="Usage metering" description="SMS, WhatsApp, AI, orders and other billable meters.">
      <PlatformTable
        headers={["Pharmacy", "Metric", "Period", "Quantity"]}
        empty="No usage recorded."
        rows={rows.map((r) => [names[r.pharmacyId] || r.pharmacyId.slice(0, 8), r.metric, r.period, String(r._sum.quantity ?? 0)])}
      />
    </PlatformPage>
  );
}
