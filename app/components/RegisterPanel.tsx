"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
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

function MedicalCrossMark() {
  return (
    <span
      aria-hidden
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-lime-400/12 ring-1 ring-lime-300/30"
    >
      <span className="absolute h-[25px] w-[9px] rounded-[4px] bg-gradient-to-b from-lime-200 via-lime-400 to-lime-600 shadow-[0_0_18px_rgba(163,230,53,0.28)]" />
      <span className="absolute h-[9px] w-[25px] rounded-[4px] bg-gradient-to-r from-lime-200 via-lime-400 to-lime-600 shadow-[0_0_18px_rgba(163,230,53,0.28)]" />
    </span>
  );
}

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-3.5">
      <MedicalCrossMark />
      <span className="leading-none">
        <span
          className="block text-[18px] font-semibold tracking-[-0.02em] text-white sm:text-[20px]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {platform.name}
        </span>
        <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.22em] text-white/55 sm:text-[10px]">
          Care. Connect. Convenience.
        </span>
      </span>
    </Link>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.39 1.8-3.13 1.87-2.39 5.99.48 7.14-.57 1.5-1.3 2.99-2.52 4.08zM12.03 7.25C11.88 5.02 13.69 3.19 15.74 3c.29 2.58-2.29 4.5-3.71 4.25z" />
    </svg>
  );
}

