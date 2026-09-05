import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateSegmentAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import SegmentForm from "@/app/components/admin/SegmentForm";
import { Layers, Settings2, Building2 } from "lucide-react";

export const metadata = { title: "Segments" };

export default async function AdminSegmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const segments = await prisma.segment.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  const totalMembers = segments.reduce((sum, s) => sum + s._count.members, 0);

  return (
    <AdminShell
      user={user}
      title="Patient groups"
      subtitle="Organize patients into groups for relevant reminders and outreach."
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="admin-stat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Total segments</p>
          <p className="mt-1 text-2xl font-bold admin-text">{segments.length}</p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">System segments</p>
          <p className="mt-1 text-2xl font-bold admin-accent-text">
            {segments.filter((s) => s.isSystem).length}
          </p>
        </div>
        <div className="admin-stat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Total memberships</p>
          <p className="mt-1 text-2xl font-bold admin-text">{totalMembers}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Segments"
          description={`${segments.length} total`}
        >
          {segments.length === 0 ? (
            <AdminEmptyState
              icon={Layers}
              title="No segments yet"
              description="Create your first segment to group customers."
            />
          ) : (
            <ul className="space-y-2">
              {segments.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 transition hover:border-[var(--admin-border-2)]"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.isSystem ? "bg-[var(--admin-accent-soft)] admin-accent-text" : "bg-amber-400/15 text-amber-700"}`}>
                      {s.isSystem ? <Building2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold admin-text">{s.name}</p>
                      <p className="line-clamp-1 text-xs admin-muted">
                        {s.description || "No description"}
                      </p>
                      <p className="mt-0.5 text-xs uppercase tracking-wide admin-soft">
                        {s.isSystem ? "System segment" : "Custom"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold admin-text">{s._count.members}</p>
                    <p className="text-xs admin-soft">members</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Create custom segment" description="Add a new segment for targeting">
          <SegmentForm action={adminCreateSegmentAction} />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
