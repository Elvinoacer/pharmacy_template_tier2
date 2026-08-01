import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { portalRefillAction } from "@/app/actions/portal";
import PortalShell, { Panel } from "@/app/components/portal/PortalShell";
import PortalRefillForm from "@/app/components/portal/PortalRefillForm";

export const metadata = { title: "Request refill" };

export default async function NewRefillPage({
  searchParams,
}: {
  searchParams: Promise<{ prescriptionId?: string; medicine?: string; rx?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  const sp = await searchParams;

  const profile = await prisma.customerProfile.findUnique({ where: { id: user.customerId } });
  const prescriptions = await prisma.prescription.findMany({
    where: { customerId: user.customerId, status: "active" },
    orderBy: { medicineName: "asc" },
  });

  return (
    <PortalShell user={user} title="Request a refill">
      <Panel title="AI-assisted refill form">
        <p className="mb-4 text-sm text-[#5a6b62]">
          Complete the details below. A pharmacist will review every request before preparing your
          medication — this is not a clinical approval.
        </p>
        <PortalRefillForm
          action={portalRefillAction}
          prescriptions={prescriptions.map((p) => ({
            id: p.id,
            medicineName: p.medicineName,
            rxReference: p.rxReference,
          }))}
          defaults={{
            prescriptionId: sp.prescriptionId || "",
            medicineName: sp.medicine || "",
            rxReference: sp.rx || "",
            phone: profile?.phone || "",
          }}
        />
      </Panel>
    </PortalShell>
  );
}
