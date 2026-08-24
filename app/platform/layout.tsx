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
    <div className="min-h-screen bg-[#071512] text-[#e7f4ef]">
      <a href="#platform-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-[#071512]">
        Skip to main content
      </a>

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-[#06110f] lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <Link href="/platform" className="block" aria-label="Platform control home">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-200/55">Aether network</p>
              <p className="mt-2 text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), serif" }}>
                {platform.legalName}
              </p>
              <p className="mt-1 text-xs leading-5 text-teal-100/45">Platform control center</p>
            </Link>
          </div>

          <PlatformNav email={user.email} />

          <div className="mt-auto border-t border-white/10 p-4">
            <p className="truncate px-3 pb-3 text-xs text-teal-100/45" title={user.email}>{user.email}</p>
            <Link href="/" className="mb-2 flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-teal-100/70 transition hover:bg-white/5 hover:text-white">
              View marketplace
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-rose-100/80 transition hover:bg-rose-400/10 hover:text-rose-100">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071512]/95 backdrop-blur lg:hidden">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4">
              <Link href="/platform" className="min-w-0">
                <p className="truncate text-sm font-semibold">{platform.legalName}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-teal-100/45">Platform control</p>
              </Link>
              <PlatformNav email={user.email} mobileOnly />
            </div>
          </header>

          <main id="platform-main" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
