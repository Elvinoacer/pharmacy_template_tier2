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
      <div className="mx-auto grid w-full max-w-[1280px] min-w-0 gap-4 sm:gap-6 md:grid-cols-3 [&_.card-premium>div:first-child>div>p]:text-sm">
        <aside className="min-w-0 space-y-4 md:col-span-1">
          <Panel>
            <div className="flex min-w-0 flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] text-xl font-bold text-white shadow-lg shadow-teal-900/20 sm:h-20 sm:w-20 sm:text-2xl">
                {(profile.fullName || "?")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("")}
              </div>
              <p className="mt-3 max-w-full break-words text-base font-semibold text-[#0c1a14] dark:text-slate-100 sm:text-lg">{profile.fullName}</p>
              <p className="mt-1 max-w-full break-words text-sm text-[#5a6b62] dark:text-slate-400">{profile.preferredBranch || "No preferred branch set"}</p>
              {profile.preferredCommunication && (
                <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-[#e6f4ef] px-3 py-1 text-sm font-semibold uppercase tracking-wide text-[#0d6e5a] dark:bg-teal-500/15 dark:text-teal-300">
                  <span className="break-words">Prefers {profile.preferredCommunication}</span>
                </span>
              )}
            </div>
          </Panel>

          <Panel title="Account">
            <ul className="min-w-0 space-y-3 text-sm">
              <li className="flex min-w-0 items-start gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-[#0d6e5a] dark:text-teal-300" />
                <div className="min-w-0">
                  <p className="text-sm text-[#5a6b62] dark:text-slate-400">Email</p>
                  <p className="break-all font-medium text-[#0c1a14] dark:text-slate-100">{profile.user.email}</p>
                  {profile.user.emailVerified ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> Not verified
                    </span>
                  )}
                </div>
              </li>
              {profile.phone && (
                <li className="flex min-w-0 items-start gap-3">
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-[#0d6e5a] dark:text-teal-300" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#5a6b62] dark:text-slate-400">Phone</p>
                    <p className="break-words font-medium text-[#0c1a14] dark:text-slate-100">{profile.phone}</p>
                  </div>
                </li>
              )}
              {(profile.addressLine1 || profile.city) && (
                <li className="flex min-w-0 items-start gap-3">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#0d6e5a] dark:text-teal-300" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#5a6b62] dark:text-slate-400">Address</p>
                    <p className="break-words font-medium leading-relaxed text-[#0c1a14] dark:text-slate-100">
                      {[profile.addressLine1, profile.city, profile.state, profile.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </li>
              )}
              {profile.emergencyContactName && (
                <li className="flex min-w-0 items-start gap-3">
                  <Heart className="mt-1 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-300" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#5a6b62] dark:text-slate-400">Emergency contact</p>
                    <p className="break-words font-medium text-[#0c1a14] dark:text-slate-100">{profile.emergencyContactName}</p>
                    {profile.emergencyContactPhone && (
                      <p className="break-words text-sm text-[#5a6b62] dark:text-slate-400">{profile.emergencyContactPhone}</p>
                    )}
                  </div>
                </li>
              )}
            </ul>
          </Panel>
        </aside>

        <div className="min-w-0 md:col-span-2">
          <Panel
            title="Personal details"
            description="Update your contact information, address, and emergency contact"
          >
            <div className="[&_button]:min-h-11 [&_button]:min-w-11 [&_button]:text-sm [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_legend]:text-sm [&_.label-premium]:text-sm [&_fieldset>p]:text-sm [&_section_p]:text-sm">
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
                preferredBranch: profile.preferredBranch || "",
                }}
              />
            </div>
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
