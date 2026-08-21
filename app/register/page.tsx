import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";
import PasswordField from "@/app/components/PasswordField";
import { getSessionUser } from "@/app/lib/auth";
import { resolvePostLoginPath } from "@/app/lib/session-claim";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const session = await getSessionUser().catch(() => null);
  if (session) {
    redirect(resolvePostLoginPath({ role: session.role, customerId: session.customerId, platformAdmin: session.platformAdmin }));
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-10 sm:py-14">
      <AuthForm
        action={registerAction}
        title="Create your account"
        subtitle="Track refills, caregivers, reminders, and loyalty rewards from one secure portal."
        submitLabel="Create account"
        showGoogleAuth
        highlights={[
          "Live password strength as you type",
          "Email verification keeps your account safe",
          "Welcome loyalty points on day one",
        ]}
        footer={
          <p>
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-[#0d6e5a] hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <AuthField label="Full name" name="fullName" required autoComplete="name" />
        <AuthField label="Email" name="email" type="email" required autoComplete="email" />
        <AuthField label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="Optional" />
        <AuthField label="Date of birth" name="dateOfBirth" type="date" />
        <PasswordField
          label="Password"
          name="password"
          required
          autoComplete="new-password"
          placeholder="Create a strong password"
          showRequirements
        />
      </AuthForm>
    </div>
  );
}
