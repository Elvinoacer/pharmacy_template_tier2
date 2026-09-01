import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Delivery" };
export const dynamic = "force-dynamic";

export default async function PlatformNotificationsPage() {
  const rows = await prismaUnscoped.notificationDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { pharmacy: { select: { name: true } } },
  }).catch(() => []);

  return (
    <PlatformPage title="Notification delivery" description="Queued, sent, failed and dead-lettered tenant messages.">
      <PlatformTable
        headers={["Pharmacy", "Channel", "Status", "Attempts", "Error"]}
        empty="No deliveries yet."
        rows={rows.map((r) => [r.pharmacy.name, r.channel, r.status, String(r.attempt), r.error || "—"])}
      />
    </PlatformPage>
  );
}
