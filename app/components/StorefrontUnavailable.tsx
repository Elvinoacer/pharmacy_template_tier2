import Link from "next/link";
import { Compass, PhoneOff, ShieldQuestion } from "lucide-react";
import { platform } from "@/app/lib/data";

/**
 * Rendered when a visitor opens an explicit `/p/{slug}` that no longer (or
 * never did) points at a live pharmacy. Deliberately distinct from the
 * "choose a pharmacy" state: the URL named a tenant that isn't here.
 */
export default function StorefrontUnavailable({
  slug,
  next,
}: {
  slug: string | null;
  next: string;
}) {
  const backHref = next && !next.startsWith("/p/") ? `/?from=${encodeURIComponent(next)}` : "/";

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-24 text-[var(--foreground)] transition-colors duration-300 sm:px-6 sm:py-32">
      <div className="mesh-bg absolute inset-0 -z-10 opacity-70" aria-hidden />
      <div className="hero-glow left-1/2 top-24 -translate-x-1/2 opacity-55" aria-hidden />

      <main className="relative w-full max-w-xl rounded-[2rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] p-6 text-center shadow-[var(--glass-shadow)] backdrop-blur-xl transition-colors duration-300 sm:p-12">
        <span
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--line-2)] bg-[var(--brand-soft)] text-[var(--brand)] shadow-inner sm:mb-6"
          aria-hidden
        >
          {slug ? <ShieldQuestion className="h-7 w-7" /> : <PhoneOff className="h-7 w-7" />}
        </span>

        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)] sm:text-xs">
          {platform.name} network
        </p>
        <h1
          className="mx-auto mt-2 max-w-md text-balance text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          This pharmacy room isn&apos;t open right now
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)] sm:text-base sm:leading-relaxed">
          {slug ? (
            <>
              Nothing live answers to{" "}
              <code className="rounded-md border border-[var(--line-2)] bg-[var(--brand-soft)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--brand)]">
                /p/{slug}
              </code>
              . The shop may still be in review, taking a pause, or the address may be mistyped.
            </>
          ) : (
            <>
              The pharmacy you tried to reach is not available. It may still be in review, or the
              link may be out of date.
            </>
          )}{" "}
          You can browse every verified pharmacy on the network instead — each one keeps its own
          room, team, and care.
        </p>

        <div className="mt-7 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
          <Link href="/pharmacies" className="btn-primary button-sparkle-overlay w-full justify-center sm:w-auto">
            <Compass className="h-4 w-4" aria-hidden />
            Browse pharmacies
          </Link>
          <Link href={backHref} className="btn-ghost w-full justify-center sm:w-auto">
            Back to the network
          </Link>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
          Are you the owner? Continue your{" "}
          <Link href="/onboard" className="font-semibold text-[var(--brand)] hover:underline">
            onboarding checklist
          </Link>{" "}
          to publish this room.
        </p>
      </main>
    </div>
  );
}
