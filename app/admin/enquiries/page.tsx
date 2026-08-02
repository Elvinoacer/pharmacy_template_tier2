import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminEnquiryAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Mail, Clock, Save, Inbox, User } from "lucide-react";

export const metadata = { title: "Enquiries" };

const STATUS_COLOR: Record<string, string> = {
  new: "bg-rose-500/15 text-rose-600",
  in_progress: "bg-amber-500/15 text-amber-700",
  resolved: "bg-emerald-500/15 text-emerald-700",
  closed: "bg-slate-500/15 text-slate-600",
};

const TYPE_ICON: Record<string, string> = {
  general: "💬",
  product_availability: "📦",
  delivery: "🚚",
  contact: "📧",
  careers: "💼",
  other: "❓",
};

export default async function AdminEnquiriesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: { select: { fullName: true } } },
  });

  const counts = {
    new: enquiries.filter((e) => e.status === "new").length,
    in_progress: enquiries.filter((e) => e.status === "in_progress").length,
    resolved: enquiries.filter((e) => e.status === "resolved").length,
    closed: enquiries.filter((e) => e.status === "closed").length,
  };

  return (
    <AdminShell
      user={user}
      title="Online enquiries"
      subtitle={`${enquiries.length} enquiry ${enquiries.length === 1 ? "" : "entries"} from website, portal, and AI`}
    >
      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["new", "in_progress", "resolved", "closed"] as const).map((s) => (
          <div key={s} className="admin-stat p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">
              {s.replace("_", " ")}
            </p>
            <p className="mt-1 text-2xl font-bold admin-text">{counts[s]}</p>
          </div>
        ))}
      </div>

      <AdminPanel>
        {enquiries.length === 0 ? (
          <AdminEmptyState
            icon={Inbox}
            title="No enquiries yet"
            description="Customer enquiries from the website contact form will land here."
          />
        ) : (
          <div className="space-y-3">
            {enquiries.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition hover:border-[var(--admin-border-2)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TYPE_ICON[e.type] || "💬"}</span>
                      <p className="font-semibold admin-text">{e.name}</p>
                      {e.customer && (
                        <span className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-0.5 text-[10px] font-medium admin-accent-text">
                          <User className="mr-0.5 inline h-2.5 w-2.5" />
                          Registered
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLOR[e.status]}`}>
                        {e.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs admin-muted">
                      <span className="capitalize">{e.type.replace("_", " ")}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> {e.email || "no email"}
                      </span>
                      {e.phone && (
                        <>
                          <span>·</span>
                          <span>{e.phone}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </p>
                    {e.subject && (
                      <p className="mt-2 text-sm font-medium admin-text">{e.subject}</p>
                    )}
                    <p className="mt-1 text-sm admin-text">{e.message}</p>
                    {e.staffNotes && (
                      <p className="mt-2 rounded-lg bg-[var(--admin-inset)] px-3 py-1.5 text-xs admin-muted">
                        <strong className="admin-accent-text">Staff notes:</strong> {e.staffNotes}
                      </p>
                    )}
                  </div>
                </div>
                <form action={adminEnquiryAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--admin-border)] pt-3">
                  <input type="hidden" name="id" value={e.id} />
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide admin-soft">Status</label>
                    <select
                      name="status"
                      defaultValue={e.status}
                      className="rounded-lg border border-[var(--admin-border-2)] bg-[var(--admin-inset)] px-2.5 py-1.5 text-xs admin-text focus:border-[var(--admin-accent)] focus:outline-none"
                    >
                      {["new", "in_progress", "resolved", "closed"].map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] uppercase tracking-wide admin-soft">Staff notes</label>
                    <input
                      name="staffNotes"
                      defaultValue={e.staffNotes || ""}
                      placeholder="Add internal notes…"
                      className="input-admin"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-accent-soft)] px-3 py-2 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-accent-soft)]"
                  >
                    <Save className="h-3.5 w-3.5" /> Update
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
