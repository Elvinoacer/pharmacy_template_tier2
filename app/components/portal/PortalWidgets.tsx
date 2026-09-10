/* ============================================================
   Reusable building blocks used across /portal pages.

   IMPORTANT: this file intentionally has NO "use client" directive.
   These components render icons that are passed in as component
   references (e.g. `icon={FileText}`) from Server Components such
   as app/portal/page.tsx. React Server Components cannot serialize
   function/component values across the server -> client boundary,
   so these presentational pieces must stay server components too.
   Do not add "use client" here — if you need interactivity, create
   a separate client child component instead.
   ============================================================ */

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "brand" | "accent" | "info" | "neutral";
}) {
  const accentClass =
    accent === "accent"
      ? "from-amber-400 to-amber-600"
      : accent === "info"
        ? "from-blue-400 to-blue-600"
        : accent === "neutral"
          ? "from-slate-400 to-slate-600"
          : "from-[#0d6e5a] to-[#084c3f]";

  return (
    <div className="card-stat min-w-0 p-3.5 sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-[#5a6b62] sm:text-[11px]">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#0c1a14] sm:mt-1.5 sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 break-words text-[11px] leading-snug text-[#5a6b62] sm:text-xs">{hint}</p>}
        </div>
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} text-white shadow-md sm:h-10 sm:w-10`}>
            {(() => {
              const Icon = icon;
              return <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />;
            })()}
          </span>
        )}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-premium min-w-0 p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="break-words text-base font-semibold text-[#0c1a14]">{title}</h2>}
            {description && <p className="mt-0.5 break-words text-xs leading-relaxed text-[#5a6b62]">{description}</p>}
          </div>
          {action && <div className="min-w-0 shrink-0">{action}</div>}
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  className = "",
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const Icon = icon;
  return (
    <span className={`badge ${className}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed border-[#e3ebe6] px-4 py-8 text-center sm:px-6 sm:py-10">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6f4ef] text-[#0d6e5a] sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <p className="mt-3 break-words text-sm font-semibold text-[#0c1a14]">{title}</p>
      {description && <p className="mt-1 max-w-sm break-words text-xs leading-relaxed text-[#5a6b62]">{description}</p>}
      {action && <div className="mt-4 w-full sm:w-auto">{action}</div>}
    </div>
  );
}
