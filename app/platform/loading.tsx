export default function PlatformLoading() {
  return (
    <div className="min-h-screen bg-slate-950 p-5 text-white" role="status" aria-live="polite">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-white/10" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </div>
      <span className="sr-only">Loading platform operations…</span>
    </div>
  );
}
