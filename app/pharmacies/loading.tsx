export default function Loading() {
  return (
    <div className="px-4 pb-20 pt-24 sm:px-6 sm:pt-32" aria-busy="true" aria-label="Loading pharmacy directory">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--glass-fill)] p-5 shadow-[var(--glass-shadow)] sm:p-8">
          <div className="h-6 w-44 animate-pulse rounded-full bg-[var(--brand-soft)]" />
          <div className="mt-5 h-11 w-full max-w-2xl animate-pulse rounded-2xl bg-[var(--card-elev)] sm:h-14" />
          <div className="mt-3 h-5 w-5/6 max-w-xl animate-pulse rounded-xl bg-[var(--card-elev)]" />
          <div className="mt-7 grid gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--card)]" />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="h-72 animate-pulse rounded-[26px] border border-[var(--line)] bg-[var(--card)] shadow-sm" />
          <div>
            <div className="h-24 animate-pulse rounded-[28px] border border-[var(--line)] bg-[var(--glass-fill)] shadow-sm" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-80 animate-pulse rounded-[26px] border border-[var(--line)] bg-[var(--card)] shadow-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
