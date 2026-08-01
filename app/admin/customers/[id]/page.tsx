import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { getCustomerDetail } from "@/app/lib/services/crm";
import { prisma } from "@/app/lib/db";
import { refillStatusMeta } from "@/app/lib/types";
import { adminAddNoteAction, adminAssignSegmentAction, adminSendMessageAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import AdminNoteForm from "@/app/components/admin/AdminNoteForm";
import AdminMessageForm from "@/app/components/admin/AdminMessageForm";

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

  return (
    <AdminShell user={user} title={customer.fullName}>
      <div className="mb-4">
        <Link href="/admin/customers" className="text-sm text-teal-300 hover:underline">
          ← All customers
        </Link>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <AdminPanel title="Profile">
          <dl className="space-y-2 text-sm">
            <div><span className="text-teal-100/50">Email</span><p>{customer.user.email}</p></div>
            <div><span className="text-teal-100/50">Phone</span><p>{customer.phone || "—"}</p></div>
            <div><span className="text-teal-100/50">DOB</span><p>{customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : "—"}</p></div>
            <div><span className="text-teal-100/50">Branch</span><p>{customer.preferredBranch}</p></div>
            <div><span className="text-teal-100/50">Preferred channel</span><p className="capitalize">{customer.preferredCommunication}</p></div>
            <div><span className="text-teal-100/50">Address</span><p>{[customer.addressLine1, customer.city, customer.zip].filter(Boolean).join(", ") || "—"}</p></div>
          </dl>
        </AdminPanel>

        <AdminPanel title="Segments">
          <div className="mb-3 flex flex-wrap gap-1">
            {customer.segments.map((s) => (
              <span key={s.segmentId} className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs text-teal-100">
                {s.segment.name}
              </span>
            ))}
          </div>
          <form action={adminAssignSegmentAction} className="flex gap-2">
            <input type="hidden" name="customerId" value={customer.id} />
            <select name="segmentId" className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
              {segments.map((s) => (
                <option key={s.id} value={s.id} className="text-black">
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-teal-500/20 px-3 py-2 text-sm text-teal-100 hover:bg-teal-500/30">
              Add
            </button>
          </form>
        </AdminPanel>

        <AdminPanel title="Loyalty">
          {customer.loyaltyAccount ? (
            <div className="text-sm">
              <p className="text-2xl font-semibold">{customer.loyaltyAccount.points} pts</p>
              <p className="capitalize text-teal-100/60">{customer.loyaltyAccount.tier} · code {customer.loyaltyAccount.referralCode}</p>
            </div>
          ) : (
            <p className="text-sm text-teal-100/50">No loyalty account</p>
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Customer timeline">
          <ul className="max-h-96 space-y-3 overflow-y-auto">
            {customer.timelineEvents.map((e) => (
              <li key={e.id} className="border-l-2 border-teal-500/40 pl-3">
                <p className="text-sm font-medium">{e.title}</p>
                {e.description && <p className="text-xs text-teal-100/50">{e.description}</p>}
                <p className="text-[10px] text-teal-100/30">{new Date(e.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </AdminPanel>

        <AdminPanel title="Staff notes">
          <AdminNoteForm action={adminAddNoteAction} customerId={customer.id} />
          <ul className="mt-4 space-y-2">
            {customer.staffNotes.map((n) => (
              <li key={n.id} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                {n.isPinned && <span className="mr-1 text-[10px] text-amber-300">PINNED</span>}
                {n.body}
                <p className="mt-1 text-[10px] text-teal-100/40">
                  {n.author?.email} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </AdminPanel>

        <AdminPanel title="Refills">
          <ul className="space-y-2 text-sm">
            {customer.refillRequests.map((r) => {
              const meta = refillStatusMeta(r.status);
              return (
                <li key={r.id} className="flex justify-between gap-2">
                  <span>{r.medicineName}</span>
                  <span className="text-teal-100/60">{meta.label}</span>
                </li>
              );
            })}
          </ul>
        </AdminPanel>

        <AdminPanel title="Send message">
          <AdminMessageForm action={adminSendMessageAction} customerId={customer.id} />
        </AdminPanel>

        <AdminPanel title="Caregivers">
          {customer.caregivers.length === 0 ? (
            <p className="text-sm text-teal-100/50">None</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {customer.caregivers.map((c) => (
                <li key={c.id}>
                  {c.caregiverName} ({c.relationship || "—"}) · {c.status}
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Prescriptions">
          <ul className="space-y-2 text-sm">
            {customer.prescriptions.map((p) => (
              <li key={p.id}>
                {p.medicineName} · {p.rxReference || "no ref"} · {p.status}
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
