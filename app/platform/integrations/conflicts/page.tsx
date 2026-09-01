import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "POS conflicts" };
export const dynamic = "force-dynamic";

export default async function PosConflictsPage() {
  const jobs = await prismaUnscoped.job.findMany({
    where: { type: "pos.sync" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { pharmacy: { select: { name: true } } },
  }).catch(() => []);

  return (
    <PlatformPage
      title="POS sync jobs"
      description="Large POS imports run as jobs. Conflicts are returned on the job payload/result; accept-POS vs accept-platform tooling can be applied per inventory row version."
    >
      <PlatformTable
        headers={["Pharmacy", "Status", "Attempts", "Error"]}
        empty="No POS sync jobs."
        rows={jobs.map((j) => [
          j.pharmacy?.name || "—",
          j.status,
          String(j.attempts),
          j.lastError || "—",
        ])}
      />
    </PlatformPage>
  );
}
