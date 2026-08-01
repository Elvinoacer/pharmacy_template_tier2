import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import PortalShell from "@/app/components/portal/PortalShell";
import { CaregiversView } from "@/app/components/portal/CaregiversView";

export const metadata = { title: "Caregivers" };

export default async function PortalCaregiversPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const caregivers = await prisma.caregiver.findMany({
    where: { customerId: user.customerId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PortalShell user={user} title="Caregivers">
      <p className="mb-5 text-sm text-[#5a6b62]">
        Authorise family members to request refills or receive pickup notifications on your behalf.
      </p>
      <CaregiversView caregivers={caregivers} />
    </PortalShell>
  );
}
