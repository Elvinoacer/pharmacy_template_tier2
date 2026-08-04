import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getSessionUser, isStaff } from "@/app/lib/auth";

// Admin is always request-time: it reads the session cookie and hits the DB.
// Without this, Next tries to prerender /admin/* at build time, cookies() throws
// DYNAMIC_SERVER_USAGE, and the try/catch below would log noisy false errors.
export const dynamic = "force-dynamic";

function isNextControlFlowError(err: unknown): boolean {
  if (isRedirectError(err)) return true;
  const digest = (err as { digest?: string } | null)?.digest;
  // Thrown by cookies()/headers() during static generation — must bubble up.
  return digest === "DYNAMIC_SERVER_USAGE";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try {
    user = await getSessionUser();
  } catch (err) {
    // getSessionUser hits cookies + DB. redirect() and DYNAMIC_SERVER_USAGE are
    // Next.js control-flow signals — rethrow so the framework can handle them.
    // Only catch real failures (missing DATABASE_URL, unreachable DB, etc.).
    if (isNextControlFlowError(err)) throw err;
    console.error("[admin/layout] Failed to resolve session user:", err);
    redirect("/login?next=/admin");
  }
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user.role)) {
    // Caregivers go to /caregiver; everyone else non-staff goes to /portal.
    if (user.role === "caregiver") redirect("/caregiver");
    redirect("/portal");
  }
  return <>{children}</>;
}
