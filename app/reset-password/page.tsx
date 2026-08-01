import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";

export const metadata = { title: "Set new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token || "";

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm
        action={resetPasswordAction}
        title="Choose a new password"
        subtitle="Your reset link is single-use and expires after two hours."
        submitLabel="Update password"
        hiddenFields={{ token }}
        footer={
          <p>
            <Link href="/login" className="font-semibold text-[#0d6e5a] hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        {!token && (
          <p className="text-sm text-rose-700">Missing reset token. Use the link from your email.</p>
        )}
        <AuthField label="New password" name="password" type="password" required autoComplete="new-password" />
        <AuthField label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
      </AuthForm>
    </div>
  );
}
