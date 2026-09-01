import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const rows = await prismaUnscoped.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { pharmacy: { select: { name: true } } },
  }).catch(() => []);

  return (
    <PlatformPage title="Invoices" description="Platform invoices issued to pharmacies.">
      <PlatformTable
        headers={["Number", "Pharmacy", "Total", "Due", "Status"]}
        empty="No invoices."
        rows={rows.map((i) => [
          i.number,
          i.pharmacy.name,
          `KES ${Number(i.totalKes).toLocaleString("en-KE")}`,
          i.dueAt.toISOString().slice(0, 10),
          i.status,
        ])}
      />
    </PlatformPage>
  );
}
