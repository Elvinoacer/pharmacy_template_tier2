import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10 sm:py-14 afyvia-artwork-surface afyvia-route-surface">
      <AuthForm
        action={forgotPasswordAction}
        title="Reset password"
        subtitle="Enter your email and we will send a secure, single-use reset link."
        submitLabel="Send reset link"
        artworkBackdrop
        highlights={[
          "Reset links expire after two hours",
          "Your existing sessions stay protected",
          "Contact the pharmacy if you need help",
        ]}
        footer={
          <p>
            <Link href="/login" className="rounded-sm font-semibold text-[var(--brand)] underline-offset-2 hover:text-[var(--brand-deep)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
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
