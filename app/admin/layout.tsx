import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try {
    user = await getSessionUser();
  } catch (err) {
    // getSessionUser hits the DB (via prisma). If DATABASE_URL is missing or
    // the DB is unreachable, this throws. redirect() itself throws internally
    // (Next.js control-flow signal) so it must NOT be caught here — only
    // wrap the getSessionUser() call, and only catch real failures.
    console.error("[admin/layout] Failed to resolve session user:", err);
    redirect("/login?next=/admin");
  }
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user.role)) redirect("/portal");
  return <>{children}</>;
}
