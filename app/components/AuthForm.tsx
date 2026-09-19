"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import type { AuthActionState } from "@/app/actions/auth";
import { platform } from "@/app/lib/data";

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
  /** Optional side-panel highlight bullets for the polished split layout. */
  highlights?: string[];
  /** Render the auth shell as transparent glass so a route-level artwork remains visible. */
  artworkBackdrop?: boolean;
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
  highlights = [
    "Secure session with role-aware portal access",
    "Track refills, orders, and pharmacist messages",
    "Kenya Data Protection Act–conscious handling of your health data",
  ],
  artworkBackdrop = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {} as AuthActionState);
  // Auth server actions validate a double-submit CSRF token. Cookies can only
  // be set from a Route Handler / Server Action, so we fetch the token here.
  const [csrfToken, setCsrfToken] = useState("");
  const [csrfError, setCsrfError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/csrf", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`CSRF endpoint returned ${res.status}`);
        const data = (await res.json()) as { token?: string };
        if (!data.token) throw new Error("CSRF token missing from response");
        if (!cancelled) {
          setCsrfToken(data.token);
          setCsrfError(null);
        }
      } catch (e) {
        console.error("[AuthForm] CSRF bootstrap failed", e);
        if (!cancelled) {
          setCsrfError("Could not prepare a secure session. Please refresh the page.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = Boolean(csrfToken) && !pending;

  return (
    <div
      data-auth-artwork={artworkBackdrop ? "true" : undefined}
      className={
        artworkBackdrop
          ? "liquid-glass care-glass mx-auto grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/25 bg-transparent shadow-[0_24px_80px_rgba(0,0,0,0.24)] lg:grid-cols-[0.95fr_1.05fr]"
          : "liquid-glass care-glass mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--card)] shadow-[0_24px_80px_rgba(8,40,32,0.12)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]"
      }
      style={artworkBackdrop ? { background: "transparent", backdropFilter: "none" } : undefined}
    >
      {/* Brand panel */}
      <aside
        className={
          artworkBackdrop
            ? "relative hidden overflow-hidden p-7 text-white lg:flex lg:flex-col lg:justify-between"
            : "relative hidden overflow-hidden bg-gradient-to-br from-[#084c3f] via-[#0d6e5a] to-[#0f766e] p-8 text-white lg:flex lg:flex-col lg:justify-between"
        }
        style={
          artworkBackdrop
            ? {
                background:
                  "linear-gradient(155deg, rgba(4,56,45,0.26), rgba(6,77,61,0.20) 52%, rgba(7,61,58,0.24))",
                backdropFilter: "none",
              }
            : undefined
        }
      >
        {!artworkBackdrop && (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(94,234,212,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(201,162,39,0.25), transparent 40%)",
            }}
          />
        )}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                  fill="#5eead4"
                />
                <path d="M12 16v5" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span>
              <span className="block text-lg font-semibold leading-none" style={{ fontFamily: "var(--font-display), serif" }}>
                {platform.name}
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-100/80">
                Network
              </span>
            </span>
          </Link>

          <div className={artworkBackdrop ? "mt-7" : "mt-12"}>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal-50 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5 text-teal-200" />
              Trusted neighbourhood care
            </p>
            <h2
              className="mt-4 text-3xl font-semibold leading-tight text-white"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Your health portal, built around real pharmacy workflows.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-teal-50/90">
              Patients, caregivers, and staff each land in the right workspace after sign-in — no guessing.
            </p>
          </div>
        </div>

        <ul className={artworkBackdrop ? "relative mt-6 space-y-2" : "relative mt-10 space-y-3"}>
          {highlights.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-2xl bg-black/15 px-3.5 py-3 text-sm text-teal-50 ring-1 ring-white/10"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-300/20 text-teal-100">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <p className={artworkBackdrop ? "relative mt-5 text-xs text-teal-100/80" : "relative mt-8 text-xs text-teal-100/70"}>
          Need help?{" "}
          <a href={platform.phoneHref} className="font-semibold text-white hover:underline">
            {platform.phone}
          </a>
          {" · "}
          <a href={`mailto:${platform.email}`} className="font-semibold text-white hover:underline">
            {platform.email}
          </a>
        </p>
      </aside>

      {/* Form panel */}
      <div
        className="relative flex flex-col justify-center p-6 sm:p-8 lg:p-9"
        style={
          artworkBackdrop
            ? { background: "rgba(2, 18, 13, 0.14)", backdropFilter: "none" }
            : undefined
        }
      >
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] lg:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {platform.name}
        </Link>

        <div className="mb-6 lg:mb-8">
          <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d6e5a] to-[#084c3f] shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3c-1.5 3.5-4 5.5-7.5 6.5C8 10.5 10.5 12.5 12 16c1.5-3.5 4-5.5 7.5-6.5C16 8.5 13.5 6.5 12 3Z"
                  fill="#5eead4"
                />
              </svg>
            </span>
            <span className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
              Afyvia
            </span>
          </Link>
          <h1
            className="mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          {hiddenFields &&
            Object.entries(hiddenFields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}

          {(state?.error || initialError || csrfError) && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-400/60 dark:bg-rose-950/70 dark:text-rose-100"
            >
              {state?.error || initialError || csrfError}
            </div>
          )}
          {state?.success && (
            <div
              role="status"
              className="rounded-2xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900 dark:border-teal-300/55 dark:bg-teal-950/70 dark:text-teal-100"
            >
              {state.success}
            </div>
          )}

          {children}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary w-full !py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
          >
            {pending ? "Please wait…" : !csrfToken ? "Preparing secure form…" : submitLabel}
          </button>

          {showGoogleAuth && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--line)]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-[var(--card)] px-3 text-[var(--muted)]">Or continue with</span>
                </div>
              </div>
              <a
                href={hiddenFields?.next ? `/api/auth/google?next=${encodeURIComponent(hiddenFields.next)}` : "/api/auth/google"}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-sunken)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </a>
            </>
          )}
        </form>

        {footer && <div className="mt-6 space-y-2 text-center text-sm text-[var(--muted)]">{footer}</div>}
      </div>
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
      <span className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card-elev))] bg-[var(--card-elev)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_24%,transparent)] disabled:cursor-not-allowed disabled:border-[color-mix(in_srgb,var(--foreground)_32%,var(--card-elev))] disabled:bg-[color-mix(in_srgb,var(--foreground)_7%,var(--card-elev))] disabled:text-[var(--muted)] disabled:opacity-100"
      />
    </label>
  );
}
