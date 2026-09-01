import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { ensureDefaultPlans } from "@/app/lib/platform/billing";

export const metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  await ensureDefaultPlans().catch(() => {});
  const plans = await prismaUnscoped.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { features: true },
  }).catch(() => []);

  return (
    <PlatformPage title="Plans" description="Entitlements attached to each SaaS plan.">
      <PlatformTable
        headers={["Plan", "Price", "Features"]}
        empty="No plans."
        rows={plans.map((p) => [
          p.name,
          `KES ${Number(p.priceKes).toLocaleString("en-KE")} / ${p.interval}`,
          p.features.map((f) => `${f.key}${f.limitInt != null ? ` (${f.limitInt})` : ""}`).join(", ") || "—",
        ])}
      />
    </PlatformPage>
  );
}
