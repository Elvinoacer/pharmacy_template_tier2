import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import RegisterPanel from "@/app/components/RegisterPanel";
import { getSessionUser } from "@/app/lib/auth";
import { resolvePostLoginPath } from "@/app/lib/session-claim";
import styles from "./RegisterSurface.module.css";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const session = await getSessionUser().catch(() => null);
  if (session) {
    redirect(
      resolvePostLoginPath(
        {
          role: session.role,
          customerId: session.customerId,
          platformAdmin: session.platformAdmin,
        },
        next,
      ),
    );
  }

  return (
    <div className={styles.registerSurface}>
      <RegisterPanel action={registerAction} next={next} />
    </div>
  );
}
