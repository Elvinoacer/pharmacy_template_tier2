/** Portal skeleton — every session-gated page swaps in here instantly. */
export default function PortalLoading() {
  return (
    <div className="shell-grid bg-[#f4f7f4]" aria-busy="true" aria-label="Loading">
      <aside className="shell-sidebar hidden border-r border-[#e3ebe6] bg-white lg:flex" />
      <div className="shell-main">
        <div className="page-container">
          <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-[#e6ede8]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#e3ebe6] bg-white" />
            ))}
          </div>
          <div className="mt-6 h-64 animate-pulse rounded-2xl border border-[#e3ebe6] bg-white" />
        </div>
      </div>
    </div>
  );
}
