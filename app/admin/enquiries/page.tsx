import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminEnquiryAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";

export const metadata = { title: "Enquiries" };

export default async function AdminEnquiriesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <AdminShell user={user} title="Online enquiries">
      <AdminPanel title={`${enquiries.length} enquiries`}>
        <div className="space-y-4">
          {enquiries.map((e) => (
            <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-teal-100/50">
                    {e.type} · {e.email || e.phone || "no contact"} ·{" "}
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                  {e.subject && <p className="mt-1 text-sm text-teal-100/80">{e.subject}</p>}
                  <p className="mt-2 text-sm text-teal-50/90">{e.message}</p>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs capitalize">{e.status}</span>
              </div>
              <form action={adminEnquiryAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={e.id} />
                <select name="status" defaultValue={e.status} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs">
                  {["new", "in_progress", "resolved", "closed"].map((s) => (
                    <option key={s} value={s} className="text-black">
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  name="staffNotes"
                  defaultValue={e.staffNotes || ""}
                  placeholder="Staff notes"
                  className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs"
                />
                <button type="submit" className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs text-teal-100">
                  Update
                </button>
              </form>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
