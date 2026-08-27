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

  return (
    <div className="register-contrast-tune">
      <RegisterPanel action={registerAction} />
      <style>{`
        /* Small contrast lift for the register design; intentionally restrained. */
        .register-contrast-tune .border-white\/35 { border-color: rgba(255,255,255,.48) !important; }
        .register-contrast-tune .border-white\/25 { border-color: rgba(255,255,255,.34) !important; }
        .register-contrast-tune .border-white\/15 { border-color: rgba(255,255,255,.22) !important; }
        .register-contrast-tune .text-white\/70 { color: rgba(255,255,255,.78) !important; }
        .register-contrast-tune .text-white\/65 { color: rgba(255,255,255,.72) !important; }
        .register-contrast-tune .text-white\/60 { color: rgba(255,255,255,.70) !important; }
        .register-contrast-tune .text-white\/55 { color: rgba(255,255,255,.63) !important; }
        .register-contrast-tune .text-white\/40 { color: rgba(255,255,255,.50) !important; }
        .register-contrast-tune input::placeholder { color: rgba(255,255,255,.42) !important; }
        .register-contrast-tune input:not([type="checkbox"]) { background-color: rgba(2,18,10,.24) !important; }
        .register-contrast-tune section { background: linear-gradient(145deg, rgba(255,255,255,.16), rgba(19,55,36,.38)) !important; }
        .register-contrast-tune section .bg-lime-400\/5 { background-color: rgba(163,230,53,.08) !important; }
        .register-contrast-tune button:not(:disabled):not([type="button"]),
        .register-contrast-tune a[href="/api/auth/google"] { filter: saturate(1.04); }
      `}</style>
    </div>
  );
}
