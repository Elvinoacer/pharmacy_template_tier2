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
                <p className="text-[10px] uppercase tracking-wide admin-soft">Email</p>
                <p className="truncate admin-text">{customer.user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Phone</p>
                <p className="admin-text">{customer.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Date of birth</p>
                <p className="admin-text">
                  {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Branch</p>
                <p className="admin-text">{customer.preferredBranch}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 admin-accent-text" />
              <div>
                <p className="text-[10px] uppercase tracking-wide admin-soft">Address</p>
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
            <span className="text-[10px] uppercase tracking-wide admin-soft">
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
                className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-accent-soft)] px-2 py-0.5 text-[10px] font-medium admin-accent-text"
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
                  <p className="text-[10px] uppercase tracking-wide admin-soft">Points balance</p>
                </div>
                <span className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--admin-btn-fg)]">
                  {customer.loyaltyAccount.tier}
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-[var(--admin-inset)] p-3">
                <p className="text-[10px] uppercase tracking-wide admin-soft">Referral code</p>
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
            <span className="text-[10px] uppercase tracking-wide admin-soft">
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
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <div className="ml-4">
                    <p className="text-sm font-semibold admin-text">{e.title}</p>
                    {e.description && <p className="text-xs admin-muted">{e.description}</p>}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide admin-soft">
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
                      <p className="text-[10px] admin-soft">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
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
                    <span className="shrink-0 rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-[10px] capitalize admin-muted">
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] admin-soft">
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
                    <p className="text-[10px] admin-soft">{c.relationship || "Caregiver"}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
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

        <AdminPanel title="Quick stats">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <Pill className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.refillRequests.length}</p>
              <p className="text-[10px] uppercase tracking-wide admin-soft">Total refills</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <FileText className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.prescriptions.length}</p>
              <p className="text-[10px] uppercase tracking-wide admin-soft">Prescriptions</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <HeartHandshake className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">{customer.caregivers.length}</p>
              <p className="text-[10px] uppercase tracking-wide admin-soft">Caregivers</p>
            </div>
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <Sparkles className="h-4 w-4 admin-accent-text" />
              <p className="mt-2 text-2xl font-bold admin-text">
                {customer.loyaltyAccount?.points ?? 0}
              </p>
              <p className="text-[10px] uppercase tracking-wide admin-soft">Loyalty pts</p>
            </div>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
