export function PlatformPage({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="text-2xl font-semibold tracking-tight text-[var(--admin-text)] sm:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--admin-text-muted)] sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5 sm:mt-6">{children}</div>
    </div>
  );
}

export function PlatformSection({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--admin-text)] sm:text-lg">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--admin-text-muted)] sm:text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function PlatformStat({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-[var(--admin-accent)]",
    success: "text-emerald-600 dark:text-emerald-300",
    warning: "text-amber-600 dark:text-amber-300",
    danger: "text-rose-600 dark:text-rose-300",
  }[tone];

  return (
    <div className="group min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3.5 shadow-[var(--admin-shadow)] transition duration-200 motion-safe:hover:-translate-y-0.5 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-text-soft)] sm:text-[11px]">
        {label}
      </p>
      <p className={`mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl ${toneClass}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">{detail}</p> : null}
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
      <div className="rounded-2xl border border-dashed border-[var(--admin-border-2)] bg-[var(--admin-card-2)] px-4 py-9 text-center text-sm text-[var(--admin-text-muted)] sm:px-5 sm:py-10">
        {empty}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.map((row, i) => (
          <article
            key={i}
            className="min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3.5 shadow-[var(--admin-shadow)] transition duration-200 motion-safe:hover:-translate-y-0.5"
          >
            {row.map((cell, j) => (
              <div
                key={j}
                className={`min-w-0 ${j === 0 ? "pb-3" : "grid grid-cols-[minmax(5.75rem,0.38fr)_minmax(0,1fr)] gap-3 border-t border-[var(--admin-border)] py-2.5 last:pb-0"}`}
              >
                {j === 0 ? (
                  <>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--admin-text-soft)]">
                      {headers[j]}
                    </p>
                    <div className="min-w-0 break-words text-sm font-semibold text-[var(--admin-text)]">{cell}</div>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">
                      {headers[j]}
                    </p>
                    <div className="min-w-0 break-words text-right text-xs leading-5 text-[var(--admin-text)]">{cell}</div>
                  </>
                )}
              </div>
            ))}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-shadow)] md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--admin-card-2)] text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">
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
                className="border-t border-[var(--admin-border)] transition-colors duration-150 hover:bg-[var(--admin-hover)]"
              >
                {row.map((cell, j) => (
                  <td key={j} className="max-w-[28rem] px-4 py-3.5 align-top text-[var(--admin-text)]">
                    <div className="min-w-0 break-words">{cell}</div>
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
