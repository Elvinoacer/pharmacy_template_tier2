import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
  PlatformTable,
} from "@/app/platform/_components/PlatformPage";

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
  const rows = await prismaUnscoped.invoice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      pharmacy: { select: { name: true } },
      subscription: { select: { externalSubscriptionId: true, status: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1, select: { provider: true, status: true } },
    },
  }).catch(() => []);

  const now = new Date();
  const open = rows.filter((invoice) => invoice.status === "open");
  const overdue = open.filter((invoice) => invoice.dueAt < now);
  const outstandingKes = open.reduce((sum, invoice) => sum + Number(invoice.totalKes), 0);
  const paidCount = rows.filter((invoice) => invoice.status === "paid").length;

  return (
    <PlatformPage
      eyebrow="Revenue operations"
      title="Invoices"
      description="Track pharmacy billing and recurring Paystack card collection without initiating payments on behalf of pharmacy owners."
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
            {overdue.length} invoice{overdue.length === 1 ? " is" : "s are"} overdue. Review the pharmacy&apos;s Paystack subscription status or contact the owner; platform billing should never be collected through an admin-triggered STK prompt.
          </p>
        </div>
      ) : null}

      <PlatformSection
        title="Invoice ledger"
        description="Monthly service invoices reconcile from Paystack subscription webhooks. One-time platform invoices are paid by the pharmacy owner through hosted card checkout."
      >
        <PlatformTable
          headers={["Invoice", "Pharmacy", "Total", "Due date", "Status", "Collection"]}
          empty="No platform invoices have been issued yet."
          rows={rows.map((invoice) => {
            const isOpen = invoice.status === "open";
            const isOverdue = isOpen && invoice.dueAt < now;
            const latestPayment = invoice.payments[0];
            const recurringReady = Boolean(invoice.subscription?.externalSubscriptionId?.startsWith("paystack:"));
            const collectionLabel = invoice.subscriptionId
              ? recurringReady
                ? latestPayment?.provider === "paystack_subscription"
                  ? `Paystack · ${latestPayment.status}`
                  : "Paystack auto-renew"
                : "Card setup required"
              : latestPayment?.provider?.startsWith("paystack")
                ? `Paystack · ${latestPayment.status}`
                : isOpen
                  ? "Owner card checkout"
                  : "No action";

            return [
              <span key={`${invoice.id}-number`} className="font-mono text-xs font-semibold text-[var(--admin-text)] sm:text-sm">{invoice.number}</span>,
              <span key={`${invoice.id}-pharmacy`} className="font-medium text-[var(--admin-text)]">{invoice.pharmacy.name}</span>,
              <span key={`${invoice.id}-total`} className="whitespace-nowrap font-semibold tabular-nums">KES {Number(invoice.totalKes).toLocaleString("en-KE")}</span>,
              <span key={`${invoice.id}-due`} className={isOverdue ? "font-semibold text-rose-700" : "text-[var(--admin-text-muted)]"}>{invoice.dueAt.toISOString().slice(0, 10)}</span>,
              <InvoiceStatus key={`${invoice.id}-status`} status={invoice.status} overdue={isOverdue} />,
              <span key={`${invoice.id}-collect`} className="inline-flex min-h-8 items-center rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] px-2.5 text-[11px] font-semibold text-[var(--admin-text-muted)]">{collectionLabel}</span>,
            ];
          })}
        />
      </PlatformSection>
    </PlatformPage>
  );
}
