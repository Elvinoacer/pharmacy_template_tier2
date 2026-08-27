export default function Loading() {
  return (
    <div className="px-4 pb-20 pt-32 sm:px-6" aria-busy="true" aria-label="Loading directory">
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-40 animate-pulse rounded bg-[#e6ede8]" />
        <div className="mt-4 h-12 w-2/3 max-w-xl animate-pulse rounded-lg bg-[#e6ede8]" />
        <div className="mt-8 h-16 animate-pulse rounded-3xl bg-white shadow-sm" />
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-3xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
