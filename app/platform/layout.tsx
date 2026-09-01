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
  const onSecurity = path.includes("/platform/security");
  if (!user.twoFactorEnabled && !onSecurity) {
    redirect("/platform/security?mfa=required");
  }

  return (
    <div
      className="platform-shell isolate min-h-screen min-h-[100dvh] scroll-smooth bg-[#06110f] text-[#f5fbf8] antialiased"
      style={{ backgroundColor: "#06110f", color: "#f5fbf8" }}
    >
      <a
        href="#platform-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-teal-200 focus:px-4 focus:py-2.5 focus:text-[#06110f] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110f]"
      >
        Skip to main content
      </a>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside
          aria-label="Platform sidebar"
          className="hidden border-r border-teal-200/15 bg-[#040c0a] lg:flex lg:flex-col"
        >
          <div className="border-b border-teal-200/15 px-5 py-5 xl:px-6 xl:py-6">
            <Link
              href="/platform"
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040c0a]"
              aria-label="Platform control home"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-200/80">
                Aether network
              </p>
              <p
                className="mt-2 text-xl font-semibold tracking-tight text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {platform.legalName}
              </p>
              <p className="mt-1 text-xs leading-5 text-teal-100/75">Platform control center</p>
            </Link>
          </div>

          <PlatformNav email={user.email} />

          <div className="mt-auto border-t border-teal-200/15 p-3 xl:p-4">
            <p className="truncate px-3 pb-2 text-xs text-teal-100/70" title={user.email}>
              {user.email}
            </p>
            <Link
              href="/"
              className="mb-1.5 flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-teal-50/90 transition active:scale-[0.98] hover:bg-teal-300/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-100 transition active:scale-[0.98] hover:bg-rose-400/15 hover:text-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        {/* Main column */}
        <div className="relative min-w-0 bg-[#06110f]" style={{ backgroundColor: "#06110f" }}>
          {/* Mobile sticky header */}
          <header className="sticky top-0 z-40 border-b border-teal-200/15 bg-[#06110f]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#06110f]/80 lg:hidden">
            <div className="flex min-h-14 items-center justify-between gap-3 px-3 sm:min-h-16 sm:px-4">
              <Link
                href="/platform"
                className="min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              >
                <p className="truncate text-sm font-semibold text-white sm:text-base">
                  {platform.legalName}
                </p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-teal-200/75">
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
            style={{ backgroundColor: "#06110f", color: "#f5fbf8" }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
