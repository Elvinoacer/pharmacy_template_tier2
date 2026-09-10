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
      <main className="min-h-dvh bg-[#f5f8f6] px-4 py-8 text-[#17231d] dark:bg-[#06110f] dark:text-white sm:py-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-6 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-teal-700 transition-colors hover:text-teal-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-100 dark:hover:text-white sm:mb-8"
          >
            ← Back to marketplace
          </Link>
          {children}
          <form action={logoutAction} className="mt-8">
            <button className="min-h-11 rounded-lg text-sm font-medium text-teal-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-100">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="platform-shell isolate min-h-screen min-h-[100dvh] scroll-smooth bg-[#f5f8f6] text-[#17231d] antialiased dark:bg-[#06110f] dark:text-[#f5fbf8]">
      <a
        href="#platform-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-teal-700 focus:px-4 focus:py-2.5 focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f8f6] dark:focus:bg-teal-200 dark:focus:text-[#06110f] dark:focus-visible:ring-teal-100 dark:focus-visible:ring-offset-[#06110f]"
      >
        Skip to main content
      </a>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside
          aria-label="Platform sidebar"
          className="hidden border-r border-[#dfe8e2] bg-white/95 lg:flex lg:flex-col dark:border-teal-200/15 dark:bg-[#040c0a]"
        >
          <div className="border-b border-[#dfe8e2] px-5 py-5 xl:px-6 xl:py-6 dark:border-teal-200/15">
            <Link
              href="/platform"
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-teal-300 dark:focus-visible:ring-offset-[#040c0a]"
              aria-label="Platform control home"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-200/80">
                Aether network
              </p>
              <p
                className="mt-2 text-xl font-semibold tracking-tight text-[#14211b] dark:text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {platform.legalName}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#6f7d74] dark:text-teal-100/70">
                Platform control center
              </p>
            </Link>
          </div>

          <PlatformNav email={user.email} />

          <div className="mt-auto border-t border-[#dfe8e2] p-3 xl:p-4 dark:border-teal-200/15">
            <p
              className="truncate px-3 pb-2 text-xs text-[#718078] dark:text-teal-100/65"
              title={user.email}
            >
              {user.email}
            </p>
            <Link
              href="/"
              className="mb-1.5 flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-[#304139] transition hover:bg-teal-50 hover:text-teal-900 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-50/90 dark:hover:bg-teal-300/10 dark:hover:text-white dark:focus-visible:ring-teal-300"
            >
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-100 dark:hover:bg-rose-400/15 dark:hover:text-rose-50 dark:focus-visible:ring-rose-300"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="relative min-w-0 bg-[#f5f8f6] dark:bg-[#06110f]">
          <header className="sticky top-0 z-40 border-b border-[#dfe8e2] bg-[#f5f8f6]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#f5f8f6]/80 lg:hidden dark:border-teal-200/15 dark:bg-[#06110f]/95 dark:supports-[backdrop-filter]:bg-[#06110f]/80">
            <div className="flex min-h-14 items-center justify-between gap-3 px-3 sm:min-h-16 sm:px-4">
              <Link
                href="/platform"
                className="min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-teal-300"
              >
                <p className="truncate text-sm font-semibold text-[#14211b] dark:text-white sm:text-base">
                  {platform.legalName}
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-teal-700 dark:text-teal-200/75">
                  Platform control
                </p>
              </Link>
              <PlatformNav email={user.email} mobileOnly />
            </div>
          </header>

          <main
            id="platform-main"
            tabIndex={-1}
            className="relative z-0 mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-[1440px] scroll-mt-4 px-3 py-5 focus:outline-none sm:min-h-[calc(100dvh-4rem)] sm:px-5 sm:py-6 md:px-6 md:py-8 lg:min-h-screen lg:px-8 lg:py-9 xl:px-10 xl:py-10"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
