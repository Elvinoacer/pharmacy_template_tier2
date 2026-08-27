import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel } from "@/app/components/portal/PortalWidgets";
import { updateProfileAction } from "@/app/actions/portal";
import ProfileForm from "@/app/components/portal/ProfileForm";
import { toLocalDateInputValue } from "@/app/lib/time";
import { CheckCircle2, UserPlus, Shield, Heart, Sparkles } from "lucide-react";

export const metadata = { title: "Complete your profile" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login?next=/portal/onboarding");

  // If already onboarded, bounce to /portal.
  const profile = await prisma.customerProfile.findUnique({
    where: { id: user.customerId },
    include: { preferences: true, user: { select: { email: true, emailVerified: true } } },
  });
  if (!profile) redirect("/login");
  if (profile.onboardingCompletedAt) redirect("/portal");

  return (
    <PortalShell
      user={user}
      title="Welcome to the network"
      subtitle="Let's set up your profile so you can start using the portal."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-3 lg:col-span-1">
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0c1a14]">You&apos;re almost there</p>
                <p className="mt-0.5 text-xs text-[#5a6b62]">
                  Completing your profile takes 2 minutes and unlocks refills, prescriptions tracking,
                  loyalty rewards, and direct messaging with our pharmacists.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="What you get">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
                <span className="text-[#0c1a14]">Request prescription refills online</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
                <span className="text-[#0c1a14]">Track your medication adherence with AI insights</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
                <span className="text-[#0c1a14]">Earn loyalty points on every refill</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
                <span className="text-[#0c1a14]">Message our pharmacists directly</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
                <span className="text-[#0c1a14]">Add caregivers to manage your care</span>
              </li>
            </ul>
          </Panel>

          <Panel>
            <div className="space-y-2 text-xs text-[#5a6b62]">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-[#0d6e5a]" />
                <span>Your data is encrypted and never shared.</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-[#0d6e5a]" />
                <span>You can update these details anytime in Profile.</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#0d6e5a]" />
                <span>
                  We&apos;ll auto-tag your age segment (infant, teen, adult, etc.) based on your birthday
                  so we can personalise care.
                </span>
              </div>
            </div>
          </Panel>
        </aside>

        <div className="lg:col-span-2">
          <Panel
            title="Complete your profile"
            description="Required fields are marked with *"
          >
            <ProfileForm
              action={updateProfileAction}
              profile={{
                fullName: profile.fullName || "",
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
                preferredBranch: profile.preferredBranch || "",
              }}
            />
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
