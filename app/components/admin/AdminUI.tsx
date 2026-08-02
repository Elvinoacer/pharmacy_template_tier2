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
    <div className="admin-stat">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider admin-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight admin-text">{value}</p>
          {hint && <p className="mt-1 text-xs admin-soft">{hint}</p>}
        </div>
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} shadow-md`}>
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

export function AdminPanel({
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
    <section className={`admin-card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold admin-text">{title}</h2>}
            {description && <p className="mt-0.5 text-xs admin-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
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
    <div className="admin-empty">
      <span className="admin-icon-well flex h-12 w-12">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold admin-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs admin-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
