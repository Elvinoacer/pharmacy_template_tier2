import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import RegisterPanel from "@/app/components/RegisterPanel";
import { getSessionUser } from "@/app/lib/auth";
import { resolvePostLoginPath } from "@/app/lib/session-claim";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  const session = await getSessionUser().catch(() => null);
  if (session) {
    redirect(
      resolvePostLoginPath({
        role: session.role,
        customerId: session.customerId,
        platformAdmin: session.platformAdmin,
      }),
    );
  }

  return <RegisterPanel action={registerAction} />;
}
