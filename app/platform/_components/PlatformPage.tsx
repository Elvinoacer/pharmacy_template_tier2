export function PlatformPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <header className="max-w-4xl">
        <h1
          className="text-2xl font-semibold tracking-tight text-[#14211b] dark:text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#627168] dark:text-teal-100/75">
            {description}
          </p>
        ) : null}
      </header>
      <div className="mt-5 min-w-0 sm:mt-6">{children}</div>
    </div>
  );
}

export function PlatformTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[#dce7e1] bg-white px-4 py-8 text-center text-sm text-[#68776e] shadow-sm dark:border-teal-200/15 dark:bg-teal-950/30 dark:text-teal-100/75 sm:px-5 sm:py-10">
        {empty}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-3 md:hidden">
        {rows.map((row, rowIndex) => (
          <article
            key={rowIndex}
            className="min-w-0 rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-teal-200/15 dark:bg-white/[0.035] dark:shadow-none dark:hover:bg-white/[0.05]"
          >
            <dl className="space-y-3">
              {row.map((cell, cellIndex) => (
                <div
                  key={cellIndex}
                  className="grid min-w-0 grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] gap-3 border-b border-[#edf2ef] pb-3 last:border-0 last:pb-0 dark:border-white/8"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7a8a81] dark:text-teal-100/50">
                    {headers[cellIndex] || "Details"}
                  </dt>
                  <dd className="min-w-0 break-words text-sm font-medium leading-5 text-[#1d2a23] dark:text-teal-50/95">
                    {cell}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-[#dce7e1] bg-white shadow-sm dark:border-teal-200/15 dark:bg-transparent dark:shadow-none md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#f4f8f5] text-[11px] uppercase tracking-wide text-[#68776e] dark:bg-teal-950/50 dark:text-teal-100/70">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[#e7eee9] transition-colors hover:bg-[#f8faf8] dark:border-teal-200/10 dark:hover:bg-teal-300/5"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="max-w-[32rem] break-words px-4 py-3.5 align-top text-[#26352d] dark:text-teal-50/95"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
