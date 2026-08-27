import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";
import PasswordField from "@/app/components/PasswordField";
import { getSessionUser } from "@/app/lib/auth";
import { resolvePostLoginPath } from "@/app/lib/session-claim";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next || "";
  const error = sp.error || "";

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
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-10 sm:py-14">
      <AuthForm
        action={loginAction}
        title="Welcome back"
        subtitle="Sign in to open your customer portal, caregiver workspace, or staff CRM — based on your account."
        submitLabel="Sign in"
        hiddenFields={next ? { next } : undefined}
        showGoogleAuth
        initialError={error}
        highlights={[
          "Customers land in the patient portal",
          "Caregivers open the caregiver workspace",
          "Pharmacists & staff open the admin CRM",
        ]}
        footer={
          <>
            <p>
              No account?{" "}
              <Link href="/register" className="font-semibold text-[#0d6e5a] hover:underline">
                Create one
              </Link>
            </p>
            <p className="mt-2">
              <Link href="/forgot-password" className="text-[#0d6e5a] hover:underline">
                Forgot password?
              </Link>
            </p>
            {process.env.SHOW_DEMO_CREDENTIALS === "1" && (
            <p className="mt-4 rounded-2xl border border-teal-900/8 bg-teal-50/70 px-3 py-2.5 text-xs leading-relaxed text-[#5a6b62]">
              Demo password for all: <code className="rounded bg-white px-1 py-0.5 text-[11px]">Password123!</code>
              <br />
              Super-admin <code className="rounded bg-white px-1 py-0.5 text-[11px]">platform@aether.health</code> → /platform
              <br />
              Pharmacy manager <code className="rounded bg-white px-1 py-0.5 text-[11px]">manager@aetherpharmacy.com</code> → /admin
              <br />
              Patient <code className="rounded bg-white px-1 py-0.5 text-[11px]">jane@example.com</code> → /portal
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
