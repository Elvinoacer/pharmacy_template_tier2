import { redirect } from "next/navigation";
import { loginAction, registerAction } from "@/app/actions/auth";
import UnifiedAuthSurface from "@/app/components/UnifiedAuthSurface";
import { getSessionUser } from "@/app/lib/auth";
import { resolvePostLoginPath } from "@/app/lib/session-claim";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; verified?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next || "";
  const error = sp.error || "";
  const verified = sp.verified === "1";
  const initialMode = sp.mode === "register" ? "register" : "login";

  // Already signed in → send them to the portal their role owns.
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
      verified={verified}
      loginAction={loginAction}
      registerAction={registerAction}
      showDemoCredentials={process.env.SHOW_DEMO_CREDENTIALS === "1"}
    />
  );
}
