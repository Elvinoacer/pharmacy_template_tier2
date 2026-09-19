import { redirect } from "next/navigation";
import { loginAction, registerAction } from "@/app/actions/auth";
import UnifiedAuthSurface from "@/app/components/UnifiedAuthSurface";
import { getSessionUser } from "@/app/lib/auth";
import { resolvePostLoginPath } from "@/app/lib/session-claim";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next || "";
  const error = sp.error || "";
  const initialMode = sp.mode === "login" ? "login" : "register";

  const session = await getSessionUser().catch(() => null);
  if (session) {
    redirect(
      resolvePostLoginPath(
        {
          role: session.role,
          customerId: session.customerId,
          platformAdmin: session.platformAdmin,
        },
        next || null,
      ),
    );
  }

  return (
    <UnifiedAuthSurface
      initialMode={initialMode}
      next={next}
      initialError={error}
      loginAction={loginAction}
      registerAction={registerAction}
      showDemoCredentials={process.env.SHOW_DEMO_CREDENTIALS === "1"}
    />
  );
}
