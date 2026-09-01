import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Compliance" };
export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const [exportsReq, deletions, access, retention] = await Promise.all([
    prismaUnscoped.dataExportRequest.findMany({ take: 30, include: { pharmacy: { select: { name: true } } } }).catch(() => []),
    prismaUnscoped.dataDeletionRequest.findMany({ take: 30, include: { pharmacy: { select: { name: true } } } }).catch(() => []),
    prismaUnscoped.sensitiveAccessLog.findMany({ take: 30, orderBy: { createdAt: "desc" } }).catch(() => []),
    prismaUnscoped.retentionPolicy.findMany({ take: 30 }).catch(() => []),
  ]);

  return (
    <PlatformPage title="Compliance" description="Exports, deletions, sensitive-record access and retention.">
      <h2 className="mb-3 text-lg font-semibold">Data exports</h2>
      <PlatformTable
        headers={["Pharmacy", "Status", "Requested"]}
        empty="No export requests."
        rows={exportsReq.map((r) => [r.pharmacy.name, r.status, r.requestedAt.toISOString().slice(0, 10)])}
      />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Deletion requests</h2>
      <PlatformTable
        headers={["Pharmacy", "Status", "Scheduled"]}
        empty="No deletion requests."
        rows={deletions.map((r) => [r.pharmacy.name, r.status, r.scheduledFor.toISOString().slice(0, 10)])}
      />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Sensitive access</h2>
      <PlatformTable
        headers={["Resource", "Id", "Purpose"]}
        empty="No sensitive access logs."
        rows={access.map((r) => [r.resource, r.resourceId.slice(0, 8), r.purpose || "—"])}
      />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Retention</h2>
      <PlatformTable
        headers={["Resource", "Days"]}
        empty="No retention policies."
        rows={retention.map((r) => [r.resource, String(r.retainDays)])}
      />
    </PlatformPage>
  );
}
