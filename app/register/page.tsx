import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm
        action={registerAction}
        title="Create your account"
        subtitle="Track refills, caregivers, reminders, and loyalty rewards."
        submitLabel="Create account"
        showGoogleAuth
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
        <AuthField
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </AuthForm>
    </div>
  );
}
