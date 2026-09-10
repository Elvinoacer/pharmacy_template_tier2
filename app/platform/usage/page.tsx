import { prismaUnscoped } from "@/app/lib/db";
import {
  AdaptiveDataTable,
  AdaptivePlatformPage,
  PlatformSection,
  StatusPill,
  adaptivePlatformStyles as styles,
} from "@/app/platform/_components/AdaptivePlatformPage";

export const metadata = { title: "Usage" };
export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const rows = await prismaUnscoped.usageRecord.groupBy({
    by: ["pharmacyId", "metric", "period"],
    _sum: { quantity: true },
    orderBy: { period: "desc" },
    take: 80,
  }).catch(() => []);

  const pharmacyIds = [...new Set(rows.map((row) => row.pharmacyId))];
  const pharmacies = await prismaUnscoped.pharmacy.findMany({
    where: { id: { in: pharmacyIds } },
    select: { id: true, name: true },
  }).catch(() => []);
  const names = Object.fromEntries(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy.name]));
  const metricCount = new Set(rows.map((row) => row.metric)).size;
  const latestPeriod = rows[0]?.period || "—";

  return (
    <AdaptivePlatformPage
      eyebrow="Billing telemetry"
      title="Usage metering"
      description="Scan billable activity by tenant, metric and period. Mobile cards keep quantities and billing periods readable without horizontal scrolling."
      metrics={[
        { label: "Meter groups", value: rows.length, hint: "Latest 80 grouped records" },
        { label: "Metrics", value: metricCount, hint: "Distinct billable meter types" },
        { label: "Latest period", value: latestPeriod, hint: `${pharmacyIds.length} tenant${pharmacyIds.length === 1 ? "" : "s"} represented` },
      ]}
    >
      <PlatformSection
        title="Meter activity"
        description="Tenant and metric identity stay prominent while quantity remains easy to compare across periods."
      >
        <AdaptiveDataTable
          headers={["Pharmacy", "Metric", "Period", "Quantity"]}
          empty="No billable usage has been recorded."
          rows={rows.map((row) => ({
            key: `${row.pharmacyId}-${row.metric}-${row.period}`,
            cells: [
              <div key="pharmacy" className={styles.userIdentity}>
                <p className={styles.userName}>{names[row.pharmacyId] || row.pharmacyId.slice(0, 8)}</p>
                {!names[row.pharmacyId] ? (
                  <p className={styles.userEmail}>Tenant identifier</p>
                ) : null}
              </div>,
              <StatusPill key="metric" tone="info">{row.metric}</StatusPill>,
              <span key="period" className={styles.mono}>{row.period}</span>,
              <strong key="quantity">{String(row._sum.quantity ?? 0)}</strong>,
            ],
          }))}
        />
      </PlatformSection>
    </AdaptivePlatformPage>
  );
}
