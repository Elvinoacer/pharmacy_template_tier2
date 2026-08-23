export default function Loading() {
  return (
    <div className="px-4 pb-20 pt-32 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-6xl">
        <div className="h-4 w-28 animate-pulse rounded bg-[#e6ede8]" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded-lg bg-[#e6ede8]" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[#e6ede8]" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
