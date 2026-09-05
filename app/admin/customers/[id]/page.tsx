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
      {/* Top — profile snapshot */}
      <div className="mb-6 flex flex-wrap items-start gap-3">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All customers
        </Link>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <AdminPanel title="Profile">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-lg font-bold text-[var(--admin-btn-fg)]">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold admin-text">{customer.fullName}</p>
              <p className="truncate text-xs admin-muted">{customer.user.email}</p>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide admin-soft">Email</p>
                <p className="truncate admin-text">{customer.user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-xs uppercase tracking-wide admin-soft">Phone</p>
                <p className="admin-text">{customer.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-xs uppercase tracking-wide admin-soft">Date of birth</p>
                <p className="admin-text">
                  {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-xs uppercase tracking-wide admin-soft">Branch</p>
                <p className="admin-text">{customer.preferredBranch}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-xs uppercase tracking-wide admin-soft">Address</p>
                <p className="admin-text">
                  {[customer.addressLine1, customer.city, customer.zip].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </div>
          </dl>
        </AdminPanel>

        {/* Segments */}
        <AdminPanel
          title="Segments"
          description="Group this customer for campaigns"
          action={
            <span className="text-xs uppercase tracking-wide admin-soft">
              {customer.segments.length} active
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {customer.segments.length === 0 && (
              <p className="text-xs admin-soft">No segments assigned.</p>
            )}
            {customer.segments.map((s) => (
              <span
                key={s.segmentId}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-accent-soft)] px-2 py-0.5 text-xs font-medium admin-accent-text"
              >
                <Layers className="h-2.5 w-2.5" /> {s.segment.name}
              </span>
            ))}
          </div>
          <form action={adminAssignSegmentAction} className="flex gap-2">
            <input type="hidden" name="customerId" value={customer.id} />
            <select
              name="segmentId"
              className="input-admin flex-1"
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
              className="inline-flex items-center gap-1 rounded-xl bg-[var(--admin-accent-soft)] px-3 py-2 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-accent-soft)]"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
        </AdminPanel>

        {/* Loyalty */}
        <AdminPanel title="Loyalty">
          {customer.loyaltyAccount ? (
            <div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold admin-text">{customer.loyaltyAccount.points}</p>
                  <p className="text-xs uppercase tracking-wide admin-soft">Points balance</p>
                </div>
                <span className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[var(--admin-btn-fg)]">
                  {customer.loyaltyAccount.tier}
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-[var(--admin-inset)] p-3">
                <p className="text-xs uppercase tracking-wide admin-soft">Referral code</p>
                <p className="font-mono text-lg font-bold admin-accent-text">{customer.loyaltyAccount.referralCode}</p>
              </div>
              <p className="mt-2 text-xs admin-muted">
                Lifetime: <strong className="admin-text">{customer.loyaltyAccount.lifetimePoints}</strong> pts
              </p>
            </div>
          ) : (
            <p className="text-sm admin-soft">No loyalty account.</p>
          )}
        </AdminPanel>
      </div>

      {/* Middle — timeline + send message */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <AdminPanel
          title="Customer timeline"
          description="Most recent activity"
          action={
            <span className="text-xs uppercase tracking-wide admin-soft">
              {customer.timelineEvents.length} events
            </span>
          }
        >
          {customer.timelineEvents.length === 0 ? (
            <AdminEmptyState icon={Activity} title="No activity yet" />
          ) : (
            <ol className="relative max-h-96 space-y-3 overflow-y-auto scroll-admin pl-4">
              <span className="absolute left-1.5 top-1 bottom-1 w-px bg-[var(--admin-inset-2)]" />
              {customer.timelineEvents.slice(0, 30).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-2.5 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--admin-accent)] ring-4 ring-[var(--admin-bg)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-card)]" />
                  </span>
                  <div className="ml-4">
                    <p className="text-sm font-semibold admin-text">{e.title}</p>
                    {e.description && <p className="text-xs admin-muted">{e.description}</p>}
                    <p className="mt-0.5 text-xs uppercase tracking-wide admin-soft">
                      {formatDateTime(e.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </AdminPanel>

        <AdminPanel title="Send message" description="Email, SMS, WhatsApp or portal">
          <AdminMessageForm action={adminSendMessageAction} customerId={customer.id} />
        </AdminPanel>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel
          title="Refills"
          description={`${customer.refillRequests.length} requests`}
          action={
            <Link
              href="/admin/refills"
              className="text-xs font-semibold admin-accent-text hover:underline"
            >
              View all
            </Link>
          }
        >
          {customer.refillRequests.length === 0 ? (
            <p className="py-4 text-center text-xs admin-soft">No refills yet.</p>
          ) : (
            <ul className="space-y-2">
              {customer.refillRequests.slice(0, 8).map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium admin-text">{r.medicineName}</p>
                      <p className="text-xs admin-soft">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
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
            <p className="py-4 text-center text-xs admin-soft">No prescriptions.</p>
          ) : (
            <ul className="space-y-2">
              {customer.prescriptions.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium admin-text">{p.medicineName}</p>
                    <span className="shrink-0 rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-xs capitalize admin-muted">
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs admin-soft">
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
            <p className="py-4 text-center text-xs admin-soft">No caregivers.</p>
          ) : (
            <ul className="space-y-2">
              {customer.caregivers.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[var(--admin-inset)] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium admin-text">{c.caregiverName}</p>
                    <p className="text-xs admin-soft">{c.relationship || "Caregiver"}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.status === "active"
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-rose-500/15 text-rose-600"
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
          className="lg:col-span-2"
        >
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
        </AdminPanel>

        <AdminPanel
          title="Medication adherence"
          description="14-day adherence rate · per-prescription breakdown · recent doses"
          className="lg:col-span-2"
        >
          <AdminAdherencePanel customerId={customer.id} />
        </AdminPanel>

        <AdminPanel title="Quick stats">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <Pill className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.refillRequests.length}</p>
              <p className="text-xs uppercase tracking-wide admin-soft">Total refills</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <FileText className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.prescriptions.length}</p>
              <p className="text-xs uppercase tracking-wide admin-soft">Prescriptions</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <HeartHandshake className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.caregivers.length}</p>
              <p className="text-xs uppercase tracking-wide admin-soft">Caregivers</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <Sparkles className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">
                {customer.loyaltyAccount?.points ?? 0}
              </p>
              <p className="text-xs uppercase tracking-wide admin-soft">Loyalty pts</p>
            </div>
          </div>
        </AdminPanel>

        {/* Commerce ledger: lifetime value, outstanding, orders (audit §59) */}
        <CommerceSummaryPanel customerId={customer.id} />
      </div>
    </AdminShell>
  );
}

async function CommerceSummaryPanel({ customerId }: { customerId: string }) {
  // Pull the customer's commerce history directly so the existing getCustomerDetail
  // signature doesn't need to change (and the timeline of refills/prescriptions
  // remains compatible with downstream components).
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
      description="Lifetime value, outstanding balance, refunds, and recent orders. Mirrors the audit's customer-lifetime-value requirement (§59)."
      className="lg:col-span-2"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lifetime spend" value={`KES ${lifetimeSpend.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} />
        <Stat label="Outstanding" value={`KES ${outstanding.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} accent={outstanding > 0 ? "text-amber-600" : undefined} />
        <Stat label="Refunded" value={`KES ${refunded.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} />
        <Stat label="Avg order value" value={`KES ${avgOrderValue.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`} />
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="Prescription fills" value={String(fillsCount)} />
        <Stat label="Refills" value="see refills panel" />
        <Stat label="Last purchase" value={lastPurchaseAt ? new Date(lastPurchaseAt).toLocaleDateString() : "—"} />
      </div>

      <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left admin-muted border-b border-[var(--admin-border)]">
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
                  <Link href={`/admin/orders?orderId=${o.id}`} className="admin-text font-medium hover:text-[var(--admin-accent)]">
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
                <td className={`py-2 pr-3 text-right ${Number(o.amountDue || 0) > 0 ? "text-amber-600 font-semibold" : "admin-muted"}`}>
                  KES {Number(o.amountDue || 0).toFixed(0)}
                </td>
                <td className="py-2 pr-3 admin-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="py-2 pr-3 admin-muted">{o.paidAt ? new Date(o.paidAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={11} className="py-4 text-center admin-muted">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-[var(--admin-inset)] p-3">
      <p className="text-xs uppercase tracking-wide admin-soft">{label}</p>
      <p className={`mt-1 text-base font-bold ${accent ?? "admin-text"}`}>{value}</p>
    </div>
  );
}
