import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionUser } from "@/app/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { platform } from "@/app/lib/data";
import PlatformNav from "@/app/components/platform/PlatformNav";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform");
  if (!user.platformAdmin) redirect("/admin");

  const h = await headers();
  const path = h.get("x-pathname") || h.get("x-invoke-path") || "";
  const onSecurity = path === "/platform/security";
  if ((!user.twoFactorEnabled || !user.mfaVerifiedAt) && !onSecurity) {
    redirect("/platform/security?mfa=required");
  }

  if (!user.twoFactorEnabled || !user.mfaVerifiedAt) {
    return (
      <main className="min-h-dvh bg-[#f4f7f5] px-4 py-10 text-[#14211d] transition-colors dark:bg-[#06110f] dark:text-[#f5fbf8]">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-8 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-teal-700 transition hover:text-teal-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-200 dark:hover:text-teal-100"
          >
            ← Back to marketplace
          </Link>
          {children}
          <form action={logoutAction} className="mt-8">
            <button className="min-h-11 rounded-lg text-sm font-medium text-teal-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-200">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="platform-shell isolate min-h-screen min-h-[100dvh] scroll-smooth bg-[#f4f7f5] text-[#14211d] antialiased transition-colors dark:bg-[#06110f] dark:text-[#f5fbf8]">
      <a
        href="#platform-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-teal-700 focus:px-4 focus:py-2.5 focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus:bg-teal-200 dark:focus:text-[#06110f] dark:focus-visible:ring-teal-100 dark:focus-visible:ring-offset-[#06110f]"
      >
        Skip to main content
      </a>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside
          aria-label="Platform sidebar"
          className="hidden border-r border-[#dce7e1] bg-white/92 shadow-[10px_0_30px_rgba(20,33,29,0.025)] backdrop-blur-xl transition-colors dark:border-teal-200/15 dark:bg-[#040c0a] dark:shadow-none lg:flex lg:flex-col"
        >
          <div className="border-b border-[#dce7e1] px-5 py-5 dark:border-teal-200/15 xl:px-6 xl:py-6">
            <Link
              href="/platform"
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-teal-300 dark:focus-visible:ring-offset-[#040c0a]"
              aria-label="Platform control home"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700/80 dark:text-teal-200/80">
                Aether network
              </p>
              <p
                className="mt-2 text-xl font-semibold tracking-tight text-[#14211d] dark:text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {platform.legalName}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#64736c] dark:text-teal-100/75">
                Platform control center
              </p>
            </Link>
          </div>

          <PlatformNav email={user.email} />

          <div className="mt-auto border-t border-[#dce7e1] p-3 dark:border-teal-200/15 xl:p-4">
            <p className="truncate px-3 pb-2 text-xs text-[#6b7a73] dark:text-teal-100/70" title={user.email}>
              {user.email}
            </p>
            <Link
              href="/"
              className="mb-1.5 flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-[#31463d] transition active:scale-[0.98] hover:bg-teal-50 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-50/90 dark:hover:bg-teal-300/10 dark:hover:text-white dark:focus-visible:ring-teal-300"
            >
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 transition active:scale-[0.98] hover:bg-rose-50 hover:text-rose-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-100 dark:hover:bg-rose-400/15 dark:hover:text-rose-50 dark:focus-visible:ring-rose-300"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="relative min-w-0 bg-[#f4f7f5] transition-colors dark:bg-[#06110f]">
          <header className="sticky top-0 z-40 border-b border-[#dce7e1] bg-white/90 shadow-sm shadow-black/[0.025] backdrop-blur-xl transition-colors supports-[backdrop-filter]:bg-white/78 dark:border-teal-200/15 dark:bg-[#06110f]/95 dark:shadow-none dark:supports-[backdrop-filter]:bg-[#06110f]/82 lg:hidden">
            <div className="flex min-h-14 items-center justify-between gap-3 px-3 sm:min-h-16 sm:px-4">
              <Link
                href="/platform"
                className="min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-teal-300"
              >
                <p className="truncate text-sm font-semibold text-[#14211d] dark:text-white sm:text-base">
                  {platform.legalName}
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-teal-700/75 dark:text-teal-200/75">
                  Platform control
                </p>
              </Link>
              <PlatformNav email={user.email} mobileOnly />
            </div>
          </header>

          <main
            id="platform-main"
            tabIndex={-1}
            className="relative z-0 mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-[1440px] scroll-mt-4 px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] focus:outline-none sm:min-h-[calc(100dvh-4rem)] sm:px-5 sm:py-6 md:px-6 md:py-8 lg:min-h-screen lg:px-8 lg:py-9 xl:px-10 xl:py-10"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
