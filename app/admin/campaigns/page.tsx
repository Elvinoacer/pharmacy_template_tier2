import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { adminCreateCampaignAction, adminLaunchCampaignAction } from "@/app/actions/admin";
import AdminShell, { AdminPanel } from "@/app/components/admin/AdminShell";
import CampaignForm from "@/app/components/admin/CampaignForm";

export const metadata = { title: "Campaigns" };

export default async function AdminCampaignsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [campaigns, segments] = await Promise.all([
    prisma.campaign.findMany({
      include: { segment: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.segment.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminShell user={user} title="Campaign management">
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Create campaign">
          <CampaignForm
            action={adminCreateCampaignAction}
            segments={segments.map((s) => ({ id: s.id, name: s.name }))}
          />
        </AdminPanel>

        <AdminPanel title="All campaigns">
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-teal-100/50">
                      {c.channel} · {c.segment?.name || "All customers"} · {c.status}
                    </p>
                    <p className="mt-1 text-sm text-teal-100/70 line-clamp-2">{c.body}</p>
                  </div>
                  {(c.status === "draft" || c.status === "scheduled") && user.role === "manager" && (
                    <form action={adminLaunchCampaignAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-semibold text-[#042f2e]">
                        Launch
                      </button>
                    </form>
                  )}
                </div>
                {c.stats && typeof c.stats === "object" && (
                  <p className="mt-2 text-[10px] text-teal-100/40">
                    Stats: {JSON.stringify(c.stats)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
