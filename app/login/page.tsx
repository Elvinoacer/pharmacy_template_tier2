import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import AuthForm, { AuthField } from "@/app/components/AuthForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next || "";
  const error = sp.error || "";

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-12">
      <AuthForm
        action={loginAction}
        title="Welcome back"
        subtitle="Sign in to your Aether customer portal or staff CRM."
        submitLabel="Sign in"
        hiddenFields={next ? { next } : undefined}
        showGoogleAuth
        initialError={error}
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
            <p className="mt-4 rounded-2xl bg-white/60 px-3 py-2 text-xs text-[#5a6b62]">
              Demo: <code>jane@example.com</code> or <code>manager@aetherpharmacy.com</code> /{" "}
              <code>Password123!</code>
            </p>
          </>
        }
      >
        <AuthField label="Email" name="email" type="email" required autoComplete="email" />
        <AuthField
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </AuthForm>
    </div>
  );
}
