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
            <Link href="/login" className="rounded-sm font-semibold text-[#0d6e5a] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e5a] dark:text-teal-300 dark:hover:text-teal-200 dark:focus-visible:ring-teal-300">
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
