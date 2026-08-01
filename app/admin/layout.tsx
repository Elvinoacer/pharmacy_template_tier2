import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/app/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user.role)) redirect("/portal");
  return <>{children}</>;
}
