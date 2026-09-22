import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateSegmentAction } from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { PremiumFeatureNotice } from "@/app/components/admin/PremiumFeatureNotice";
import SegmentForm from "@/app/components/admin/SegmentForm";
import { Layers, Settings2, Building2, Users } from "lucide-react";
import { hasPremiumPlan } from "@/app/lib/platform/entitlements";

export const metadata = { title: "Segments" };

export default async function AdminSegmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const pharmacyId =
    user.activePharmacyId ||
    user.memberships.find((membership) => membership.status === "active")?.pharmacyId;
  if (!pharmacyId) redirect("/admin/select");
  const premiumActive = await hasPremiumPlan(pharmacyId);

  const segments = await prisma.segment.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  const systemSegments = segments.filter((s) => s.isSystem).length;
  const totalMembers = segments.reduce((sum, s) => sum + s._count.members, 0);

  return (
    <AdminShell
      user={user}
      title="Patient groups"
      subtitle="Build clear patient audiences for reminders and outreach, with membership volume visible at a glance."
    >
      {!premiumActive && (
        <div className="mb-5">
          <PremiumFeatureNotice
            title="Build your own patient audiences"
            description="System-managed patient groups stay available on Free. Premium lets you create custom segments for targeted campaigns, reminders and retention workflows."
            benefits={["Custom patient groups", "Targeted outreach", "Reusable audiences"]}
          />
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="admin-stat min-w-0 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide admin-muted">Segments</p>
              <p className="mt-1 text-2xl font-bold admin-text">{segments.length}</p>
            </div>
            <span className="admin-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Layers className="h-4 w-4 admin-accent-text" />
            </span>
          </div>
        </div>
        <div className="admin-stat min-w-0 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide admin-muted">System</p>
              <p className="mt-1 text-2xl font-bold admin-text">{systemSegments}</p>
            </div>
            <span className="admin-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Building2 className="h-4 w-4 admin-accent-text" />
            </span>
          </div>
        </div>
        <div className="admin-stat col-span-2 min-w-0 p-4 sm:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide admin-muted">Memberships</p>
              <p className="mt-1 text-2xl font-bold admin-text">{totalMembers}</p>
            </div>
            <span className="admin-icon-well flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Users className="h-4 w-4 admin-accent-text" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)] lg:items-start">
        <AdminPanel title="Segment library" description={`${segments.length} patient groups available`}>
          {segments.length === 0 ? (
            <AdminEmptyState
              icon={Layers}
              title="No segments yet"
              description="Create your first segment to group patients for targeted communication."
            />
          ) : (
            <ul className="space-y-2">
              {segments.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-colors hover:border-[var(--admin-border-2)]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.isSystem ? "bg-[var(--admin-accent-soft)] admin-accent-text" : "bg-amber-500/10 text-amber-700"}`}>
                      {s.isSystem ? <Building2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-semibold admin-text">{s.name}</p>
                          <p className="mt-1 break-words text-sm leading-5 admin-muted">
                            {s.description || "No description"}
                          </p>
                        </div>
                        <div className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-1 text-sm">
                          <span className="font-bold admin-text">{s._count.members}</span>
                          <span className="admin-soft">members</span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-wide admin-soft">
                        {s.isSystem ? "System managed" : "Custom audience"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        {premiumActive ? (
          <AdminPanel title="Create custom segment" description="Add a focused audience for targeting">
            <SegmentForm action={adminCreateSegmentAction} />
          </AdminPanel>
        ) : (
          <AdminPanel title="Custom audiences" description="Preview what unlocks with Premium">
            <PremiumFeatureNotice
              compact
              title="Create audiences around the customers you want to reach"
              description="Examples include customers due for refill, diabetes care customers, inactive customers, high-value customers and frequent OTC buyers."
            />
          </AdminPanel>
        )}
      </div>
    </AdminShell>
  );
}
