import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { platform } from "@/app/lib/data";
import PlatformNav from "@/app/components/platform/PlatformNav";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform");
  if (!user.platformAdmin) redirect("/admin");

  return (
    <div
      className="platform-shell isolate min-h-screen min-h-[100dvh] bg-[#071512] text-[#f1faf6]"
      style={{ backgroundColor: "#071512", color: "#f1faf6" }}
    >
      <a href="#platform-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-[#071512] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
        Skip to main content
      </a>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside aria-label="Platform sidebar" className="hidden border-r border-white/15 bg-[#06110f] lg:flex lg:flex-col">
          <div className="border-b border-white/15 px-6 py-6">
            <Link href="/platform" className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06110f]" aria-label="Platform control home">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-100/75">Aether network</p>
              <p className="mt-2 text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), serif" }}>{platform.legalName}</p>
              <p className="mt-1 text-xs leading-5 text-teal-50/70">Platform control center</p>
            </Link>
          </div>

          <PlatformNav email={user.email} />

          <div className="mt-auto border-t border-white/15 p-4">
            <p className="truncate px-3 pb-3 text-xs text-teal-50/70" title={user.email}>{user.email}</p>
            <Link href="/" className="mb-2 flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-teal-50/85 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">View marketplace</Link>
            <form action={logoutAction}>
              <button type="submit" className="flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-100/90 transition hover:bg-rose-400/10 hover:text-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">Sign out</button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 bg-[#071512]" style={{ backgroundColor: "#071512" }}>
          <header className="sticky top-0 z-40 border-b border-white/15 bg-[#071512] lg:hidden" style={{ backgroundColor: "#071512" }}>
            <div className="flex min-h-16 items-center justify-between gap-3 px-4">
              <Link href="/platform" className="min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
                <p className="truncate text-sm font-semibold">{platform.legalName}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-teal-50/70">Platform control</p>
              </Link>
              <PlatformNav email={user.email} mobileOnly />
            </div>
          </header>

          <main
            id="platform-main"
            tabIndex={-1}
            className="relative z-0 mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1440px] bg-[#071512] px-4 py-6 focus:outline-none sm:px-6 sm:py-8 lg:min-h-screen lg:px-10 lg:py-10"
            style={{ backgroundColor: "#071512", color: "#f1faf6" }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
