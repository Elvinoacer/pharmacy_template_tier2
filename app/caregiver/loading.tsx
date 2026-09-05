export default function CaregiverLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10" aria-busy="true" aria-label="Loading caregiver workspace">
      <div className="animate-pulse space-y-5">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-36 rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    </main>
  );
}
