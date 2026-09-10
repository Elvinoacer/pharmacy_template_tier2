import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { requestDeletionAction, requestExportAction } from "@/app/actions/platform";

export const metadata = { title: "Compliance" };
export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const [exportsReq, deletions, access, retention] = await Promise.all([
    prismaUnscoped.dataExportRequest
      .findMany({
        take: 30,
        orderBy: { requestedAt: "desc" },
        include: { pharmacy: { select: { name: true } } },
      })
      .catch(() => []),
    prismaUnscoped.dataDeletionRequest
      .findMany({
        take: 30,
        include: { pharmacy: { select: { name: true } } },
      })
      .catch(() => []),
    prismaUnscoped.sensitiveAccessLog
      .findMany({ take: 30, orderBy: { createdAt: "desc" } })
      .catch(() => []),
    prismaUnscoped.retentionPolicy.findMany({ take: 30 }).catch(() => []),
  ]);

  const pharmacies = await prismaUnscoped.pharmacy
    .findMany({
      take: 40,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })
    .catch(() => []);

  return (
    <PlatformPage
      eyebrow="Privacy operations"
      title="Compliance"
      description="Handle data exports and deletion requests, review sensitive-record access, and inspect retention policy coverage."
    >
      <section aria-labelledby="compliance-actions-title" className="mb-7 sm:mb-8">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-200" aria-hidden />
          <h2 id="compliance-actions-title" className="text-lg font-semibold text-[#1c2c26] dark:text-white">
            Privacy actions
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <form
            action={requestExportAction}
            className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm shadow-black/[0.02] dark:border-teal-200/15 dark:bg-teal-950/30 dark:shadow-none sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-300/10 dark:text-teal-200">
                <Download className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#20332b] dark:text-white">Queue data export</h3>
                <p className="mt-1 text-xs leading-5 text-[#6c7a73] dark:text-teal-100/60">
                  Prepare a pharmacy data package for an approved access request.
                </p>
              </div>
            </div>

            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-[#5f7068] dark:text-teal-100/65">Pharmacy</span>
              <select
                name="pharmacyId"
                className="min-h-11 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 text-sm text-[#1c2c26] outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-white/15 dark:bg-[#081411] dark:text-white dark:focus:border-teal-300/45 dark:focus:ring-teal-300/10"
              >
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-teal-200 dark:text-[#06110f] dark:hover:bg-teal-100 dark:focus-visible:ring-teal-200 dark:focus-visible:ring-offset-[#06110f] sm:w-auto"
            >
              Queue export
            </button>
          </form>

          <form
            action={requestDeletionAction}
            className="rounded-2xl border border-rose-200 bg-rose-50/55 p-4 shadow-sm shadow-black/[0.02] dark:border-rose-400/20 dark:bg-rose-500/[0.07] dark:shadow-none sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">
                <Trash2 className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-rose-950 dark:text-rose-100">Queue deletion request</h3>
                <p className="mt-1 text-xs leading-5 text-rose-800/75 dark:text-rose-100/60">
                  Starts the 30-day hold before permanent data deletion can proceed.
                </p>
              </div>
            </div>

            <label className="mt-4 block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-rose-800/80 dark:text-rose-100/65">Pharmacy</span>
              <select
                name="pharmacyId"
                className="min-h-11 w-full rounded-xl border border-rose-200 bg-white px-3 text-sm text-[#1c2c26] outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 dark:border-rose-400/25 dark:bg-[#120b0c] dark:text-white dark:focus:border-rose-300/50 dark:focus:ring-rose-300/10"
              >
                {pharmacies.map((pharmacy) => (
                  <option key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-800 transition active:scale-[0.98] hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-rose-50 dark:border-rose-400/35 dark:bg-rose-400/10 dark:text-rose-100 dark:hover:bg-rose-400/15 dark:focus-visible:ring-rose-300 dark:focus-visible:ring-offset-[#06110f] sm:w-auto"
            >
              Queue deletion
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[#1c2c26] dark:text-white">Data exports</h2>
        <PlatformTable
          headers={["Pharmacy", "Status", "Requested"]}
          empty="No export requests."
          rows={exportsReq.map((request) => [
            request.pharmacy.name,
            request.status,
            request.requestedAt.toISOString().slice(0, 10),
          ])}
        />
      </section>

      <section className="mt-7 sm:mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#1c2c26] dark:text-white">Deletion requests</h2>
        <PlatformTable
          headers={["Pharmacy", "Status", "Scheduled"]}
          empty="No deletion requests."
          rows={deletions.map((request) => [
            request.pharmacy.name,
            request.status,
            request.scheduledFor.toISOString().slice(0, 10),
          ])}
        />
      </section>

      <section className="mt-7 sm:mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#1c2c26] dark:text-white">Sensitive access</h2>
        <PlatformTable
          headers={["Resource", "Id", "Purpose"]}
          empty="No sensitive access logs."
          rows={access.map((record) => [
            record.resource,
            record.resourceId.slice(0, 8),
            record.purpose || "—",
          ])}
        />
      </section>

      <section className="mt-7 sm:mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#1c2c26] dark:text-white">Retention</h2>
        <PlatformTable
          headers={["Resource", "Days"]}
          empty="No retention policies."
          rows={retention.map((policy) => [policy.resource, String(policy.retainDays)])}
        />
      </section>
    </PlatformPage>
  );
}
