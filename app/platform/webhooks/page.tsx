import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Webhooks" };
export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const [endpoints, events] = await Promise.all([
    prismaUnscoped.webhookEndpoint.findMany({ take: 50, include: { pharmacy: { select: { name: true } } } }).catch(() => []),
    prismaUnscoped.webhookEvent.findMany({ take: 50, orderBy: { createdAt: "desc" } }).catch(() => []),
  ]);

  return (
    <PlatformPage title="Webhooks" description="Inbound provider events and outbound tenant endpoints.">
      <h2 className="mb-3 text-lg font-semibold">Endpoints</h2>
      <PlatformTable
        headers={["Pharmacy", "URL", "Active", "Last error"]}
        empty="No tenant webhook endpoints."
        rows={endpoints.map((e) => [e.pharmacy.name, e.url, e.active ? "yes" : "no", e.lastError || "—"])}
      />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Recent events</h2>
      <PlatformTable
        headers={["Provider", "Type", "Status", "Event id"]}
        empty="No webhook events."
        rows={events.map((e) => [e.provider, e.eventType, e.status, e.providerEventId || "—"])}
      />
    </PlatformPage>
  );
}
