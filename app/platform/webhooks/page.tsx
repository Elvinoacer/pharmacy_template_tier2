import { prismaUnscoped } from "@/app/lib/db";
import {
  AdaptiveDataTable,
  AdaptivePlatformPage,
  PlatformSection,
  StatusPill,
  adaptivePlatformStyles as styles,
} from "@/app/platform/_components/AdaptivePlatformPage";

export const metadata = { title: "Webhooks" };
export const dynamic = "force-dynamic";

function toneForEventStatus(value: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = value.toLowerCase();
  if (/success|complete|processed|delivered/.test(normalized)) return "success";
  if (/pending|queued|retry/.test(normalized)) return "warning";
  if (/fail|error|dead|reject/.test(normalized)) return "danger";
  if (/received|processing/.test(normalized)) return "info";
  return "neutral";
}

export default async function WebhooksPage() {
  const [endpoints, events] = await Promise.all([
    prismaUnscoped.webhookEndpoint.findMany({
      take: 50,
      include: { pharmacy: { select: { name: true } } },
    }).catch(() => []),
    prismaUnscoped.webhookEvent.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    }).catch(() => []),
  ]);

  const activeEndpoints = endpoints.filter((endpoint) => endpoint.active).length;
  const recentFailures = events.filter((event) => /fail|error|dead|reject/i.test(event.status)).length;
  const providers = new Set(events.map((event) => event.provider)).size;

  return (
    <AdaptivePlatformPage
      eyebrow="Integration operations"
      title="Webhooks"
      description="Monitor outbound tenant endpoints and inbound provider events with failure signals surfaced before low-priority metadata."
      metrics={[
        { label: "Active endpoints", value: activeEndpoints, hint: `${endpoints.length} endpoint${endpoints.length === 1 ? "" : "s"} loaded` },
        { label: "Recent failures", value: recentFailures, hint: "Across the latest 50 events" },
        { label: "Providers", value: providers, hint: `${events.length} recent event${events.length === 1 ? "" : "s"}` },
      ]}
    >
      <PlatformSection
        title="Tenant endpoints"
        description="Availability and the latest delivery error are visible at a glance; long URLs wrap cleanly on mobile."
      >
        <AdaptiveDataTable
          headers={["Pharmacy", "URL", "Active", "Last error"]}
          empty="No tenant webhook endpoints are configured."
          rows={endpoints.map((endpoint) => ({
            key: endpoint.id,
            cells: [
              <strong key="pharmacy">{endpoint.pharmacy.name}</strong>,
              <span key="url" className={`${styles.mono} ${styles.breakAll}`}>{endpoint.url}</span>,
              <StatusPill key="active" tone={endpoint.active ? "success" : "neutral"}>
                {endpoint.active ? "Active" : "Inactive"}
              </StatusPill>,
              endpoint.lastError ? (
                <span key="error" className={`${styles.breakAll} ${styles.muted}`}>{endpoint.lastError}</span>
              ) : (
                <span key="error" className={styles.soft}>No recent error</span>
              ),
            ],
          }))}
        />
      </PlatformSection>

      <PlatformSection
        title="Recent inbound events"
        description="Status is prioritized ahead of provider event IDs so delivery problems are easier to triage."
      >
        <AdaptiveDataTable
          headers={["Provider", "Type", "Status", "Event id"]}
          empty="No webhook events have been recorded."
          rows={events.map((event) => ({
            key: event.id,
            cells: [
              <strong key="provider">{event.provider}</strong>,
              <span key="type" className={styles.muted}>{event.eventType}</span>,
              <StatusPill key="status" tone={toneForEventStatus(event.status)}>{event.status}</StatusPill>,
              <span key="event-id" className={`${styles.mono} ${styles.breakAll}`}>
                {event.providerEventId || "—"}
              </span>,
            ],
          }))}
        />
      </PlatformSection>
    </AdaptivePlatformPage>
  );
}
