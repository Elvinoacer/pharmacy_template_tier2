import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { updateProfileAction } from "@/app/actions/portal";
import PortalShell, { Panel } from "@/app/components/portal/PortalShell";
import ProfileForm from "@/app/components/portal/ProfileForm";

export const metadata = { title: "My profile" };

export default async function PortalProfilePage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const profile = await prisma.customerProfile.findUnique({
    where: { id: user.customerId },
    include: { user: { select: { email: true, emailVerified: true, phoneVerified: true } } },
  });
  if (!profile) redirect("/login");

  return (
    <PortalShell user={user} title="Profile">
      <Panel title="Personal details">
        <p className="mb-4 text-sm text-[#5a6b62]">
          Account email: <strong>{profile.user.email}</strong>
          {profile.user.emailVerified ? " · verified" : " · not verified"}
        </p>
        <ProfileForm
          action={updateProfileAction}
          profile={{
            fullName: profile.fullName,
            phone: profile.phone || "",
            dateOfBirth: profile.dateOfBirth
              ? profile.dateOfBirth.toISOString().slice(0, 10)
              : "",
            gender: profile.gender || "",
            addressLine1: profile.addressLine1 || "",
            addressLine2: profile.addressLine2 || "",
            city: profile.city || "",
            state: profile.state || "",
            zip: profile.zip || "",
            preferredCommunication: profile.preferredCommunication,
            emergencyContactName: profile.emergencyContactName || "",
            emergencyContactPhone: profile.emergencyContactPhone || "",
            preferredBranch: profile.preferredBranch || "Main Branch",
          }}
        />
      </Panel>
    </PortalShell>
  );
}
