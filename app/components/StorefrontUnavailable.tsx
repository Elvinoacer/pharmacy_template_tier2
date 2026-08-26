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
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-32 sm:px-6">
      <div className="mesh-bg absolute inset-0 -z-10" aria-hidden />
      <div className="hero-glow left-1/2 top-24 -translate-x-1/2 opacity-70" aria-hidden />

      <main className="landing-card-glass-light relative w-full max-w-xl rounded-[2rem] p-8 text-center shadow-[0_30px_80px_rgba(8,40,32,0.14)] sm:p-12">
        <span
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-teal-800 shadow-inner backdrop-blur"
          aria-hidden
        >
          {slug ? <ShieldQuestion className="h-7 w-7" /> : <PhoneOff className="h-7 w-7" />}
        </span>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
          {platform.name} network
        </p>
        <h1
          className="mt-2 text-2xl font-semibold tracking-tight text-[#0c1a14] sm:text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          This pharmacy room isn&apos;t open right now
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#5a6b62] sm:text-base">
          {slug ? (
            <>
              Nothing live answers to{" "}
              <code className="rounded-md bg-teal-900/5 px-1.5 py-0.5 font-mono text-[0.85em] text-teal-800">
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

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/pharmacies" className="btn-primary button-sparkle-overlay">
            <Compass className="h-4 w-4" aria-hidden />
            Browse pharmacies
          </Link>
          <Link href={backHref} className="btn-ghost">
            Back to the network
          </Link>
        </div>

        <p className="mt-6 text-xs text-[#5a6b62]">
        Are you the owner? Continue your{" "}
          <Link href="/onboard" className="font-semibold text-teal-800 hover:underline">
            onboarding checklist
          </Link>{" "}
          to publish this room.
        </p>
      </main>
    </div>
  );
}
