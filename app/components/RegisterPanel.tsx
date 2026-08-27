"use client";

import { useActionState, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users,
  Zap,
} from "lucide-react";
import type { AuthActionState } from "@/app/actions/auth";
import { platform } from "@/app/lib/data";
import { evaluatePassword, PASSWORD_RULES } from "@/app/lib/password";

type Props = {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

/**
 * Pixel-faithful implementation of the register page design mockups
 * (register_page_designs/reg_pc.png + reg_mobile.png).
 *
 * Layout:
 *  - Full-bleed nature background image (PC: reg-bg-pc.png, mobile: reg-bg-mobile.png).
 *  - A single dark "main card" sits on top with a deep-forest translucent body.
 *  - On lg+, the card splits into a hero panel (left ~55%) and a glass form panel (right ~45%).
 *  - On mobile, the card stacks vertically (hero on top, form below) inside one glass card.
 *
 * Palette matches the mockup exactly:
 *  - Lime green accents (#84cc16 / #4ade80 / #86efac)
 *  - Deep forest body (#0a1f14 / #051205)
 *  - Translucent glass panels with white/10 borders
 */
export default function RegisterPanel({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as AuthActionState);

  // CSRF bootstrap (server actions require a double-submit token).
  const [csrfToken, setCsrfToken] = useState("");
  const [csrfError, setCsrfError] = useState<string | null>(null);

  // Local UI state for the form fields that need live behavior.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Compute live password strength — drives the 4-segment bar + checklist.
  const pwCheck = useMemo(() => evaluatePassword(password), [password]);
  const confirmMismatch =
    confirm.length > 0 && password.length > 0 && password !== confirm;

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
        console.error("[RegisterPanel] CSRF bootstrap failed", e);
        if (!cancelled) {
          setCsrfError("Could not prepare a secure session. Please refresh the page.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Strength bar (4 segments) — first segments light up lime green as score grows.
  const filledSegments = Math.round(pwCheck.score * 4);
  const canSubmit = Boolean(csrfToken) && !pending && agreed && password.length > 0 && !confirmMismatch;

  // The combined fullName is shipped to the server action via a hidden input,
  // so the existing registerAction signature stays unchanged.
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  return (
    <div className="reg-bg relative min-h-screen w-full overflow-hidden">
      {/* Dark overlay across the whole viewport so the bg image reads as a tinted scene */}
      <div className="pointer-events-none absolute inset-0 bg-[#051205]/70" aria-hidden />

      {/* Main card — dark translucent body, large rounded corners, big outer shadow */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1240px] flex-col items-stretch px-4 py-6 sm:px-6 sm:py-10 lg:py-12">
        <div className="grid w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#0a1f14]/85 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl lg:grid-cols-[1.15fr_0.95fr]">
          {/* ===================== HERO PANEL (LEFT ON PC) ===================== */}
          <aside className="relative flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
            {/* Brand + trust row */}
            <div className="relative">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/15 ring-1 ring-lime-400/30">
                  <Leaf className="h-5 w-5 text-lime-400" strokeWidth={2} />
                </span>
                <div className="leading-tight">
                  <span
                    className="block text-base font-semibold text-white sm:text-lg"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {platform.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
                    Care. Connect. Convenience.
                  </span>
                </div>
              </div>

              {/* Trust pill with avatars + counter */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70 ring-1 ring-white/10">
                  <Users className="h-3.5 w-3.5 text-lime-400" />
                  Trusted by thousands of families
                </span>
                <div className="flex -space-x-2">
                  {["#4ade80", "#84cc16", "#22c55e", "#86efac"].map((c, i) => (
                    <span
                      key={i}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-[#052e16] ring-2 ring-[#0a1f14]"
                      style={{ background: c }}
                      aria-hidden
                    >
                      {["J", "A", "K", "M"][i]}
                    </span>
                  ))}
                  <span className="flex h-7 items-center justify-center rounded-full bg-lime-400 px-2 text-[10px] font-bold text-[#052e16] ring-2 ring-[#0a1f14]">
                    10K+
                  </span>
                </div>
              </div>
            </div>

            {/* Headline */}
            <div className="relative mt-2">
              <h2
                className="text-[34px] font-semibold leading-[1.1] text-white sm:text-[44px] lg:text-[52px]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Your health <br className="hidden sm:block" />
                is our{" "}
                <span className="relative inline-block text-lime-400">
                  priority
                  <Leaf
                    className="absolute -right-4 -top-2 h-5 w-5 text-lime-400/80"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px]">
                Create your account and discover a smarter way to manage your health and medications.
              </p>
            </div>

            {/* Feature cards */}
            <div className="relative grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Secure & Private",
                  desc: "Your data is encrypted and always protected.",
                },
                {
                  icon: User,
                  title: "Personalized Care",
                  desc: "Recommendations tailored just for you.",
                },
                {
                  icon: Zap,
                  title: "Fast & Easy",
                  desc: "Quick setup and instant access to all features.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm"
                >
                  <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/15 text-lime-400 ring-1 ring-lime-400/25">
                    <f.icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Compliance footer (only on lg — hidden on mobile to save space) */}
            <div className="relative hidden items-center gap-4 text-[11px] text-white/40 lg:flex">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your health information is safe with us.
              </span>
              <span className="h-3 w-px bg-white/15" aria-hidden />
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                We comply with HIPAA &amp; GDPR
              </span>
            </div>
          </aside>

          {/* ===================== FORM PANEL (RIGHT ON PC) ===================== */}
          <div className="relative flex flex-col justify-center border-t border-white/10 bg-[#0e2a1e]/60 p-5 backdrop-blur-md sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
            <form action={formAction} className="flex flex-col gap-4">
              {/* Hidden helpers */}
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="fullName" value={fullName} />
              <input type="hidden" name="dateOfBirth" value="" />

              {/* Inline banner above the form */}
              <div className="mb-1 hidden items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/5 px-3 py-1.5 text-[11px] font-medium text-lime-300 sm:inline-flex">
                <Users className="h-3.5 w-3.5" />
                Join thousands of users who trust {platform.name}
              </div>

              {/* Form header */}
              <div>
                <h1
                  className="text-2xl font-semibold text-white sm:text-[28px]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Create your account
                </h1>
                <p className="mt-1.5 text-sm text-white/60">
                  Join {platform.name} and take control of your health.
                </p>
              </div>

              {/* Server / CSRF error */}
              {(state?.error || csrfError) && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                >
                  {state?.error || csrfError}
                </div>
              )}
              {state?.success && (
                <div
                  role="status"
                  className="rounded-xl border border-lime-400/30 bg-lime-400/10 px-4 py-3 text-sm text-lime-200"
                >
                  {state.success}
                </div>
              )}

              {/* First + Last name (2 cols on sm+) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldLabel label="First name">
                  <InputWithIcon icon={User} name="firstName" placeholder="John" required value={firstName} onChange={setFirstName} autoComplete="given-name" />
                </FieldLabel>
                <FieldLabel label="Last name">
                  <InputWithIcon icon={User} name="lastName" placeholder="Doe" required value={lastName} onChange={setLastName} autoComplete="family-name" />
                </FieldLabel>
              </div>

              {/* Email */}
              <FieldLabel label="Email address">
                <InputWithIcon
                  icon={Mail}
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </FieldLabel>

              {/* Phone */}
              <FieldLabel label="Phone number">
                <InputWithIcon
                  icon={Phone}
                  name="phone"
                  type="tel"
                  placeholder="+254 712 345 678"
                  autoComplete="tel"
                />
              </FieldLabel>

              {/* Password + strength bar */}
              <FieldLabel label="Password">
                <PasswordInput
                  name="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={setPassword}
                  visible={showPw}
                  onToggle={() => setShowPw((v) => !v)}
                  autoComplete="new-password"
                />
                {/* 4-segment strength bar */}
                <div className="mt-2 flex items-center gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i < filledSegments ? "bg-lime-400" : "bg-white/10"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-[11px] font-semibold text-lime-300">
                    {password.length === 0
                      ? "Enter a password"
                      : pwCheck.score < 0.4
                        ? "Weak"
                        : pwCheck.score < 0.8
                          ? "Fair"
                          : pwCheck.score < 1
                            ? "Good"
                            : "Strong"}
                  </span>
                </div>
                {/* Criteria checklist (3 items per mockup) */}
                <ul className="mt-2.5 grid gap-1.5 text-xs text-white/60 sm:grid-cols-2">
                  {PASSWORD_RULES.slice(0, 3).map((rule) => {
                    const met = rule.test(password);
                    return (
                      <li key={rule.id} className="flex items-center gap-1.5">
                        <span
                          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                            met ? "bg-lime-400 text-[#052e16]" : "bg-white/10 text-white/40"
                          }`}
                        >
                          {met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                        </span>
                        <span>{rule.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </FieldLabel>

              {/* Confirm password */}
              <FieldLabel label="Confirm password">
                <PasswordInput
                  name="confirm"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={setConfirm}
                  visible={showConfirmPw}
                  onToggle={() => setShowConfirmPw((v) => !v)}
                  autoComplete="new-password"
                  mismatch={confirmMismatch}
                />
                {confirmMismatch && (
                  <p className="mt-1.5 text-xs font-medium text-rose-300">Passwords do not match.</p>
                )}
              </FieldLabel>

              {/* Terms checkbox */}
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/75">
                <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="peer absolute inset-0 cursor-pointer appearance-none rounded-[4px] border border-white/25 bg-transparent checked:border-lime-400 checked:bg-lime-400"
                  />
                  <Check
                    className="pointer-events-none absolute h-3 w-3 text-[#052e16] opacity-0 transition-opacity peer-checked:opacity-100"
                    strokeWidth={3}
                  />
                </span>
                <span className="leading-snug">
                  I agree to the{" "}
                  <Link href="/terms" className="font-medium text-lime-400 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-medium text-lime-400 hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="group mt-1 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#84cc16] to-[#65a30d] text-[15px] font-semibold text-[#052e16] shadow-[0_4px_20px_rgba(132,204,22,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Please wait…" : !csrfToken ? "Preparing secure form…" : "Create account"}
                {!pending && csrfToken && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </button>

              {/* Divider */}
              <div className="relative my-1.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0e2a1e] px-3 text-white/50">or sign up with</span>
                </div>
              </div>

              {/* Social auth (Google + Apple) */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/api/auth/google"
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </a>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-[46px] cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/70 disabled:opacity-70"
                  title="Apple Sign-In coming soon"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.49-.12-1.13.42-2.31 1.06-3.04.71-.83 1.99-1.46 3.104-1.53zM20.5 17.04c-.55 1.27-.82 1.83-1.53 2.96-.99 1.6-2.39 3.59-4.12 3.6-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.01-3.05-1.81-4.04-3.41C-1.06 16.01-1.31 11.03 1.2 8.39c.79-.83 1.83-1.46 3-1.46 1.16 0 1.89.78 3.04.78 1.12 0 1.85-.78 3.04-.78.96 0 1.98.53 2.71 1.15.49.4.94.93 1.31 1.5-2.61.99-3.5 4.06-1.99 6.06.34.45.83.83 1.41 1.08z" />
                  </svg>
                  Apple
                </button>
              </div>

              {/* Footer link */}
              <p className="mt-1 text-center text-sm text-white/70">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-lime-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Small building blocks (file-local) -------------------- */

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/85">{label}</span>
      {children}
    </label>
  );
}

function IconWrap({ icon: Icon }: { icon: ComponentType<{ className?: string; strokeWidth?: number }> }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lime-400/80">
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

function InputWithIcon({
  icon,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  value,
  onChange,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="relative">
      <IconWrap icon={icon} />
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="h-[46px] w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-lime-400/60 focus:bg-black/40 focus:ring-2 focus:ring-lime-400/15"
      />
    </div>
  );
}

function PasswordInput({
  name,
  placeholder,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  mismatch,
}: {
  name: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete?: string;
  mismatch?: boolean;
}) {
  return (
    <div className="relative">
      <IconWrap icon={Lock} />
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={`h-[46px] w-full rounded-xl border bg-black/30 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-white/35 focus:bg-black/40 focus:ring-2 focus:ring-lime-400/15 ${
          mismatch ? "border-rose-400/60 focus:border-rose-400/60" : "border-white/10 focus:border-lime-400/60"
        }`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-white/45 transition hover:text-white/80"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
