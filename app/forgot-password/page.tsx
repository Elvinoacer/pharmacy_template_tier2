import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm
        action={forgotPasswordAction}
        title="Reset password"
        subtitle="Enter your email and we will prepare a secure reset link."
        submitLabel="Send reset link"
        footer={
          <p>
            <Link href="/login" className="font-semibold text-[#0d6e5a] hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        <AuthField label="Email" name="email" type="email" required autoComplete="email" />
      </AuthForm>
    </div>
  );
}
