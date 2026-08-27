import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const labelClass = "mb-1.5 block text-sm font-medium text-[#0c1a14]";
const inputClass =
  "w-full rounded-xl border border-teal-900/10 bg-white px-4 py-3 text-sm text-[#0c1a14] shadow-sm outline-none transition placeholder:text-[#5a6b62]/60 focus:border-teal-600/40 focus:ring-2 focus:ring-teal-500/20";

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
      {required && <span className="text-red-600"> *</span>}
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
    <div>
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
    <div>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <textarea id={id} name={id} required={required} rows={rows} className={inputClass} {...props} />
    </div>
  );
}

export function SelectInput({
  label,
  id,
  required,
  children,
  ...props
}: { label: string; id: string; children: React.ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
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
    <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/80 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2
        className="mt-4 text-2xl font-semibold text-[#0c1a14]"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5a6b62]">{message}</p>
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

export { inputClass };
