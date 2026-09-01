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
    <div>
      <h1
        className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-teal-100/85">{description}</p>
      ) : null}
      <div className="mt-5 sm:mt-6">{children}</div>
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
      <div className="rounded-2xl border border-teal-200/15 bg-teal-950/30 px-4 py-8 text-center text-sm text-teal-100/75 sm:px-5 sm:py-10">
        {empty}
      </div>
    );
  }
  return (
    <div className="-mx-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-teal-200/15 sm:mx-0">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-teal-950/50 text-[11px] uppercase tracking-wide text-teal-100/70">
          <tr>
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-3 font-medium sm:px-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-teal-200/10 transition hover:bg-teal-300/5"
            >
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-3 align-top text-teal-50/95 sm:px-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
