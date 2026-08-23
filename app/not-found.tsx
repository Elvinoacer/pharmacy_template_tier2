import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-32 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">404</p>
      <h1
        className="mt-3 text-3xl font-semibold text-[#0c1a14] sm:text-4xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-[#5a6b62]">
        That link may be outdated or mistyped. Find a pharmacy or browse the network homepage.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary btn-primary-sm">
          Network home
        </Link>
        <Link href="/pharmacies" className="btn-ghost btn-ghost-sm">
          Find a pharmacy
        </Link>
        <Link href="/search" className="btn-ghost btn-ghost-sm">
          Search
        </Link>
      </div>
    </div>
  );
}
