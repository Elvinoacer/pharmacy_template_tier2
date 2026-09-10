export function PlatformPage({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <header className="rounded-2xl border border-[#dce7e1] bg-white/75 px-4 py-5 shadow-sm shadow-black/[0.025] backdrop-blur-sm dark:border-teal-200/15 dark:bg-teal-950/25 dark:shadow-none sm:rounded-3xl sm:px-6 sm:py-6">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.17em] text-teal-700/80 dark:text-teal-200/75">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="text-2xl font-semibold tracking-tight text-[#14211d] dark:text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#617069] dark:text-teal-100/80">
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
      <div className="rounded-2xl border border-dashed border-[#cfded7] bg-white/55 px-4 py-9 text-center text-sm text-[#697871] dark:border-teal-200/15 dark:bg-teal-950/25 dark:text-teal-100/70 sm:px-5 sm:py-10">
        {empty}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5 md:hidden">
        {rows.map((row, rowIndex) => (
          <article
            key={rowIndex}
            className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm shadow-black/[0.025] transition active:scale-[0.995] dark:border-teal-200/15 dark:bg-teal-950/30 dark:shadow-none"
          >
            <dl className="space-y-3">
              {row.map((cell, cellIndex) => (
                <div
                  key={cellIndex}
                  className={`grid min-w-0 grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] gap-3 ${
                    cellIndex === 0 ? "pb-1" : "border-t border-[#edf2ef] pt-3 dark:border-teal-200/10"
                  }`}
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78857f] dark:text-teal-100/55">
                    {headers[cellIndex] ?? `Field ${cellIndex + 1}`}
                  </dt>
                  <dd
                    className={`min-w-0 break-words text-right text-sm ${
                      cellIndex === 0
                        ? "font-semibold text-[#14211d] dark:text-white"
                        : "text-[#45574f] dark:text-teal-50/90"
                    }`}
                  >
                    {cell}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-[#dce7e1] bg-white md:block dark:border-teal-200/15 dark:bg-teal-950/20">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[#f4f7f5] text-[11px] uppercase tracking-wide text-[#687870] dark:bg-teal-950/50 dark:text-teal-100/65">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[#edf2ef] transition hover:bg-teal-50/45 dark:border-teal-200/10 dark:hover:bg-teal-300/5"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3.5 align-top ${
                      j === 0
                        ? "font-medium text-[#1c2c26] dark:text-white"
                        : "text-[#4d5f57] dark:text-teal-50/90"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
