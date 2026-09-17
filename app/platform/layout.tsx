import "../workspace-compat.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionUser } from "@/app/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { startMfaEnrollmentAction } from "@/app/actions/mfa";
import { platform } from "@/app/lib/data";
import PlatformNav from "@/app/components/platform/PlatformNav";
import MfaEnrollForm from "@/app/platform/_components/MfaEnrollForm";
import { PlatformPage } from "@/app/platform/_components/PlatformPage";
import { WorkspaceShell } from "@/app/components/workspace/WorkspaceShell";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform");
  if (!user.platformAdmin) redirect("/admin");

  const needsMfa = !user.twoFactorEnabled || !user.mfaVerifiedAt;
  const h = await headers();
  const pathname = h.get("x-pathname") || h.get("x-invoke-path") || "";
  const returnPath = h.get("x-return-path") || "";
  const onSecurityRoute =
    pathname === "/platform/security" || returnPath.startsWith("/platform/security");

  // Do not make the MFA screen depend on a redirect successfully completing.
  // Next.js can issue internal RSC requests where route headers are incomplete;
  // redirecting those requests back to /platform/security can create a
  // self-refresh loop that leaves only the root chrome visible. Render the gate
  // directly whenever this session still needs MFA, and only redirect ordinary
  // full platform navigations when we can positively identify the route.
  if (needsMfa && pathname && !onSecurityRoute) {
    redirect("/platform/security?mfa=required");
  }

  if (needsMfa) {
    return (
      <main className="platform-security-shell shell-grid-admin min-h-dvh bg-[var(--admin-bg)] px-4 py-8 text-[var(--admin-text)] sm:py-10">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/"
            className="mb-7 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-[var(--admin-text-muted)] transition hover:text-[var(--admin-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] sm:mb-8"
          >
            ← Back to marketplace
          </Link>

          <PlatformPage
            title={user.twoFactorEnabled ? "Verify your sign-in" : "Secure your admin account"}
            description="Complete this step to open platform administration."
          >
            <div className="rounded-3xl border border-teal-200 bg-white p-4 shadow-sm dark:border-teal-200/20 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
              <p className="break-all text-sm font-medium text-teal-800 dark:text-teal-100">
                {user.email}
              </p>
              <MfaEnrollForm
                startAction={startMfaEnrollmentAction}
                enabled={user.twoFactorEnabled}
              />
            </div>
          </PlatformPage>

          <form action={logoutAction} className="mt-8">
            <button className="min-h-11 rounded-lg text-sm font-medium text-[var(--admin-text-muted)] underline underline-offset-4 transition hover:text-[var(--admin-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceShell
      role="platform"
      user={user}
      brand={{
        name: platform.legalName,
        network: "Aether Pharmacy Network",
        slug: null,
      }}
    >
      {children}
    </WorkspaceShell>
  );
}
