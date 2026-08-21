import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getSessionUser, isStaff } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function isNextControlFlowError(err: unknown): boolean {
  if (isRedirectError(err)) return true;
  const digest = (err as { digest?: string } | null)?.digest;
  return digest === "DYNAMIC_SERVER_USAGE";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try {
    user = await getSessionUser();
  } catch (err) {
    if (isNextControlFlowError(err)) throw err;
    console.error("[admin/layout] Failed to resolve session user:", err);
    redirect("/login?next=/admin");
  }
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user.role) && !user.platformAdmin) {
    if (user.role === "caregiver") redirect("/caregiver");
    redirect("/portal");
  }
  if (user.memberships.length === 0 && !user.platformAdmin) {
    redirect("/onboard");
  }
  return <>{children}</>;
}
