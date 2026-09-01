import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const [jobs, outbox] = await Promise.all([
    prismaUnscoped.job.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    prismaUnscoped.outboxEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
  ]);

  return (
    <PlatformPage title="Jobs & outbox" description="Background work, retries and dead letters across the network.">
      <h2 className="mb-3 text-lg font-semibold">Jobs</h2>
      <PlatformTable
        headers={["Type", "Tenant", "Status", "Attempts", "Error"]}
        empty="No jobs queued."
        rows={jobs.map((j) => [j.type, j.pharmacyId?.slice(0, 8) || "platform", j.status, String(j.attempts), j.lastError || "—"])}
      />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Outbox</h2>
      <PlatformTable
        headers={["Event", "Aggregate", "Status", "Attempts"]}
        empty="Outbox is empty."
        rows={outbox.map((e) => [e.eventType, `${e.aggregateType}:${e.aggregateId.slice(0, 8)}`, e.status, String(e.attempts)])}
      />
    </PlatformPage>
  );
}
