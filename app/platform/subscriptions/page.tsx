import { prismaUnscoped } from "@/app/lib/db";
import {
  AdaptiveDataTable,
  AdaptivePlatformPage,
  PlatformSection,
  StatusPill,
  adaptivePlatformStyles as styles,
} from "@/app/platform/_components/AdaptivePlatformPage";

export const metadata = { title: "Subscriptions" };
export const dynamic = "force-dynamic";

function toneForStatus(value: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = value.toLowerCase();
  if (/active|live|paid|complete/.test(normalized)) return "success";
  if (/trial|pending|onboard|grace/.test(normalized)) return "warning";
  if (/cancel|suspend|fail|expired|past_due/.test(normalized)) return "danger";
  if (/scheduled|change/.test(normalized)) return "info";
  return "neutral";
}

export default async function SubscriptionsPage() {
  const rows = await prismaUnscoped.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { plan: true, pharmacy: { select: { name: true, slug: true, lifecycleStatus: true } } },
  }).catch(() => []);

  const now = new Date();
  const live = rows.filter((subscription) => /active|trial/i.test(subscription.status)).length;
  const openTrials = rows.filter(
    (subscription) => subscription.trialEndsAt && subscription.trialEndsAt.getTime() > now.getTime(),
  ).length;
  const planCount = new Set(rows.map((subscription) => subscription.plan.name)).size;

  return (
    <AdaptivePlatformPage
      eyebrow="Revenue operations"
      title="Subscriptions"
      description="Review tenant plans, lifecycle state and trial windows without losing operational context on smaller screens."
      metrics={[
        { label: "Loaded records", value: rows.length, hint: "Latest 100 subscriptions" },
        { label: "Live / trial", value: live, hint: "Subscriptions currently in service" },
        { label: "Open trials", value: openTrials, hint: `${planCount} plan${planCount === 1 ? "" : "s"} represented` },
      ]}
    >
      <PlatformSection
        title="Tenant subscription register"
        description="Lifecycle and billing state are prioritized before dates so intervention needs are visible first."
      >
        <AdaptiveDataTable
          headers={["Pharmacy", "Lifecycle", "Plan", "Status", "Trial ends"]}
          empty="No subscriptions are available yet."
          rows={rows.map((subscription) => ({
            key: subscription.id,
            cells: [
              <div key="pharmacy" className={styles.userIdentity}>
                <p className={styles.userName}>{subscription.pharmacy.name}</p>
                <p className={styles.userEmail}>/{subscription.pharmacy.slug}</p>
              </div>,
              <StatusPill key="lifecycle" tone={toneForStatus(subscription.pharmacy.lifecycleStatus)}>
                {subscription.pharmacy.lifecycleStatus}
              </StatusPill>,
              <span key="plan" className={styles.muted}>{subscription.plan.name}</span>,
              <StatusPill key="status" tone={toneForStatus(subscription.status)}>
                {subscription.status}
              </StatusPill>,
              <span key="trial" className={styles.muted}>
                {subscription.trialEndsAt ? subscription.trialEndsAt.toISOString().slice(0, 10) : "—"}
              </span>,
            ],
          }))}
        />
      </PlatformSection>
    </AdaptivePlatformPage>
  );
}
