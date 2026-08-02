"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthActionState } from "@/app/actions/auth";

type Props = {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  title: string;
  subtitle: string;
  submitLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hiddenFields?: Record<string, string>;
};

export default function AuthForm({
  action,
  title,
  subtitle,
  submitLabel,
  children,
  footer,
  hiddenFields,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {} as AuthActionState);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                fill="#5eead4"
              />
            </svg>
          </span>
          <span className="text-xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
            Aether
          </span>
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
          {title}
        </h1>
        <p className="mt-2 text-sm text-[#5a6b62]">{subtitle}</p>
      </div>

      <form action={formAction} className="glass space-y-4 rounded-3xl p-6 sm:p-8">
        {hiddenFields &&
          Object.entries(hiddenFields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}

        {state?.error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {state.success}
          </div>
        )}

        {children}

        <button type="submit" disabled={pending} className="btn-primary w-full !py-3 disabled:opacity-60">
          {pending ? "Please wait…" : submitLabel}
        </button>
      </form>

      {footer && <div className="mt-6 text-center text-sm text-[#5a6b62]">{footer}</div>}
    </div>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#0c1a14]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm outline-none ring-teal-700/20 transition focus:ring-2"
      />
    </label>
  );
}
