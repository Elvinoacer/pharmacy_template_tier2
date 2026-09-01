import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { requestDeletionAction, requestExportAction } from "@/app/actions/platform";

export const metadata = { title: "Compliance" };
export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const [exportsReq, deletions, access, retention] = await Promise.all([
    prismaUnscoped.dataExportRequest.findMany({ take: 30, include: { pharmacy: { select: { name: true } } } }).catch(() => []),
    prismaUnscoped.dataDeletionRequest.findMany({ take: 30, include: { pharmacy: { select: { name: true } } } }).catch(() => []),
    prismaUnscoped.sensitiveAccessLog.findMany({ take: 30, orderBy: { createdAt: "desc" } }).catch(() => []),
    prismaUnscoped.retentionPolicy.findMany({ take: 30 }).catch(() => []),
  ]);

  const pharmacies = await prismaUnscoped.pharmacy.findMany({
    take: 40,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  }).catch(() => []);

  return (
    <PlatformPage title="Compliance" description="Exports, deletions, sensitive-record access and retention.">
      <form action={requestExportAction} className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-teal-100/60">Request export</span>
          <select name="pharmacyId" className="rounded-lg border border-white/15 bg-transparent px-3 py-2">
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Queue export</button>
      </form>
      <form action={requestDeletionAction} className="mb-8 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-teal-100/60">Request deletion (30 day hold)</span>
          <select name="pharmacyId" className="rounded-lg border border-white/15 bg-transparent px-3 py-2">
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-rose-400/30 px-3 py-2 text-sm text-rose-100 hover:bg-rose-400/10">Queue deletion</button>
      </form>
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
