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
  showGoogleAuth?: boolean;
  initialError?: string;
};

export default function AuthForm({
  action,
  title,
  subtitle,
  submitLabel,
  children,
  footer,
  hiddenFields,
  showGoogleAuth,
  initialError,
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

        {(state?.error || initialError) && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {state?.error || initialError}
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

        {showGoogleAuth && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-teal-900/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-[#5a6b62]">Or continue with</span>
              </div>
            </div>
            <a
              href="/api/auth/google"
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm font-medium text-[#0c1a14] shadow-sm hover:bg-teal-50 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </a>
          </>
        )}
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
