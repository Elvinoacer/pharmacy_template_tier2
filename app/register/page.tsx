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
        .register-contrast-tune .border-white\\/35 { border-color: rgba(255,255,255,.48) !important; }
        .register-contrast-tune .border-white\\/25 { border-color: rgba(255,255,255,.34) !important; }
        .register-contrast-tune .border-white\\/15 { border-color: rgba(255,255,255,.22) !important; }
        .register-contrast-tune .text-white\\/70 { color: rgba(255,255,255,.78) !important; }
        .register-contrast-tune .text-white\\/65 { color: rgba(255,255,255,.72) !important; }
        .register-contrast-tune .text-white\\/60 { color: rgba(255,255,255,.70) !important; }
        .register-contrast-tune .text-white\\/55 { color: rgba(255,255,255,.63) !important; }
        .register-contrast-tune .text-white\\/40 { color: rgba(255,255,255,.50) !important; }
        .register-contrast-tune input::placeholder { color: rgba(255,255,255,.42) !important; }
        .register-contrast-tune input:not([type="checkbox"]) { background-color: rgba(2,18,10,.24) !important; }
        .register-contrast-tune section { background: linear-gradient(145deg, rgba(255,255,255,.16), rgba(19,55,36,.38)) !important; }
        .register-contrast-tune section .bg-lime-400\\/5 { background-color: rgba(163,230,53,.08) !important; }
        .register-contrast-tune button:not(:disabled):not([type="button"]),
        .register-contrast-tune a[href="/api/auth/google"] { filter: saturate(1.04); }

        /* Mobile: use the phone viewport properly instead of carrying the desktop gutters/min-height. */
        @media (max-width: 767px) {
          .register-contrast-tune .reg-bg {
            min-height: 100dvh !important;
            padding: max(12px, env(safe-area-inset-top)) 0 max(22px, env(safe-area-inset-bottom)) !important;
            overflow-x: hidden !important;
          }

          .register-contrast-tune .reg-bg > .z-10 {
            width: calc(100% - 24px) !important;
            max-width: none !important;
            min-height: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-radius: 20px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div {
            min-height: 0 !important;
            grid-template-columns: minmax(0,1fr) !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside {
            min-height: 0 !important;
            padding: 22px 20px 20px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:first-of-type {
            margin-top: 26px !important;
            gap: 10px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:first-of-type > span:first-child {
            width: 100% !important;
            justify-content: center !important;
            white-space: nowrap !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:first-of-type > div {
            width: 100% !important;
            justify-content: center !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(2) {
            margin-top: 34px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(2) h2 {
            max-width: 100% !important;
            font-size: clamp(38px, 11vw, 48px) !important;
            line-height: .94 !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(2) p {
            margin-top: 18px !important;
            max-width: 100% !important;
            font-size: 13px !important;
            line-height: 1.55 !important;
          }

          /* Three compact feature tiles instead of three tall desktop cards. */
          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) {
            margin-top: 24px !important;
            grid-template-columns: repeat(3, minmax(0,1fr)) !important;
            gap: 8px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) > div {
            min-height: 104px !important;
            padding: 10px !important;
            border-radius: 15px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) > div > span {
            width: 34px !important;
            height: 34px !important;
            margin-bottom: 10px !important;
            border-radius: 10px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) > div > span svg {
            width: 16px !important;
            height: 16px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) h3 {
            font-size: 10px !important;
            line-height: 1.2 !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) p {
            display: none !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(4) {
            display: none !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child {
            min-height: 0 !important;
            padding: 18px 18px 20px !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child > section {
            width: 100% !important;
            max-width: none !important;
            border-radius: 19px !important;
            padding: 20px 18px 18px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child > section > div:first-child {
            margin-bottom: 15px !important;
            padding: 9px 12px !important;
            text-align: center !important;
            justify-content: center !important;
            line-height: 1.35 !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child h1 {
            font-size: 25px !important;
            line-height: 1.05 !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child p {
            font-size: 12px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child form {
            margin-top: 18px !important;
            gap: 14px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 input:not([type="checkbox"]) {
            height: 56px !important;
            min-height: 56px !important;
            font-size: 13px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 label > span:first-child {
            margin-bottom: 6px !important;
            font-size: 10px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 .text-white\\/65 {
            font-size: 12px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 form > button[type="submit"] {
            height: 54px !important;
            min-height: 54px !important;
            font-size: 16px !important;
            gap: 12px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 form > div:last-of-type a,
          .register-contrast-tune .reg-bg > .z-10 form > div:last-of-type button {
            min-height: 52px !important;
            height: 52px !important;
            font-size: 14px !important;
          }
        }

        @media (max-width: 380px) {
          .register-contrast-tune .reg-bg > .z-10 {
            width: calc(100% - 16px) !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) > div {
            min-height: 96px !important;
            padding: 8px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > aside > div:nth-of-type(3) h3 {
            font-size: 9px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .register-contrast-tune .reg-bg > .z-10 > div > div:last-child > section {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
