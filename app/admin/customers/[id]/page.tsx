import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { getCustomerDetail } from "@/app/lib/services/crm";
import { prisma } from "@/app/lib/db";
import { refillStatusMeta } from "@/app/lib/types";
import {
  adminAddNoteAction,
  adminAssignSegmentAction,
  adminSendMessageAction,
} from "@/app/actions/admin";
import {
  AdminShell,
  AdminPanel,
  AdminEmptyState,
} from "@/app/components/admin/AdminShell";
import AdminNoteForm from "@/app/components/admin/AdminNoteForm";
import AdminMessageForm from "@/app/components/admin/AdminMessageForm";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building2,
  Plus,
  Pin,
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
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-[#2dd4bf] transition hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All customers
        </Link>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <AdminPanel title="Profile">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2dd4bf] to-[#0f766e] text-lg font-bold text-[#042f2e]">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{customer.fullName}</p>
              <p className="truncate text-xs text-[#ecfdf5]/55">{customer.user.email}</p>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2dd4bf]" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Email</p>
                <p className="truncate text-white">{customer.user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2dd4bf]" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Phone</p>
                <p className="text-white">{customer.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2dd4bf]" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Date of birth</p>
                <p className="text-white">
                  {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2dd4bf]" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Branch</p>
                <p className="text-white">{customer.preferredBranch}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2dd4bf]" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Address</p>
                <p className="text-white">
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
            <span className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">
              {customer.segments.length} active
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {customer.segments.length === 0 && (
              <p className="text-xs text-[#ecfdf5]/45">No segments assigned.</p>
            )}
            {customer.segments.map((s) => (
              <span
                key={s.segmentId}
                className="inline-flex items-center gap-1 rounded-full bg-[#2dd4bf]/15 px-2 py-0.5 text-[10px] font-medium text-[#2dd4bf]"
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
              <option value="" className="bg-[#122620]">Choose a segment…</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#122620]">
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-[#2dd4bf]/20 px-3 py-2 text-xs font-semibold text-[#2dd4bf] transition hover:bg-[#2dd4bf]/30"
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
                  <p className="text-3xl font-bold text-white">{customer.loyaltyAccount.points}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Points balance</p>
                </div>
                <span className="rounded-full bg-gradient-to-br from-amber-400 to-amber-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#042f2e]">
                  {customer.loyaltyAccount.tier}
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Referral code</p>
                <p className="font-mono text-lg font-bold text-[#2dd4bf]">{customer.loyaltyAccount.referralCode}</p>
              </div>
              <p className="mt-2 text-xs text-[#ecfdf5]/55">
                Lifetime: <strong className="text-white">{customer.loyaltyAccount.lifetimePoints}</strong> pts
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#ecfdf5]/45">No loyalty account.</p>
          )}
        </AdminPanel>
      </div>

      {/* Middle — timeline + send message */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <AdminPanel
          title="Customer timeline"
          description="Most recent activity"
          action={
            <span className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">
              {customer.timelineEvents.length} events
            </span>
          }
        >
          {customer.timelineEvents.length === 0 ? (
            <AdminEmptyState icon={Activity} title="No activity yet" />
          ) : (
            <ol className="relative max-h-96 space-y-3 overflow-y-auto scroll-thin-dark pl-4">
              <span className="absolute left-1.5 top-1 bottom-1 w-px bg-white/[0.06]" />
              {customer.timelineEvents.slice(0, 30).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-2.5 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#2dd4bf] ring-4 ring-[#0a1612]">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-white">{e.title}</p>
                    {e.description && <p className="text-xs text-[#ecfdf5]/55">{e.description}</p>}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#ecfdf5]/35">
                      {new Date(e.createdAt).toLocaleString()}
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
              className="text-xs font-semibold text-[#2dd4bf] hover:underline"
            >
              View all
            </Link>
          }
        >
          {customer.refillRequests.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#ecfdf5]/45">No refills yet.</p>
          ) : (
            <ul className="space-y-2">
              {customer.refillRequests.slice(0, 8).map((r) => {
                const meta = refillStatusMeta(r.status);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{r.medicineName}</p>
                      <p className="text-[10px] text-[#ecfdf5]/45">
                        {new Date(r.createdAt).toLocaleDateString()}
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
            <p className="py-4 text-center text-xs text-[#ecfdf5]/45">No prescriptions.</p>
          ) : (
            <ul className="space-y-2">
              {customer.prescriptions.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-white">{p.medicineName}</p>
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] capitalize text-[#ecfdf5]/70">
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#ecfdf5]/45">
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
            <p className="py-4 text-center text-xs text-[#ecfdf5]/45">No caregivers.</p>
          ) : (
            <ul className="space-y-2">
              {customer.caregivers.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{c.caregiverName}</p>
                    <p className="text-[10px] text-[#ecfdf5]/45">{c.relationship || "Caregiver"}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      c.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
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
          description={`${customer.staffNotes.length} notes`}
          className="lg:col-span-2"
        >
          <AdminNoteForm action={adminAddNoteAction} customerId={customer.id} />
          {customer.staffNotes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {customer.staffNotes.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl px-3 py-2.5 text-sm ${
                    n.isPinned ? "bg-amber-400/10 border border-amber-400/20" : "bg-white/[0.03]"
                  }`}
                >
                  {n.isPinned && (
                    <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                      <Pin className="h-2.5 w-2.5" /> Pinned
                    </span>
                  )}
                  <p className="whitespace-pre-wrap text-[#ecfdf5]/90">{n.body}</p>
                  <p className="mt-1 text-[10px] text-[#ecfdf5]/45">
                    {n.author?.email} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Quick stats">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <Pill className="h-4 w-4 text-[#2dd4bf]" />
              <p className="mt-2 text-2xl font-bold text-white">{customer.refillRequests.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Total refills</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <FileText className="h-4 w-4 text-[#2dd4bf]" />
              <p className="mt-2 text-2xl font-bold text-white">{customer.prescriptions.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Prescriptions</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <HeartHandshake className="h-4 w-4 text-[#2dd4bf]" />
              <p className="mt-2 text-2xl font-bold text-white">{customer.caregivers.length}</p>
              <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Caregivers</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <Sparkles className="h-4 w-4 text-[#2dd4bf]" />
              <p className="mt-2 text-2xl font-bold text-white">
                {customer.loyaltyAccount?.points ?? 0}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[#ecfdf5]/45">Loyalty pts</p>
            </div>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
