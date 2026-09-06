import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { EmptyState } from "@/app/components/portal/PortalWidgets";
import { CaregiversView } from "@/app/components/portal/CaregiversView";
import { HeartHandshake } from "lucide-react";

export const metadata = { title: "Caregivers" };

export default async function PortalCaregiversPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const [caregivers, clockRows] = await Promise.all([
    prisma.caregiver.findMany({
      where: { customerId: user.customerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRaw<Array<{ nowMs: bigint }>>`
      SELECT (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::bigint AS "nowMs"
    `,
  ]);

  const nowMs = Number(clockRows[0]?.nowMs ?? 0);
  const caregiverRows = caregivers.map((caregiver) => ({
    ...caregiver,
    // 60s resend cooldown measured from the database clock so rendering stays deterministic.
    cooldownRemainingSeconds: caregiver.lastInviteSentAt
      ? Math.max(
          0,
          60 - Math.floor((nowMs - new Date(caregiver.lastInviteSentAt).getTime()) / 1000),
        )
      : 0,
  }));
  const active = caregivers.filter((caregiver) => caregiver.status === "active");

  return (
    <PortalShell
      user={user}
      title="Caregivers"
      subtitle="Authorise family members or carers to manage refills on your behalf."
    >
      {caregivers.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No caregivers yet"
          description="Add a trusted family member or carer so they can request refills and receive pickup notifications for you."
          action={<CaregiversView caregivers={[]} />}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="card-premium p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5a6b62]">Total caregivers</p>
              <p className="mt-1 text-2xl font-bold text-[#0c1a14]">{caregivers.length}</p>
            </div>
            <div className="card-premium p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5a6b62]">Active</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{active.length}</p>
            </div>
            <div className="card-premium p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5a6b62]">Can request refills</p>
              <p className="mt-1 text-2xl font-bold text-[#0d6e5a]">
                {active.filter((caregiver) => caregiver.canRequestRefills).length}
              </p>
            </div>
          </div>
          <CaregiversView caregivers={caregiverRows} />
        </>
      )}
    </PortalShell>
  );
}
