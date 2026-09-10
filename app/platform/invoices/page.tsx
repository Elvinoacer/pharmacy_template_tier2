import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
  PlatformTable,
} from "@/app/platform/_components/PlatformPage";
import { collectInvoiceAction } from "@/app/actions/platform";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

function InvoiceStatus({ status, overdue }: { status: string; overdue: boolean }) {
  const normalized = status.toLowerCase();
  const paid = normalized === "paid" || normalized.includes("settled");
  const className = overdue
    ? "bg-rose-500/10 text-rose-700 ring-rose-500/20"
    : paid
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20"
      : normalized === "open"
        ? "bg-amber-500/10 text-amber-700 ring-amber-500/20"
        : "bg-[var(--admin-inset-2)] text-[var(--admin-text-muted)] ring-[var(--admin-border)]";

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${className}`}>
      {overdue ? "Overdue" : status.replaceAll("_", " ")}
    </span>
  );
}

export default async function InvoicesPage() {
  const rows = await prismaUnscoped.invoice
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { pharmacy: { select: { name: true } } },
    })
    .catch(() => []);

  const now = new Date();
  const open = rows.filter((invoice) => invoice.status === "open");
  const overdue = open.filter((invoice) => invoice.dueAt < now);
  const outstandingKes = open.reduce((sum, invoice) => sum + Number(invoice.totalKes), 0);
  const paidCount = rows.filter((invoice) => invoice.status === "paid").length;

  return (
    <PlatformPage
      eyebrow="Revenue operations"
      title="Invoices"
      description="Track pharmacy billing, surface overdue balances first, and trigger M-Pesa collection without losing context on smaller screens."
    >
      <div className="mb-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <PlatformStat label="Open invoices" value={open.length} detail="Awaiting settlement" tone={open.length ? "warning" : "success"} />
        <PlatformStat label="Overdue" value={overdue.length} detail="Past collection date" tone={overdue.length ? "danger" : "default"} />
        <PlatformStat label="Outstanding" value={`KES ${outstandingKes.toLocaleString("en-KE")}`} detail="Across open invoices" />
        <PlatformStat label="Paid in view" value={paidCount} detail={`Latest ${rows.length} invoices`} tone="success" />
      </div>

      {overdue.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/8 p-3.5 sm:p-4">
          <p className="text-sm font-semibold text-[var(--admin-text)]">Collection priority</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--admin-text-muted)]">
            {overdue.length} invoice{overdue.length === 1 ? " is" : "s are"} overdue. Overdue rows are labelled clearly below so collection work can be handled first.
          </p>
        </div>
      ) : null}

      <PlatformSection
        title="Invoice ledger"
        description="Open invoices can trigger an STK request using the pharmacy billing phone; completed invoices remain available for audit context."
      >
        <PlatformTable
          headers={["Invoice", "Pharmacy", "Total", "Due date", "Status", "Collection"]}
          empty="No platform invoices have been issued yet."
          rows={rows.map((invoice) => {
            const isOpen = invoice.status === "open";
            const isOverdue = isOpen && invoice.dueAt < now;

            return [
              <span key={`${invoice.id}-number`} className="font-mono text-xs font-semibold text-[var(--admin-text)] sm:text-sm">{invoice.number}</span>,
              <span key={`${invoice.id}-pharmacy`} className="font-medium text-[var(--admin-text)]">{invoice.pharmacy.name}</span>,
              <span key={`${invoice.id}-total`} className="whitespace-nowrap font-semibold tabular-nums">KES {Number(invoice.totalKes).toLocaleString("en-KE")}</span>,
              <span key={`${invoice.id}-due`} className={isOverdue ? "font-semibold text-rose-700" : "text-[var(--admin-text-muted)]"}>
                {invoice.dueAt.toISOString().slice(0, 10)}
              </span>,
              <InvoiceStatus key={`${invoice.id}-status`} status={invoice.status} overdue={isOverdue} />,
              isOpen ? (
                <form key={`${invoice.id}-collect`} action={collectInvoiceAction}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <button
                    type="submit"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[var(--admin-accent)] px-3 text-[11px] font-semibold text-[var(--admin-btn-fg)] shadow-sm transition hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-card)] md:w-auto"
                  >
                    Send STK request
                  </button>
                </form>
              ) : (
                <span key={`${invoice.id}-collect`} className="text-[var(--admin-text-soft)]">No action</span>
              ),
            ];
          })}
        />
      </PlatformSection>
    </PlatformPage>
  );
}
