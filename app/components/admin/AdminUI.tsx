import React from "react";

export function AdminCard({
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
  accent?: "ai" | "accent" | "info" | "danger" | "neutral";
}) {
  const accentClass =
    accent === "accent"
      ? "from-amber-400 to-amber-600 text-amber-950"
      : accent === "info"
        ? "from-sky-400 to-blue-600 text-white"
        : accent === "danger"
          ? "from-rose-400 to-rose-600 text-white"
          : accent === "neutral"
            ? "from-slate-400 to-slate-600 text-white"
            : "from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-[var(--admin-btn-fg)]";

  return (
    <div className="admin-stat group h-full overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:shadow-md">
      <div className="flex h-full items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-4 admin-muted sm:text-xs">{label}</p>
          <p className="mt-1.5 break-words text-xl font-bold leading-tight tracking-tight admin-text sm:mt-2 sm:text-3xl">{value}</p>
          {hint && <p className="mt-1 break-words text-xs leading-5 admin-soft sm:text-sm">{hint}</p>}
        </div>
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} shadow-sm transition-transform duration-200 group-hover:scale-[1.04] sm:h-10 sm:w-10 sm:shadow-md`}>
            {(() => {
              const Icon = icon;
              return <Icon className="h-4 w-4 sm:h-5 sm:w-5" />;
            })()}
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminPanel({
  title,
  description,
  children,
  action,
  className = "",
  id,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`admin-card min-w-0 overflow-hidden p-4 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="admin-panel-heading flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            {title && <h2 className="break-words text-sm font-semibold admin-text">{title}</h2>}
            {description && <p className="mt-0.5 break-words text-sm admin-muted">{description}</p>}
          </div>
          {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function AdminBadge({
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

export function AdminEmptyState({
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
    <div className="admin-empty px-3 py-6 text-center sm:px-6 sm:py-8">
      <span className="admin-icon-well mx-auto flex h-12 w-12">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold admin-text">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm admin-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
