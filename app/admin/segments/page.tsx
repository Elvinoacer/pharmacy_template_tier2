import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateSegmentAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import SegmentForm from "@/app/components/admin/SegmentForm";

export const metadata = { title: "Segments" };

export default async function AdminSegmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const segments = await prisma.segment.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <AdminShell user={user} title="Customer segmentation">
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Segments">
          <ul className="space-y-3">
            {segments.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-teal-100/50">{s.description || "No description"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{s._count.members}</p>
                    <p className="text-[10px] text-teal-100/40">{s.isSystem ? "System" : "Custom"}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>
        <AdminPanel title="Create custom segment">
          <SegmentForm action={adminCreateSegmentAction} />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
