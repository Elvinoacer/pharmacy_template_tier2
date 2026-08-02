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
    <div className="card-stat">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5a6b62]">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#0c1a14]">{value}</p>
          {hint && <p className="mt-1 text-xs text-[#5a6b62]">{hint}</p>}
        </div>
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} text-white shadow-md`}>
            {(() => {
              const Icon = icon;
              return <Icon className="h-5 w-5" />;
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
    <section className={`card-premium p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-[#0c1a14]">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-[#5a6b62]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e3ebe6] px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f4ef] text-[#0d6e5a]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#0c1a14]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-[#5a6b62]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
