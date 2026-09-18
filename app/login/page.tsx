import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";
import PasswordField from "@/app/components/PasswordField";
import { getSessionUser } from "@/app/lib/auth";
import { resolvePostLoginPath } from "@/app/lib/session-claim";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; verified?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next || "";
  const error = sp.error || "";
  const verified = sp.verified === "1";

  // Already signed in → send them to the portal their role owns.
  const session = await getSessionUser().catch(() => null);
  if (session) {
    redirect(
      resolvePostLoginPath(
        { role: session.role, customerId: session.customerId, platformAdmin: session.platformAdmin },
        next || null,
      ),
    );
  }

  return (
    <div className="aether-login-page aether-artwork-surface aether-route-surface">
      {verified ? (
        <div className="mx-auto mb-4 flex w-full max-w-xl items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Email verified successfully.</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800 dark:text-emerald-200">
              {next.startsWith("/onboard")
                ? "This browser is not signed in to your pharmacy onboarding session. Sign in to continue here, or return to the original onboarding tab—it will detect the verification automatically."
                : "Sign in to continue. If you verified from another device, you can safely return to your original session as well."}
            </p>
          </div>
        </div>
      ) : null}
      <AuthForm
        action={loginAction}
        title="Welcome back"
        subtitle="One sign-in for your care, your pharmacy, or platform administration. We’ll open the right workspace for you."
        submitLabel="Sign in"
        hiddenFields={next ? { next } : undefined}
        showGoogleAuth
        artworkBackdrop
        initialError={error}
        highlights={[
          "Customers land in the patient portal",
          "Caregivers open the caregiver workspace",
          "Pharmacists & staff manage their pharmacy",
          "Platform admins manage the network",
        ]}
        footer={
          <>
            <p>
              No account?{" "}
              <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-[var(--brand)] hover:underline">
                Create one
              </Link>
            </p>
            <p className="mt-2">
              <Link href="/forgot-password" className="text-[var(--brand)] hover:underline">
                Forgot password?
              </Link>
            </p>
            {process.env.SHOW_DEMO_CREDENTIALS === "1" && (
              <p className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-sunken)] px-3 py-2.5 text-xs leading-relaxed text-[var(--muted)]">
                Demo password for all: <code className="rounded bg-[var(--card)] px-1 py-0.5 text-[11px] text-[var(--foreground)] border border-[var(--line)]">Password123!</code>
                <br />
                Super-admin <code className="rounded bg-[var(--card)] px-1 py-0.5 text-[11px] text-[var(--foreground)] border border-[var(--line)]">platform@aether.health</code> → /platform
                <br />
                Pharmacy manager <code className="rounded bg-[var(--card)] px-1 py-0.5 text-[11px] text-[var(--foreground)] border border-[var(--line)]">manager@aetherpharmacy.com</code> → /admin
                <br />
                Patient <code className="rounded bg-[var(--card)] px-1 py-0.5 text-[11px] text-[var(--foreground)] border border-[var(--line)]">jane@example.com</code> → /portal
              </p>
            )}
          </>
        }
      >
        <AuthField label="Email" name="email" type="email" required autoComplete="email" />
        <PasswordField
          label="Password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Your password"
        />
      </AuthForm>
    </div>
  );
}
