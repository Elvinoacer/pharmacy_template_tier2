import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { updateProfileAction } from "@/app/actions/portal";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel } from "@/app/components/portal/PortalWidgets";
import ProfileForm from "@/app/components/portal/ProfileForm";
import { toLocalDateInputValue } from "@/app/lib/time";
import { Mail, ShieldCheck, AlertTriangle, MapPin, Phone, Heart } from "lucide-react";

export const metadata = { title: "My profile" };

export default async function PortalProfilePage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  const profile = await prisma.customerProfile.findUnique({
    where: { id: user.customerId },
    include: { user: { select: { email: true, emailVerified: true, phoneVerified: true } } },
  });
  if (!profile) redirect("/login");

  return (
    <PortalShell
      user={user}
      title="Profile"
      subtitle="Keep your details current so pharmacists and carers can reach you."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account summary */}
        <aside className="space-y-3 lg:col-span-1">
          <Panel>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-2xl font-bold text-white shadow-lg shadow-teal-900/20">
                {(profile.fullName || "?")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("")}
              </div>
              <p className="mt-3 text-lg font-semibold text-[#0c1a14]">{profile.fullName}</p>
              <p className="text-xs text-[#5a6b62]">{profile.preferredBranch}</p>
              {profile.preferredCommunication && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d6e5a]">
                  Prefers {profile.preferredCommunication}
                </span>
              )}
            </div>
          </Panel>

          <Panel title="Account">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                <div className="min-w-0">
                  <p className="text-xs text-[#5a6b62]">Email</p>
                  <p className="truncate font-medium text-[#0c1a14]">{profile.user.email}</p>
                  {profile.user.emailVerified ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> Not verified
                    </span>
                  )}
                </div>
              </li>
              {profile.phone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                  <div>
                    <p className="text-xs text-[#5a6b62]">Phone</p>
                    <p className="font-medium text-[#0c1a14]">{profile.phone}</p>
                  </div>
                </li>
              )}
              {(profile.addressLine1 || profile.city) && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 text-[#0d6e5a]" />
                  <div>
                    <p className="text-xs text-[#5a6b62]">Address</p>
                    <p className="font-medium text-[#0c1a14]">
                      {[profile.addressLine1, profile.city, profile.state, profile.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </li>
              )}
              {profile.emergencyContactName && (
                <li className="flex items-start gap-2.5">
                  <Heart className="mt-0.5 h-4 w-4 text-rose-500" />
                  <div>
                    <p className="text-xs text-[#5a6b62]">Emergency contact</p>
                    <p className="font-medium text-[#0c1a14]">{profile.emergencyContactName}</p>
                    {profile.emergencyContactPhone && (
                      <p className="text-xs text-[#5a6b62]">{profile.emergencyContactPhone}</p>
                    )}
                  </div>
                </li>
              )}
            </ul>
          </Panel>
        </aside>

        {/* Edit form */}
        <div className="lg:col-span-2">
          <Panel
            title="Personal details"
            description="Update your contact information, address, and emergency contact"
          >
            <ProfileForm
              action={updateProfileAction}
              profile={{
                fullName: profile.fullName,
                phone: profile.phone || "",
                dateOfBirth: profile.dateOfBirth
                  ? toLocalDateInputValue(profile.dateOfBirth)
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
        </div>
      </div>
    </PortalShell>
  );
}
