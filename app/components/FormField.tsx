import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const labelClass = "mb-1.5 block text-sm font-medium text-[var(--foreground)]";
const inputClass =
  "w-full min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card-elev))] bg-[var(--card-elev)] px-3.5 py-3 text-base text-[var(--foreground)] shadow-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_28%,transparent)] disabled:cursor-not-allowed disabled:border-[color-mix(in_srgb,var(--foreground)_48%,var(--card-elev))] disabled:bg-[color-mix(in_srgb,var(--foreground)_7%,var(--card-elev))] disabled:text-[var(--muted)] disabled:opacity-100 sm:px-4 sm:text-sm";

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
      {required && <span className="text-rose-700 dark:text-rose-300"> *</span>}
    </label>
  );
}

export function TextInput({
  label,
  id,
  required,
  ...props
}: { label: string; id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <input id={id} name={id} required={required} className={inputClass} {...props} />
    </div>
  );
}

export function TextArea({
  label,
  id,
  required,
  rows = 4,
  ...props
}: { label: string; id: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea id={id} name={id} required={required} rows={rows} className={`${inputClass} resize-y`} {...props} />
    </div>
  );
}

export function SelectInput({
  label,
  id,
  required,
  children,
  ...props
}: { label: string; id: string; required?: boolean; children: React.ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <select id={id} name={id} required={required} className={inputClass} {...props}>
        {children}
      </select>
    </div>
  );
}

export function FormSuccess({
  title,
  message,
  actions,
}: {
  title: string;
  message: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] p-5 text-center shadow-sm sm:rounded-3xl sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)] sm:h-14 sm:w-14">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2
        className="mt-4 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">{message}</p>
      {actions && <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">{actions}</div>}
    </div>
  );
}

export { inputClass };
