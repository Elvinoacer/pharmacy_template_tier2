import "../workspace-compat.css";
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
      <main className="shell-grid-admin min-h-dvh bg-[var(--admin-bg)] px-4 py-8 text-[var(--admin-text)] sm:py-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-7 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-[var(--admin-text-muted)] transition hover:text-[var(--admin-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] sm:mb-8"
          >
            ← Back to marketplace
          </Link>
          {children}
          <form action={logoutAction} className="mt-8">
            <button className="min-h-11 rounded-lg text-sm font-medium text-[var(--admin-text-muted)] underline underline-offset-4 transition hover:text-[var(--admin-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="platform-shell shell-grid-admin isolate min-h-screen min-h-[100dvh] scroll-smooth bg-[var(--admin-bg)] text-[var(--admin-text)] antialiased transition-colors duration-200">
      <a
        href="#platform-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-[var(--admin-accent)] focus:px-4 focus:py-2.5 focus:text-[var(--admin-btn-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]"
      >
        Skip to main content
      </a>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside
          aria-label="Platform sidebar"
          className="hidden border-r border-[var(--admin-border)] bg-[var(--admin-panel)] lg:flex lg:flex-col"
        >
          <div className="border-b border-[var(--admin-border)] px-5 py-5 xl:px-6 xl:py-6">
            <Link
              href="/platform"
              className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-panel)]"
              aria-label="Platform control home"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-accent)]">
                Aether network
              </p>
              <p
                className="mt-2 text-xl font-semibold tracking-tight text-[var(--admin-text)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {platform.legalName}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">Platform control center</p>
            </Link>
          </div>

          <PlatformNav email={user.email} />

          <div className="mt-auto border-t border-[var(--admin-border)] p-3 xl:p-4">
            <p className="truncate px-3 pb-2 text-xs text-[var(--admin-text-soft)]" title={user.email}>
              {user.email}
            </p>
            <Link
              href="/"
              className="mb-1.5 flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--admin-text-muted)] transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            >
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-500/10 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="relative min-w-0 bg-[var(--admin-bg)]">
          <header className="sticky top-0 z-40 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--admin-bg)]/85 lg:hidden">
            <div className="flex min-h-14 items-center justify-between gap-3 px-3 sm:min-h-16 sm:px-5">
              <Link
                href="/platform"
                className="min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
              >
                <p className="truncate text-sm font-semibold text-[var(--admin-text)] sm:text-base">
                  {platform.legalName}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-accent)]">
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
