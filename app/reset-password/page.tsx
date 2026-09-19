import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import AuthForm from "@/app/components/AuthForm";
import ResetPasswordFields from "@/app/components/ResetPasswordFields";

export const metadata = { title: "Set new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10 sm:py-14 afyvia-artwork-surface afyvia-route-surface">
      <AuthForm
        action={resetPasswordAction}
        title="Choose a new password"
        subtitle="Your reset link is single-use and expires after two hours."
        submitLabel="Update password"
        artworkBackdrop
        hiddenFields={{ token }}
        highlights={[
          "Meet every password requirement in real time",
          "Toggle visibility to avoid typos",
          "You will sign in again with the new password",
        ]}
        footer={
          <p>
            <Link href="/login" className="rounded-sm font-semibold text-[var(--brand)] underline-offset-2 hover:text-[var(--brand-deep)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
              Back to sign in
            </Link>
          </p>
        }
      >
        {!token && (
          <p className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-400/60 dark:bg-rose-950/70 dark:text-rose-100">
            Missing reset token. Use the link from your email.
          </p>
        )}
        <ResetPasswordFields />
      </AuthForm>
    </div>
  );
}
