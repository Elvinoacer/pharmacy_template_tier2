import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Subscriptions" };
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const rows = await prismaUnscoped.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { plan: true, pharmacy: { select: { name: true, slug: true, lifecycleStatus: true } } },
  }).catch(() => []);

  return (
    <PlatformPage title="Subscriptions" description="Tenant SaaS subscriptions and trial windows.">
      <PlatformTable
        headers={["Pharmacy", "Lifecycle", "Plan", "Status", "Trial ends"]}
        empty="No subscriptions."
        rows={rows.map((s) => [
          s.pharmacy.name,
          s.pharmacy.lifecycleStatus,
          s.plan.name,
          s.status,
          s.trialEndsAt ? s.trialEndsAt.toISOString().slice(0, 10) : "—",
        ])}
      />
    </PlatformPage>
  );
}