export default function RegisterPanel({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as AuthActionState);
  const [csrfToken, setCsrfToken] = useState("");
  const [csrfError, setCsrfError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const pwCheck = useMemo(() => evaluatePassword(password), [password]);
  const confirmMismatch = confirm.length > 0 && password.length > 0 && password !== confirm;
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const filledSegments = password ? Math.max(1, Math.round(pwCheck.score * 6)) : 0;
  const canSubmit = Boolean(csrfToken) && !pending && agreed && pwCheck.ok && !confirmMismatch;

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
      } catch (error) {
        console.error("[RegisterPanel] CSRF bootstrap failed", error);
        if (!cancelled) setCsrfError("Could not prepare a secure session. Please refresh the page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="reg-bg relative min-h-screen w-full overflow-x-hidden px-0 py-[6.2vh] min-[1280px]:py-[26px]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(1,18,9,0.58),rgba(3,32,18,0.18)_52%,rgba(1,10,5,0.25))]" aria-hidden />

      <div className="relative z-10 mx-auto w-[calc(100%-88px)] max-w-[1444px] min-h-[88.9vh] overflow-hidden rounded-[24px] border border-white/25 bg-[linear-gradient(140deg,rgba(15,43,28,0.30),rgba(4,26,15,0.18))] shadow-[0_36px_100px_-35px_rgba(0,0,0,0.88)] backdrop-blur-[2px] min-[1280px]:min-h-[calc(100vh-52px)]">
        <div className="grid h-full min-h-[88.9vh] min-[1024px]:grid-cols-[43.1%_56.9%] min-[1280px]:grid-cols-[56.5%_43.5%] min-[1280px]:min-h-[calc(100vh-52px)]">
          <aside className="flex min-h-full min-w-0 flex-col p-8 min-[1280px]:p-[34px]">
            <Brand />

            <div className="mt-10 flex flex-wrap items-center gap-3 min-[1280px]:mt-[46px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3.5 py-2 text-[10px] font-medium text-white/75 backdrop-blur-md sm:text-[11px]">
                <Users className="h-3.5 w-3.5 text-lime-300" strokeWidth={2.1} />
                Trusted by thousands of families
              </span>
              <div className="flex -space-x-2" aria-label="Trusted by thousands of families">
                {["J", "A", "K", "M"].map((initial, index) => (
                  <span
                    key={initial}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#183521] text-[10px] font-bold text-[#13331b] shadow-sm"
                    style={{ background: ["#59e391", "#8fdd45", "#45d68a", "#a1e65c"][index] }}
                    aria-hidden
                  >
                    {initial}
                  </span>
                ))}
                <span className="flex h-8 items-center justify-center rounded-full border-2 border-[#183521] bg-lime-400 px-2.5 text-[10px] font-extrabold text-[#173216]">
                  10K+
                </span>
              </div>
            </div>

            <div className="mt-12 min-[1280px]:mt-[69px]">
              <h2
                className="max-w-[610px] text-[42px] font-semibold leading-[0.98] tracking-[-0.035em] text-white sm:text-[54px] min-[1280px]:text-[58px]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Your health
                <br />
                is our <span className="relative inline-block text-lime-300">priority<Leaf className="absolute -right-7 -top-3 h-5 w-5 text-lime-300/85" strokeWidth={2.2} /></span>
              </h2>
              <p className="mt-6 max-w-[500px] text-[14px] leading-[1.65] text-white/70 sm:text-[16px] min-[1280px]:mt-7">
                Create your account and discover a smarter way to manage your health and medications.
              </p>
            </div>

            <div className="mt-9 grid gap-3 min-[1024px]:grid-cols-1 min-[1280px]:grid-cols-3 min-[1280px]:gap-3.5">
              {[
                {
                  title: "Secure & Private",
                  desc: "Your data is encrypted and always protected.",
                  icon: ShieldCheck,
                },
                {
                  title: "Personalized Care",
                  desc: "Recommendations tailored just for you.",
                  icon: User,
                },
                {
                  title: "Fast & Easy",
                  desc: "Quick setup and instant access to all features.",
                  icon: Zap,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[18px] border border-lime-300/15 bg-black/10 p-4 backdrop-blur-[3px] min-[1280px]:min-h-[187px] min-[1280px]:p-4.5"
                  >
                    <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-[12px] bg-lime-400/12 ring-1 ring-lime-300/15">
                      <Icon className="h-5 w-5 text-lime-300" strokeWidth={2.1} />
                    </span>
                    <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-[12px] leading-[1.55] text-white/65">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto hidden items-center gap-8 pt-10 text-[11px] text-white/55 min-[1024px]:flex">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-300/10 text-lime-300 ring-1 ring-lime-300/15">
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="max-w-[132px] leading-[1.45]">Your health information is safe with us.</span>
              </div>
              <span className="h-9 w-px bg-white/12" aria-hidden />
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.03] text-white/70 ring-1 ring-white/10">
                  <Lock className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <span className="leading-[1.45]">We comply with<br />HIPAA &amp; GDPR</span>
              </div>
            </div>
          </aside>

          <div className="relative flex min-h-full items-end justify-end p-8 min-[1024px]:p-8 min-[1280px]:pb-5 min-[1280px]:pl-0 min-[1280px]:pr-[64px] min-[1280px]:pt-0">
            <section className="w-full max-w-[535px] rounded-[23px] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.13),rgba(21,58,38,0.35))] p-8 shadow-[0_24px_65px_rgba(0,0,0,0.30)] backdrop-blur-xl min-[1280px]:p-7">
              <div className="mb-5 flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-400/5 px-3.5 py-2 text-[10px] font-medium text-lime-200 min-[1280px]:mb-4">
                <Users className="h-3.5 w-3.5 text-lime-300" />
                Join thousands of users who trust {platform.name}
              </div>

              <div>
                <h1
                  className="text-[29px] font-semibold leading-none tracking-[-0.025em] text-white min-[1280px]:text-[31px]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Create your account
                </h1>
                <p className="mt-3 text-[13px] leading-relaxed text-white/65 min-[1280px]:text-[14px]">
                  Join {platform.name} and take control of your health.
                </p>
              </div>

              {(state?.error || csrfError) && (
                <div role="alert" className="mt-4 rounded-xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {state?.error || csrfError}
                </div>
              )}
              {state?.success && (
                <div role="status" className="mt-4 rounded-xl border border-lime-300/20 bg-lime-400/10 px-4 py-3 text-sm text-lime-100">
                  {state.success}
                </div>
              )}

              <form action={formAction} className="mt-6 flex flex-col gap-5 min-[1280px]:mt-5 min-[1280px]:gap-4">
                <input type="hidden" name="csrfToken" value={csrfToken} />
                <input type="hidden" name="fullName" value={fullName} />
                <input type="hidden" name="dateOfBirth" value="" />

                <div className="grid gap-4 min-[1280px]:grid-cols-2 min-[1280px]:gap-3">
                  <FieldLabel label="First name">
                    <TextField icon={<User />} name="firstName" placeholder="John" value={firstName} onChange={setFirstName} required autoComplete="given-name" />
                  </FieldLabel>
                  <FieldLabel label="Last name">
                    <TextField icon={<User />} name="lastName" placeholder="Doe" value={lastName} onChange={setLastName} required autoComplete="family-name" />
                  </FieldLabel>
                </div>

                <FieldLabel label="Email address">
                  <TextField icon={<Mail />} name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
                </FieldLabel>

                <FieldLabel label="Phone number">
                  <TextField icon={<Phone />} name="phone" type="tel" placeholder="+254 712 345 678" autoComplete="tel" />
                </FieldLabel>

                <FieldLabel label="Password">
                  <PasswordField
                    name="password"
                    placeholder="Create a strong password"
                    value={password}
                    visible={showPw}
                    onChange={setPassword}
                    onToggle={() => setShowPw((v) => !v)}
                    autoComplete="new-password"
                  />
                  <div className="mt-3 flex items-center gap-1.5">
                    {Array.from({ length: 6 }, (_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${index < filledSegments ? "bg-lime-300" : "bg-white/12"}`}
                      />
                    ))}
                    <span className="ml-2 shrink-0 text-[11px] font-semibold text-lime-300 min-[1280px]:text-[10px]">
                      {password.length === 0 ? "Enter a password" : pwCheck.score < 0.4 ? "Weak" : pwCheck.score < 0.8 ? "Fair" : pwCheck.score < 1 ? "Good" : "Strong"}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-[11px] text-white/60 min-[1280px]:mt-2.5 min-[1280px]:space-y-1.5">
                    {PASSWORD_RULES.slice(0, 3).map((rule) => {
                      const met = rule.test(password);
                      return (
                        <li key={rule.id} className="flex items-center gap-2">
                          <span className={`flex h-4 w-4 items-center justify-center rounded-full ${met ? "bg-lime-300 text-[#1b3512]" : "bg-white/10 text-white/20"}`}>
                            {met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                          </span>
                          <span>{rule.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </FieldLabel>

                <FieldLabel label="Confirm password">
                  <PasswordField
                    name="confirm"
                    placeholder="Re-enter your password"
                    value={confirm}
                    visible={showConfirmPw}
                    onChange={setConfirm}
                    onToggle={() => setShowConfirmPw((v) => !v)}
                    autoComplete="new-password"
                    mismatch={confirmMismatch}
                  />
                  {confirmMismatch && <p className="mt-2 text-[11px] font-medium text-rose-200">Passwords do not match.</p>}
                </FieldLabel>

                <label className="flex items-start gap-3 text-[11px] leading-[1.55] text-white/65">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 appearance-none rounded-[4px] border border-white/20 bg-white/[0.02] checked:border-lime-300 checked:bg-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300/20"
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms" className="font-medium text-lime-300 hover:text-lime-200 hover:underline">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="font-medium text-lime-300 hover:text-lime-200 hover:underline">Privacy Policy</Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="group flex h-[60px] w-full items-center justify-center gap-5 rounded-[14px] border border-lime-200/30 bg-[linear-gradient(110deg,#5d8f1f,#9fd83a_58%,#c2ea60)] px-6 text-[18px] font-medium text-white shadow-[0_12px_25px_rgba(84,126,26,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 min-[1280px]:h-[56px] min-[1280px]:text-[17px]"
                >
                  <span>{pending ? "Creating account…" : !csrfToken ? "Preparing secure form…" : "Create account"}</span>
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" strokeWidth={1.8} />
                </button>

                <div className="flex items-center gap-4 py-1 text-[10px] text-white/55">
                  <span className="h-px flex-1 bg-white/12" />
                  <span className="shrink-0">or sign up with</span>
                  <span className="h-px flex-1 bg-white/12" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="/api/auth/google"
                    className="flex h-[55px] items-center justify-center gap-3 rounded-[13px] border border-white/15 bg-white/[0.025] text-[16px] font-medium text-white transition hover:bg-white/[0.06] min-[1280px]:h-[52px] min-[1280px]:text-[15px]"
                  >
                    <GoogleMark />
                    Google
                  </a>
                  <button
                    type="button"
                    className="flex h-[55px] items-center justify-center gap-3 rounded-[13px] border border-white/15 bg-white/[0.025] text-[16px] font-medium text-white transition hover:bg-white/[0.06] min-[1280px]:h-[52px] min-[1280px]:text-[15px]"
                  >
                    <AppleMark />
                    Apple
                  </button>
                </div>

                <div className="pt-3 text-center text-[14px] text-white/65 min-[1280px]:pt-2">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-lime-300 hover:text-lime-200 hover:underline">Sign in</Link>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium text-white/85 min-[1280px]:mb-1.5 min-[1280px]:text-[10px]">{label}</span>
      {children}
    </label>
  );
}

function TextField({
  icon,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  value,
  onChange,
}: {
  icon: ReactNode;
  name: string;
  type?: string;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lime-300/85 min-[1280px]:left-3.5">
        {icon && <span className="block [&_svg]:h-[18px] [&_svg]:w-[18px] min-[1280px]:[&_svg]:h-[17px] min-[1280px]:[&_svg]:w-[17px]">{icon}</span>}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-[64px] w-full rounded-[13px] border border-white/15 bg-black/10 px-4 pl-12 text-[14px] text-white outline-none placeholder:text-white/30 transition focus:border-lime-300/40 focus:bg-black/15 focus:ring-2 focus:ring-lime-300/10 min-[1280px]:h-[58px] min-[1280px]:px-4 min-[1280px]:pl-11 min-[1280px]:text-[13px]"
      />
    </div>
  );
}

function PasswordField({
  name,
  placeholder,
  value,
  visible,
  onChange,
  onToggle,
  autoComplete,
  mismatch,
}: {
  name: string;
  placeholder: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  autoComplete?: string;
  mismatch?: boolean;
}) {
  return (
    <div className="relative">
      <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${mismatch ? "text-rose-200" : "text-lime-300/85"} min-[1280px]:left-3.5`}>
        <Lock className="h-[18px] w-[18px] min-[1280px]:h-[17px] min-[1280px]:w-[17px]" strokeWidth={1.8} />
      </span>
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className={`h-[64px] w-full rounded-[13px] border bg-black/10 px-12 text-[14px] text-white outline-none placeholder:text-white/30 transition focus:bg-black/15 focus:ring-2 focus:ring-lime-300/10 min-[1280px]:h-[58px] min-[1280px]:text-[13px] ${mismatch ? "border-rose-300/45 focus:border-rose-300/60" : "border-white/15 focus:border-lime-300/40"}`}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 text-white/45 transition hover:text-white/80"
      >
        {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
}
