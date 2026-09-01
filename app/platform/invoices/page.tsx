import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { collectInvoiceAction } from "@/app/actions/platform";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const rows = await prismaUnscoped.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { pharmacy: { select: { name: true } } },
  }).catch(() => []);

  return (
    <PlatformPage title="Invoices" description="Platform invoices issued to pharmacies. Collect via M-Pesa using the tenant billing phone, or record after the Daraja callback.">
      <PlatformTable
        headers={["Number", "Pharmacy", "Total", "Due", "Status", "Collect"]}
        empty="No invoices."
        rows={rows.map((i) => [
          i.number,
          i.pharmacy.name,
          `KES ${Number(i.totalKes).toLocaleString("en-KE")}`,
          i.dueAt.toISOString().slice(0, 10),
          i.status,
          i.status === "open" ? (
            <form action={collectInvoiceAction} className="flex gap-2">
              <input type="hidden" name="invoiceId" value={i.id} />
              <button type="submit" className="rounded-lg border border-teal-400/40 px-2 py-1 text-xs hover:bg-teal-400/10">
                Send STK
              </button>
            </form>
          ) : "—",
        ])}
      />
    </PlatformPage>
  );
}
