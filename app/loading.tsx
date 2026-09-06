export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12" aria-busy="true" aria-label="Loading page">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-full max-w-xl rounded bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-40 rounded-3xl border border-slate-100 bg-slate-50" />
          ))}
        </div>
      </div>
    </main>
  );
}
