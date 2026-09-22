import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { getCustomerDetail } from "@/app/lib/services/crm";
import { prisma } from "@/app/lib/db";
import { refillStatusMeta } from "@/app/lib/types";
import { formatDateTime, formatDate } from "@/app/lib/time";
import {
  adminAddNoteAction,
  adminAssignSegmentAction,
  adminSendMessageAction,
} from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import AdminNoteForm from "@/app/components/admin/AdminNoteForm";
import AdminMessageForm from "@/app/components/admin/AdminMessageForm";
import { StaffNotesList } from "@/app/components/admin/StaffNotesList";
import { AdminAdherencePanel } from "@/app/components/admin/AdminAdherencePanel";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building2,
  Plus,
  Pill,
  FileText,
  HeartHandshake,
  Sparkles,
  Layers,
  Activity,
  ShoppingBag,
  WalletCards,
} from "lucide-react";

export const metadata = { title: "Customer detail" };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const [customer, segments] = await Promise.all([
    getCustomerDetail(id),
    prisma.segment.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!customer) notFound();

  const initials = customer.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <AdminShell user={user} title={customer.fullName} subtitle={customer.user.email}>
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <Link
          href="/admin/customers"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-sm font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All customers
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminPanel title="Profile">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-lg font-bold text-[var(--admin-btn-fg)] shadow-sm">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <p className="break-words font-semibold admin-text">{customer.fullName}</p>
              <p className="break-all text-sm admin-muted">{customer.user.email}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-wide admin-soft">Email</p>
                <p className="break-all admin-text">{customer.user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-wide admin-soft">Phone</p>
                <p className="break-words admin-text">{customer.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-sm uppercase tracking-wide admin-soft">Date of birth</p>
                <p className="admin-text">
                  {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-wide admin-soft">Branch</p>
                <p className="break-words admin-text">{customer.preferredBranch}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div className="min-w-0">
                <p className="text-sm uppercase tracking-wide admin-soft">Address</p>
                <p className="break-words admin-text">
                  {[customer.addressLine1, customer.city, customer.zip].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel
          title="Segments"
          description="Group this customer for campaigns"
          action={
            <span className="text-sm uppercase tracking-wide admin-soft">
              {customer.segments.length} active
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {customer.segments.length === 0 && (
              <p className="text-sm admin-soft">No segments assigned.</p>
            )}
            {customer.segments.map((s) => (
              <span
                key={s.segmentId}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-accent-soft)] px-2 py-1 text-sm font-medium admin-accent-text"
              >
                <Layers className="h-2.5 w-2.5" /> {s.segment.name}
              </span>
            ))}
          </div>
          <form action={adminAssignSegmentAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input type="hidden" name="customerId" value={customer.id} />
            <select
              name="segmentId"
              className="input-admin w-full"
              defaultValue=""
            >
              <option value="">Choose a segment…</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-[var(--admin-accent-soft)] px-3 py-2 text-sm font-semibold admin-accent-text transition hover:brightness-105 sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
        </AdminPanel>

        <AdminPanel title="Loyalty">
          {customer.loyaltyAccount ? (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold admin-text">{customer.loyaltyAccount.points}</p>
                  <p className="text-sm uppercase tracking-wide admin-soft">Points balance</p>
                </div>
                <span className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 px-2.5 py-1 text-sm font-bold uppercase tracking-wide text-slate-950 dark:text-slate-950">
                  {customer.loyaltyAccount.tier}
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-[var(--admin-inset)] p-3">
                <p className="text-sm uppercase tracking-wide admin-soft">Referral code</p>
                <p className="break-all font-mono text-lg font-bold admin-accent-text">{customer.loyaltyAccount.referralCode}</p>
              </div>
              <p className="mt-2 text-sm admin-muted">
                Lifetime: <strong className="admin-text">{customer.loyaltyAccount.lifetimePoints}</strong> pts
              </p>
            </div>
          ) : (
            <p className="text-sm admin-soft">No loyalty account.</p>
          )}
        </AdminPanel>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <AdminPanel title="Send message" description="Email, SMS, WhatsApp or portal" className="order-1 lg:order-2">
          <div className="[&_button]:min-h-11 [&_button]:text-sm [&_input]:text-base [&_label]:text-sm [&_legend]:text-sm [&_select]:text-base [&_textarea]:text-base sm:[&_input]:text-sm sm:[&_select]:text-sm sm:[&_textarea]:text-sm">
            <AdminMessageForm action={adminSendMessageAction} customerId={customer.id} />
          </div>
        </AdminPanel>

        <AdminPanel
          title="Customer timeline"
          description="Most recent activity"
          className="order-2 lg:order-1"
          action={
            <span className="text-sm uppercase tracking-wide admin-soft">
              {customer.timelineEvents.length} events
            </span>
          }
        >
          {customer.timelineEvents.length === 0 ? (
            <AdminEmptyState icon={Activity} title="No activity yet" />
          ) : (
            <ol className="relative max-h-96 space-y-3 overflow-y-auto scroll-admin pl-4 pr-1">
              <span className="absolute left-1.5 top-1 bottom-1 w-px bg-[var(--admin-inset-2)]" />
              {customer.timelineEvents.slice(0, 30).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-2.5 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--admin-accent)] ring-4 ring-[var(--admin-bg)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-card)]" />
                  </span>
                  <div className="ml-4 min-w-0">
                    <p className="break-words text-sm font-semibold admin-text">{e.title}</p>
                    {e.description && <p className="break-words text-sm leading-5 admin-muted">{e.description}</p>}
                    <p className="mt-0.5 text-sm uppercase tracking-wide admin-soft">
                      {formatDateTime(e.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminPanel
          title="Refills"
          description={`${customer.refillRequests.length} requests`}
          action={
            <Link
              href="/admin/refills"
              className="inline-flex min-h-11 items-center text-sm font-semibold admin-accent-text hover:underline"
            >
              View all
            </Link>
          }
        >
          {customer.refillRequests.length === 0 ? (
            <p className="py-4 text-center text-sm admin-soft">No refills yet.</p>
          ) : (
            <ul className="space-y-2">
              {customer.refillRequests.slice(0, 8).map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-[var(--admin-inset)] px-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium admin-text">{r.medicineName}</p>
                      <p className="text-sm admin-soft">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Prescriptions"
          description={`${customer.prescriptions.length} on file`}
        >
          {customer.prescriptions.length === 0 ? (
            <p className="py-4 text-center text-sm admin-soft">No prescriptions.</p>
          ) : (
            <ul className="space-y-2">
              {customer.prescriptions.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="break-words font-medium admin-text">{p.medicineName}</p>
                    <span className="shrink-0 rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-sm capitalize admin-muted">
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm admin-soft">
                    {p.rxReference || "No ref"} · {p.refillsRemaining ?? 0} refills left
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Caregivers"
          description={`${customer.caregivers.length} linked`}
        >
          {customer.caregivers.length === 0 ? (
            <p className="py-4 text-center text-sm admin-soft">No caregivers.</p>
          ) : (
            <ul className="space-y-2">
              {customer.caregivers.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-[var(--admin-inset)] px-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium admin-text">{c.caregiverName}</p>
                    <p className="text-sm admin-soft">{c.relationship || "Caregiver"}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold ${
                      c.status === "active"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel
          title="Staff notes"
          description={`${customer.staffNotes.length} notes · drag to reorder`}
          className="sm:col-span-2 lg:col-span-2"
        >
          <div className="[&_button]:min-h-11 [&_button]:min-w-11 [&_button]:text-sm [&_label]:min-h-11 [&_label]:text-sm [&_textarea]:text-base sm:[&_textarea]:text-sm">
            <AdminNoteForm action={adminAddNoteAction} customerId={customer.id} />
            <StaffNotesList
              notes={customer.staffNotes.map((n) => ({
                id: n.id,
                body: n.body,
                isPinned: n.isPinned,
                sortOrder: n.sortOrder ?? 0,
                createdAt: n.createdAt.toISOString(),
                authorEmail: n.author?.email ?? null,
              }))}
              customerId={customer.id}
            />
          </div>
        </AdminPanel>

        <AdminPanel
          title="Medication adherence"
          description="14-day adherence rate · per-prescription breakdown · recent doses"
          className="sm:col-span-2 lg:col-span-2"
        >
          <AdminAdherencePanel customerId={customer.id} />
        </AdminPanel>

        <AdminPanel title="Quick stats">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <Pill className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.refillRequests.length}</p>
              <p className="text-sm uppercase tracking-wide admin-soft">Total refills</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <FileText className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.prescriptions.length}</p>
              <p className="text-sm uppercase tracking-wide admin-soft">Prescriptions</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <HeartHandshake className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.caregivers.length}</p>
              <p className="text-sm uppercase tracking-wide admin-soft">Caregivers</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <Sparkles className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">
                {customer.loyaltyAccount?.points ?? 0}
              </p>
              <p className="text-sm uppercase tracking-wide admin-soft">Loyalty pts</p>
            </div>
          </div>
        </AdminPanel>

        <CommerceSummaryPanel customerId={customer.id} />
      </div>
    </AdminShell>
  );
}

async function CommerceSummaryPanel({ customerId }: { customerId: string }) {
  const orders = await prisma.order.findMany({
    where: { customerId, status: { notIn: ["cancelled"] } },
    select: {
      id: true,
      type: true,
      source: true,
      status: true,
      netTotal: true,
      total: true,
      amountPaid: true,
      amountRefunded: true,
      amountDue: true,
      paidAt: true,
      fulfilledAt: true,
      createdAt: true,
      paymentStage: true,
      fulfillmentStage: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const fillsCount = await prisma.prescriptionFill.count({
    where: { prescription: { customerId } },
  });
  const lifetimeSpend = orders.reduce((s, o) => s + Number(o.amountPaid || 0), 0);
  const outstanding = orders.reduce((s, o) => s + Number(o.amountDue || 0), 0);
  const refunded = orders.reduce((s, o) => s + Number(o.amountRefunded || 0), 0);
  const avgOrderValue = orders.length > 0 ? lifetimeSpend / orders.length : 0;
  const lastPurchaseAt = orders.find((o) => o.paidAt)?.paidAt ?? null;

  return (
    <AdminPanel
      title="Commerce history"
      description="Spend, balances, refunds, prescription fills, and recent orders."
      className="sm:col-span-2 lg:col-span-2"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lifetime spend" value={`KES ${lifetimeSpend.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} />
        <Stat label="Outstanding" value={`KES ${outstanding.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} accent={outstanding > 0 ? "text-amber-700 dark:text-amber-300" : undefined} />
        <Stat label="Refunded" value={`KES ${refunded.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} />
        <Stat label="Avg order value" value={`KES ${avgOrderValue.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} />
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="Prescription fills" value={String(fillsCount)} />
        <Stat label="Refills" value="See refills" />
        <Stat label="Last purchase" value={lastPurchaseAt ? new Date(lastPurchaseAt).toLocaleDateString() : "—"} />
      </div>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-inset)] p-6 text-center">
          <ShoppingBag className="mx-auto h-5 w-5 admin-soft" />
          <p className="mt-2 text-sm font-semibold admin-text">No orders yet</p>
          <p className="mt-1 text-sm admin-soft">Commerce activity will appear here after the first order.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:hidden">
            {orders.map((o) => (
              <article key={o.id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/orders?orderId=${o.id}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold admin-accent-text hover:underline">
                      <ShoppingBag className="h-3.5 w-3.5" /> #{o.id.slice(0, 8)}
                    </Link>
                    <p className="mt-1 text-sm capitalize admin-muted">{o.type ?? "Order"} · {o.source}</p>
                  </div>
                  <span className="badge shrink-0">{o.status}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-[var(--admin-card)] p-2.5">
                    <p className="admin-soft">Net</p>
                    <p className="mt-0.5 font-semibold admin-text">KES {Number(o.netTotal || o.total || 0).toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--admin-card)] p-2.5">
                    <p className="admin-soft">Paid</p>
                    <p className="mt-0.5 font-semibold admin-text">KES {Number(o.amountPaid || 0).toFixed(0)}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--admin-card)] p-2.5">
                    <p className="admin-soft">Due</p>
                    <p className={`mt-0.5 font-semibold ${Number(o.amountDue || 0) > 0 ? "text-amber-700 dark:text-amber-300" : "admin-text"}`}>
                      KES {Number(o.amountDue || 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--admin-card)] p-2.5">
                    <p className="admin-soft">Created</p>
                    <p className="mt-0.5 font-semibold admin-text">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--admin-card)] p-3 text-sm admin-muted">
                  <WalletCards className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
                  <div className="min-w-0">
                    <p>Payment: <span className="admin-text">{o.paymentStage ?? "—"}</span></p>
                    <p className="mt-1">Fulfillment: <span className="admin-text">{o.fulfillmentStage ?? "—"}</span></p>
                    <p className="mt-1">Paid at: <span className="admin-text">{o.paidAt ? new Date(o.paidAt).toLocaleDateString() : "—"}</span></p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div tabIndex={0} role="region" aria-label="Scrollable commerce records" className="admin-table-region mt-4 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] text-left admin-muted">
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Payment</th>
                  <th className="py-2 pr-3">Fulfillment</th>
                  <th className="py-2 pr-3 text-right">Net</th>
                  <th className="py-2 pr-3 text-right">Paid</th>
                  <th className="py-2 pr-3 text-right">Due</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--admin-border)]">
                    <td className="py-2 pr-3">
                      <Link href={`/admin/orders?orderId=${o.id}`} className="inline-flex min-h-11 items-center admin-text font-medium hover:text-[var(--admin-accent)]">
                        #{o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 admin-muted">{o.type ?? "—"}</td>
                    <td className="py-2 pr-3 admin-muted">{o.source}</td>
                    <td className="py-2 pr-3">
                      <span className="badge">{o.status}</span>
                    </td>
                    <td className="py-2 pr-3 admin-muted">{o.paymentStage ?? "—"}</td>
                    <td className="py-2 pr-3 admin-muted">{o.fulfillmentStage ?? "—"}</td>
                    <td className="py-2 pr-3 text-right admin-text">KES {Number(o.netTotal || o.total || 0).toFixed(0)}</td>
                    <td className="py-2 pr-3 text-right admin-muted">KES {Number(o.amountPaid || 0).toFixed(0)}</td>
                    <td className={`py-2 pr-3 text-right ${Number(o.amountDue || 0) > 0 ? "text-amber-700 dark:text-amber-300 font-semibold" : "admin-muted"}`}>
                      KES {Number(o.amountDue || 0).toFixed(0)}
                    </td>
                    <td className="py-2 pr-3 admin-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-3 admin-muted">{o.paidAt ? new Date(o.paidAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminPanel>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--admin-inset)] p-3">
      <p className="text-sm uppercase tracking-wide admin-soft sm:text-sm">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold sm:text-base ${accent ?? "admin-text"}`}>{value}</p>
    </div>
  );
}
