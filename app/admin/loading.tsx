export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[var(--admin-bg,#f6f8f7)] p-4 sm:p-6" role="status" aria-live="polite">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-black/10" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-black/5 bg-white/70" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl border border-black/5 bg-white/70" />
      </div>
      <span className="sr-only">Loading pharmacy workspace…</span>
    </div>
  );
}
