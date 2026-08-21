import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/platform", label: "Overview" },
  { href: "/platform/applications", label: "Applications" },
  { href: "/platform/pharmacies", label: "Pharmacies" },
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform");
  if (!user.platformAdmin) redirect("/admin");

  return (
    <div className="min-h-screen bg-[#071512] text-[#e7f4ef]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071512]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/platform" className="font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), serif" }}>
              Aether Network
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-teal-100/80 sm:flex">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-white">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden text-teal-100/70 sm:inline">{user.email}</span>
            <Link href="/" className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/5">
              Marketplace
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/5">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
