import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { resolvePosConflictAction } from "@/app/actions/platform";

export const metadata = { title: "POS conflicts" };
export const dynamic = "force-dynamic";

export default async function PosConflictsPage() {
  const [jobs, conflicts] = await Promise.all([
    prismaUnscoped.job.findMany({
      where: { type: "pos.sync" },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { pharmacy: { select: { name: true } } },
    }).catch(() => []),
    prismaUnscoped.inventorySyncConflict.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { pharmacy: { select: { name: true } } },
    }).catch(() => []),
  ]);

  return (
    <PlatformPage
      title="POS sync jobs"
      description="Queued imports, progress, and open stock conflicts. Resolve by accepting POS, keeping platform stock, or ignoring the row."
    >
      <h2 className="mb-3 text-lg font-semibold">Jobs</h2>
      <PlatformTable
        headers={["Pharmacy", "Status", "Progress", "Attempts", "Error"]}
        empty="No POS sync jobs."
        rows={jobs.map((j) => [
          j.pharmacy?.name || "—",
          j.status,
          `${j.progress ?? 0}%`,
          String(j.attempts),
          j.lastError || "—",
        ])}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Open conflicts</h2>
      <PlatformTable
        headers={["Pharmacy", "SKU", "Platform", "POS", "Resolve"]}
        empty="No open conflicts."
        rows={conflicts.map((c) => [
          c.pharmacy.name,
          c.sku || c.inventoryId.slice(0, 8),
          String(c.platformStock),
          String(c.posStock),
          (
            <form key={c.id} action={resolvePosConflictAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="conflictId" value={c.id} />
              <button name="action" value="accept_pos" className="rounded-lg border border-white/20 px-2 py-1 text-xs hover:bg-white/10">
                Accept POS
              </button>
              <button name="action" value="accept_platform" className="rounded-lg border border-white/20 px-2 py-1 text-xs hover:bg-white/10">
                Accept platform
              </button>
              <button name="action" value="ignore" className="rounded-lg border border-white/20 px-2 py-1 text-xs hover:bg-white/10">
                Ignore
              </button>
            </form>
          ),
        ])}
      />
    </PlatformPage>
  );
}
