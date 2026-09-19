"use client";

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import type { AuthActionState } from "@/app/actions/auth";
import { platform } from "@/app/lib/data";
import { evaluatePassword, PASSWORD_RULES } from "@/app/lib/password";
import styles from "./UnifiedAuthSurface.module.css";

export type AuthMode = "login" | "register";

type Props = {
  initialMode?: AuthMode;
  next?: string;
  initialError?: string;
  verified?: boolean;
  loginAction: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  registerAction: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  showDemoCredentials?: boolean;
};

/**
 * 3D-styled medical cross logo with emerald/lime sheen.
 */
function MedicalCrossMark() {
  return (
    <span
      aria-hidden
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-lime-400/15 ring-1 ring-lime-300/35 shadow-[0_0_20px_rgba(163,230,53,0.25)]"
    >
      <span className="absolute h-[25px] w-[9px] rounded-[4px] bg-gradient-to-b from-lime-200 via-lime-400 to-lime-600 shadow-[0_0_18px_rgba(163,230,53,0.35)]" />
      <span className="absolute h-[9px] w-[25px] rounded-[4px] bg-gradient-to-r from-lime-200 via-lime-400 to-lime-600 shadow-[0_0_18px_rgba(163,230,53,0.35)]" />
    </span>
  );
}

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-3.5 group">
      <MedicalCrossMark />
      <span className="leading-none">
        <span
          className="block text-[19px] font-semibold tracking-[-0.02em] text-white sm:text-[21px] transition-colors group-hover:text-lime-200"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          {platform.name}
        </span>
        <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.22em] text-white/65 sm:text-[10px]">
          Care. Connect. Convenience.
        </span>
      </span>
    </Link>
  );
}

/**
 * Glowing 3D Botanical Cross Plaque
 * Recreates the floating emerald glass plaque with sculpted leaf
 * seen above the moss pedestal in the official design mockup.
 */
function BotanicalCrossPlaque() {
  return (
    <div className={styles.plaqueWrapper} aria-hidden="true">
      <div className={styles.glowingCrossPlaque}>
        <div className={styles.plaqueInnerGlow} />
        {/* Glowing glass cross with inner leaf */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Vertical beam */}
          <span className="absolute h-16 w-5 rounded-md bg-gradient-to-b from-lime-200 via-lime-400/80 to-emerald-600/90 shadow-[0_0_24px_rgba(163,230,53,0.55)]" />
          {/* Horizontal beam */}
          <span className="absolute h-5 w-16 rounded-md bg-gradient-to-r from-lime-200 via-lime-400/80 to-emerald-600/90 shadow-[0_0_24px_rgba(163,230,53,0.55)]" />
          {/* Center sculpted leaf */}
          <Leaf
            className="relative z-10 h-6 w-6 text-white drop-shadow-[0_2px_8px_rgba(20,83,45,0.8)]"
            strokeWidth={2.4}
          />
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
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
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.39 1.8-3.13 1.87-2.39 5.99.48 7.14-.57 1.5-1.3 2.99-2.52 4.08zM12.03 7.25C11.88 5.02 13.69 3.19 15.74 3c.29 2.58-2.29 4.5-3.71 4.25z" />
    </svg>
  );
}

export default function UnifiedAuthSurface({
  initialMode = "login",
  next = "",
  initialError = "",
  verified = false,
  loginAction,
  registerAction,
  showDemoCredentials = false,
}: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Unique IDs for accessibility
  const tabLoginId = useId();
  const tabRegisterId = useId();
  const panelLoginId = useId();
  const panelRegisterId = useId();

  // CSRF token bootstrap
  const [csrfToken, setCsrfToken] = useState("");
  const [csrfError, setCsrfError] = useState<string | null>(null);

  // Shared form inputs (preserved across mode switches)
  const [email, setEmail] = useState("");

  // Sign In specific state
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginState, runLoginAction, loginPending] = useActionState(
    loginAction,
    {} as AuthActionState,
  );

  // Create Account specific state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [registerState, runRegisterAction, registerPending] = useActionState(
    registerAction,
    {} as AuthActionState,
  );

  // Demo credentials panel toggle
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  // Touch Swipe Gesture State for Mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Password calculations for registration
  const pwCheck = useMemo(() => evaluatePassword(registerPassword), [registerPassword]);
  const confirmMismatch =
    registerConfirm.length > 0 && registerPassword.length > 0 && registerPassword !== registerConfirm;
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const filledSegments = registerPassword ? Math.max(1, Math.round(pwCheck.score * 5)) : 0;
  const canSubmitRegister =
    Boolean(csrfToken) && !registerPending && agreed && pwCheck.ok && !confirmMismatch;
  const canSubmitLogin = Boolean(csrfToken) && !loginPending;

  // Bootstrap CSRF token on mount
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
        console.error("[UnifiedAuthSurface] CSRF bootstrap failed", error);
        if (!cancelled) {
          setCsrfError("Could not prepare a secure session. Please refresh the page.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes("/register")) {
        setDirection("forward");
        setMode("register");
      } else if (path.includes("/login")) {
        setDirection("backward");
        setMode("login");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Unified Mode Switcher with Directional Navigation & URL Sync
  const switchMode = useCallback(
    (newMode: AuthMode) => {
      if (newMode === mode) return;

      const nextDirection = newMode === "register" ? "forward" : "backward";
      setDirection(nextDirection);

      const updateDOM = () => {
        setMode(newMode);
        // Dynamic title update
        if (typeof document !== "undefined") {
          document.title =
            newMode === "register"
              ? `Create account | ${platform.name}`
              : `Sign in | ${platform.name}`;
        }
      };

      // Modern View Transitions API with graceful fallback
      const doc =
        typeof document !== "undefined"
          ? (document as Document & {
              startViewTransition?: (options: { update: () => void; types?: string[] }) => void;
            })
          : null;

      if (doc?.startViewTransition) {
        try {
          doc.startViewTransition({
            update: updateDOM,
            types: [nextDirection],
          });
        } catch {
          updateDOM();
        }
      } else {
        updateDOM();
      }

      // Seamlessly update browser URL without full-page reload
      const targetPath =
        newMode === "register"
          ? next
            ? `/register?next=${encodeURIComponent(next)}`
            : "/register"
          : next
            ? `/login?next=${encodeURIComponent(next)}`
            : "/login";

      if (typeof window !== "undefined") {
        window.history.replaceState({ mode: newMode }, "", targetPath);
      }
    },
    [mode, next],
  );

  // Keyboard navigation for tablist (WAI-ARIA tabs pattern)
  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      switchMode(mode === "login" ? "register" : "login");
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      switchMode(mode === "register" ? "login" : "register");
    } else if (e.key === "Home") {
      e.preventDefault();
      switchMode("login");
    } else if (e.key === "End") {
      e.preventDefault();
      switchMode("register");
    }
  };

  // Mobile Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;

    // Only recognize horizontal swipes (prevent hijacking vertical scrolling)
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0 && mode === "login") {
        // Swiped left -> Switch to Register
        switchMode("register");
      } else if (diffX > 0 && mode === "register") {
        // Swiped right -> Switch to Login
        switchMode("login");
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Demo auto-fill helper
  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setLoginPassword("Password123!");
    setShowDemoDrawer(false);
  };

  return (
    <div className={styles.authRoot}>
      {/* High-Fidelity Zen/Botanical Background Layer */}
      <div
        className={`${styles.bgWrapper} ${direction === "forward" ? styles.bgShiftForward : styles.bgShiftBackward}`}
        aria-hidden="true"
      >
        <picture className={styles.bgPicture}>
          <source media="(min-width: 1024px)" srcSet="/register/reg-bg-pc.png" />
          <img
            src="/register/reg-bg-mobile.png"
            alt=""
            className={styles.bgImage}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className={styles.bgVeil} />
        <div className={styles.ambientGlowPrimary} />
        <div className={styles.ambientGlowAccent} />
      </div>

      {/* Main Glass Shell */}
      <main className={styles.mainContainer}>
        <div className={styles.contentGrid}>
          {/* Left Column: Brand, Storytelling & Trust Indicators */}
          <aside className={styles.storyColumn}>
            <Brand />

            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/25 px-3.5 py-1.5 text-[10px] font-medium text-white/85 backdrop-blur-md sm:text-[11px]">
                <Users className="h-3.5 w-3.5 text-lime-300" strokeWidth={2.2} />
                Trusted by thousands of families
              </span>
              <div className="flex -space-x-2" aria-label="Trusted by thousands of families">
                {["J", "A", "K", "M"].map((initial, index) => (
                  <span
                    key={initial}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-[#183521] text-[10px] font-bold text-[#13331b] shadow-sm ring-1 ring-white/10"
                    style={{ background: ["#59e391", "#8fdd45", "#45d68a", "#a1e65c"][index] }}
                    aria-hidden
                  >
                    {initial}
                  </span>
                ))}
                <span className="flex h-7 sm:h-8 items-center justify-center rounded-full border-2 border-[#183521] bg-lime-400 px-2 sm:px-2.5 text-[10px] font-extrabold text-[#173216] shadow-sm">
                  10K+
                </span>
              </div>
            </div>

            {/* Dynamic Hero Copy depending on active mode */}
            <div
              key={mode}
              className={`${styles.storyHeroBlock} ${direction === "forward" ? styles.slideForward : styles.slideBackward}`}
            >
              {mode === "login" ? (
                <>
                  <h2 className={styles.storyTitle}>
                    Welcome back
                    <br />
                    to seamless{" "}
                    <span className="relative inline-block text-lime-300">
                      care
                      <Leaf
                        className={`${styles.leafAccent} absolute -right-7 -top-2.5 h-5 w-5 text-lime-300/90`}
                        strokeWidth={2.3}
                      />
                    </span>
                  </h2>
                  <p className={styles.storySubtitle}>
                    One sign-in for your prescriptions, consultations, or platform workspace.
                    We’ll open the right portal for you.
                  </p>
                </>
              ) : (
                <>
                  <h2 className={styles.storyTitle}>
                    Your health
                    <br />
                    is our{" "}
                    <span className="relative inline-block text-lime-300">
                      priority
                      <Leaf
                        className={`${styles.leafAccent} absolute -right-7 -top-2.5 h-5 w-5 text-lime-300/90`}
                        strokeWidth={2.3}
                      />
                    </span>
                  </h2>
                  <p className={styles.storySubtitle}>
                    Create your account and discover a smarter way to manage your health,
                    prescriptions, and licensed pharmacy consultations.
                  </p>
                </>
              )}
            </div>

            {/* Feature Glass Cards Grid */}
            <div className={styles.featureCardsGrid}>
              {mode === "login"
                ? [
                    {
                      title: "Role-Aware Portal",
                      desc: "Patients, caregivers, and staff each land directly in their workspace.",
                      icon: ShieldCheck,
                    },
                    {
                      title: "Prescriptions & Refills",
                      desc: "Track orders, request refills, and chat with licensed pharmacists.",
                      icon: Zap,
                    },
                    {
                      title: "Protected Privacy",
                      desc: "Strict adherence to Kenya Data Protection Act & HIPAA standards.",
                      icon: Lock,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className={styles.featureCard}>
                        <span className={styles.featureIconWrap}>
                          <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <h3 className={styles.featureTitle}>{item.title}</h3>
                        <p className={styles.featureDesc}>{item.desc}</p>
                      </div>
                    );
                  })
                : [
                    {
                      title: "Secure & Private",
                      desc: "Your medical data is encrypted and always protected.",
                      icon: ShieldCheck,
                    },
                    {
                      title: "Personalized Care",
                      desc: "Medication schedules and counselling tailored just for you.",
                      icon: User,
                    },
                    {
                      title: "Fast & Easy",
                      desc: "Instant onboarding, rapid checkout, and doorstep delivery.",
                      icon: Zap,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className={styles.featureCard}>
                        <span className={styles.featureIconWrap}>
                          <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <h3 className={styles.featureTitle}>{item.title}</h3>
                        <p className={styles.featureDesc}>{item.desc}</p>
                      </div>
                    );
                  })}
            </div>

            {/* Glowing 3D Botanical Cross Plaque */}
            <BotanicalCrossPlaque />

            {/* Desktop Compliance Footer */}
            <div className={styles.trustFooter}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-300/15 text-lime-300 ring-1 ring-lime-300/25">
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="max-w-[155px] leading-[1.45]">
                  Your health information is safe with us.
                </span>
              </div>
              <span className="h-8 w-px bg-white/15" aria-hidden />
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/85 ring-1 ring-white/15">
                  <Lock className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span className="leading-[1.45]">
                  We comply with
                  <br />
                  HIPAA &amp; KDPA
                </span>
              </div>
            </div>
          </aside>

          {/* Right Column: Unified Form Surface with Mode Switcher */}
          <section className={styles.authColumn}>
            <div
              className={styles.authCard}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Trust Pill Header (as seen in reg_pc mockup) */}
              <div className="mb-4 hidden sm:flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-400/10 px-3.5 py-1.5 text-[11px] font-medium text-lime-200">
                <Sparkles className="h-3.5 w-3.5 text-lime-300" />
                Join thousands of users who trust {platform.name}
              </div>

              {/* Seamless Segmented Mode Switcher */}
              <div className={styles.segmentedWrapper}>
                <div
                  role="tablist"
                  aria-label="Authentication mode options"
                  onKeyDown={handleTabKeyDown}
                  className={styles.segmentedControl}
                >
                  <div
                    className={styles.segmentedIndicator}
                    style={{
                      transform: mode === "login" ? "translateX(0%)" : "translateX(100%)",
                    }}
                    aria-hidden="true"
                  />
                  <button
                    role="tab"
                    id={tabLoginId}
                    aria-selected={mode === "login"}
                    aria-controls={panelLoginId}
                    tabIndex={mode === "login" ? 0 : -1}
                    onClick={() => switchMode("login")}
                    className={`${styles.segmentButton} ${mode === "login" ? styles.segmentActive : ""}`}
                    type="button"
                  >
                    <LogIn className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                    <span>Sign in</span>
                  </button>
                  <button
                    role="tab"
                    id={tabRegisterId}
                    aria-selected={mode === "register"}
                    aria-controls={panelRegisterId}
                    tabIndex={mode === "register" ? 0 : -1}
                    onClick={() => switchMode("register")}
                    className={`${styles.segmentButton} ${mode === "register" ? styles.segmentActive : ""}`}
                    type="button"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                    <span>Create account</span>
                  </button>
                </div>
              </div>

              {/* Status & Error Alerts */}
              {verified && mode === "login" && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-3 text-xs text-emerald-100"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                  <div>
                    <p className="font-semibold text-emerald-200">Email verified successfully.</p>
                    <p className="mt-0.5 text-[11px] text-emerald-100/80">
                      Sign in below to continue to your workspace.
                    </p>
                  </div>
                </div>
              )}

              {csrfError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-rose-300/30 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-100"
                >
                  {csrfError}
                </div>
              )}

              {mode === "login" && (loginState?.error || initialError) && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-rose-300/30 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-100"
                >
                  {loginState?.error || initialError}
                </div>
              )}

              {mode === "login" && loginState?.success && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-lime-300/30 bg-lime-400/15 px-3.5 py-2.5 text-xs text-lime-100"
                >
                  {loginState.success}
                </div>
              )}

              {mode === "register" && registerState?.error && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-rose-300/30 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-100"
                >
                  {registerState.error}
                </div>
              )}

              {mode === "register" && registerState?.success && (
                <div
                  role="status"
                  className="mb-4 rounded-xl border border-lime-300/30 bg-lime-400/15 px-3.5 py-2.5 text-xs text-lime-100"
                >
                  {registerState.success}
                </div>
              )}

              {/* ------------------------------------------------------------
                 SIGN IN PANEL
                 ------------------------------------------------------------ */}
              {mode === "login" ? (
                <div
                  id={panelLoginId}
                  role="tabpanel"
                  aria-labelledby={tabLoginId}
                  className={`${styles.panelAnimated} ${direction === "forward" ? styles.slideForward : styles.slideBackward}`}
                >
                  <div className="mb-4">
                    <h1
                      className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[28px]"
                      style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                    >
                      Welcome back
                    </h1>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/70">
                      Sign in to manage refills, orders, and pharmacy services.
                    </p>
                  </div>

                  <form action={runLoginAction} className="flex flex-col gap-3.5">
                    <input type="hidden" name="csrfToken" value={csrfToken} />
                    <input type="hidden" name="next" value={next} />

                    <div className={styles.fieldGroup}>
                      <label htmlFor="login-email" className={styles.fieldLabel}>
                        Email address
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          id="login-email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          autoComplete="email"
                          inputMode="email"
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    <div className={styles.fieldGroup}>
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-password" className={styles.fieldLabel}>
                          Password
                        </label>
                        <Link
                          href="/forgot-password"
                          className="text-[11px] font-medium text-lime-300 hover:text-lime-200 hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          id="login-password"
                          name="password"
                          type={showLoginPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Your password"
                          required
                          autoComplete="current-password"
                          className={`${styles.textInput} ${styles.passwordInput}`}
                        />
                        <button
                          type="button"
                          aria-label={showLoginPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowLoginPassword((v) => !v)}
                          className={styles.eyeButton}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!canSubmitLogin}
                      className={`group ${styles.submitButton} mt-1`}
                    >
                      <span>
                        {loginPending
                          ? "Signing in…"
                          : !csrfToken
                            ? "Preparing secure form…"
                            : "Sign in"}
                      </span>
                      <ArrowRight
                        className="h-5 w-5 transition-transform group-hover:translate-x-1"
                        strokeWidth={2}
                      />
                    </button>

                    {/* Social SSO Buttons */}
                    <div className="my-0.5 flex items-center gap-3 text-[11px] text-white/50">
                      <span className="h-px flex-1 bg-white/12" />
                      <span>or continue with</span>
                      <span className="h-px flex-1 bg-white/12" />
                    </div>

                    <div className={styles.socialGrid}>
                      <a
                        href={
                          next
                            ? `/api/auth/google?next=${encodeURIComponent(next)}`
                            : "/api/auth/google"
                        }
                        className={styles.socialButton}
                      >
                        <GoogleMark />
                        <span>Google</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => alert("Apple Sign-In is configured via web OAuth.")}
                        className={styles.socialButton}
                      >
                        <AppleMark />
                        <span>Apple</span>
                      </button>
                    </div>

                    {/* Seamless Footer Switcher Link */}
                    <div className="pt-2 text-center text-[13px] text-white/70">
                      Don’t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("register")}
                        className="font-semibold text-lime-300 hover:text-lime-200 hover:underline"
                      >
                        Create one
                      </button>
                    </div>

                    {/* Mobile Security Trust Bar */}
                    <div className={styles.mobileTrustBar}>
                      <span className={styles.mobileTrustItem}>
                        <ShieldCheck className="h-3.5 w-3.5 text-lime-300" />
                        256-bit Encrypted
                      </span>
                      <span className="h-3 w-px bg-white/20" />
                      <span className={styles.mobileTrustItem}>
                        <Lock className="h-3.5 w-3.5 text-lime-300" />
                        HIPAA &amp; KDPA
                      </span>
                    </div>

                    {/* Demo Credentials Drawer (For showcase / testing) */}
                    {showDemoCredentials && (
                      <div className="mt-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowDemoDrawer((prev) => !prev)}
                          className="flex w-full items-center justify-between rounded-lg bg-black/25 px-3 py-1.5 text-[11px] font-medium text-white/60 hover:text-white/85"
                        >
                          <span>Quick Demo Logins</span>
                          <span className="text-[10px] text-lime-300">
                            {showDemoDrawer ? "Hide ▲" : "Fill ▼"}
                          </span>
                        </button>
                        {showDemoDrawer && (
                          <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => fillDemoAccount("jane@example.com")}
                              className="rounded-md bg-white/10 px-2 py-1.5 text-center text-white/85 hover:bg-lime-400/20 hover:text-lime-200"
                            >
                              Patient
                            </button>
                            <button
                              type="button"
                              onClick={() => fillDemoAccount("manager@afyviapharmacy.com")}
                              className="rounded-md bg-white/10 px-2 py-1.5 text-center text-white/85 hover:bg-lime-400/20 hover:text-lime-200"
                            >
                              Manager
                            </button>
                            <button
                              type="button"
                              onClick={() => fillDemoAccount("platform@afyvia.health")}
                              className="rounded-md bg-white/10 px-2 py-1.5 text-center text-white/85 hover:bg-lime-400/20 hover:text-lime-200"
                            >
                              Super Admin
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                /* ------------------------------------------------------------
                   CREATE ACCOUNT PANEL
                   ------------------------------------------------------------ */
                <div
                  id={panelRegisterId}
                  role="tabpanel"
                  aria-labelledby={tabRegisterId}
                  className={`${styles.panelAnimated} ${direction === "forward" ? styles.slideForward : styles.slideBackward}`}
                >
                  <div className="mb-4">
                    <h1
                      className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[28px]"
                      style={{ fontFamily: "var(--font-display), Georgia, serif" }}
                    >
                      Create your account
                    </h1>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/70">
                      Join {platform.name} and take control of your health.
                    </p>
                  </div>

                  <form action={runRegisterAction} className="flex flex-col gap-3.5">
                    <input type="hidden" name="csrfToken" value={csrfToken} />
                    <input type="hidden" name="next" value={next} />
                    <input type="hidden" name="fullName" value={fullName} />
                    <input type="hidden" name="dateOfBirth" value="" />

                    {/* First & Last Name Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className={styles.fieldGroup}>
                        <label htmlFor="reg-first-name" className={styles.fieldLabel}>
                          First name
                        </label>
                        <div className={styles.inputWrapper}>
                          <span className={styles.inputIcon}>
                            <User className="h-4 w-4" />
                          </span>
                          <input
                            id="reg-first-name"
                            name="firstName"
                            type="text"
                            placeholder="John"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            autoComplete="given-name"
                            className={styles.textInput}
                          />
                        </div>
                      </div>
                      <div className={styles.fieldGroup}>
                        <label htmlFor="reg-last-name" className={styles.fieldLabel}>
                          Last name
                        </label>
                        <div className={styles.inputWrapper}>
                          <span className={styles.inputIcon}>
                            <User className="h-4 w-4" />
                          </span>
                          <input
                            id="reg-last-name"
                            name="lastName"
                            type="text"
                            placeholder="Doe"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            autoComplete="family-name"
                            className={styles.textInput}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email address */}
                    <div className={styles.fieldGroup}>
                      <label htmlFor="reg-email" className={styles.fieldLabel}>
                        Email address
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          id="reg-email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                          inputMode="email"
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    {/* Phone number */}
                    <div className={styles.fieldGroup}>
                      <label htmlFor="reg-phone" className={styles.fieldLabel}>
                        Phone number
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Phone className="h-4 w-4" />
                        </span>
                        <input
                          id="reg-phone"
                          name="phone"
                          type="tel"
                          placeholder="+254 712 345 678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          autoComplete="tel"
                          inputMode="tel"
                          className={styles.textInput}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className={styles.fieldGroup}>
                      <label htmlFor="reg-password" className={styles.fieldLabel}>
                        Password
                      </label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.inputIcon}>
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          id="reg-password"
                          name="password"
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          autoComplete="new-password"
                          className={`${styles.textInput} ${styles.passwordInput}`}
                        />
                        <button
                          type="button"
                          aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowRegisterPassword((v) => !v)}
                          className={styles.eyeButton}
                        >
                          {showRegisterPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Password Strength Meter */}
                      <div className="mt-2 flex items-center gap-1.5" aria-live="polite">
                        {Array.from({ length: 5 }, (_, index) => (
                          <span
                            key={index}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              index < filledSegments
                                ? pwCheck.score < 0.4
                                  ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]"
                                  : pwCheck.score < 0.8
                                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                    : "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.5)]"
                                : "bg-white/15"
                            }`}
                          />
                        ))}
                        <span className="ml-2 shrink-0 text-[10px] font-semibold text-lime-300">
                          {registerPassword.length === 0
                            ? "Enter password"
                            : pwCheck.score < 0.4
                              ? "Weak"
                              : pwCheck.score < 0.8
                                ? "Fair"
                                : pwCheck.score < 1
                                  ? "Good"
                                  : "Strong"}
                        </span>
                      </div>

                      {/* Password Requirements Checklist (matching mockup) */}
                      <ul className="mt-2 space-y-1 text-[11px] text-white/70">
                        {[
                          {
                            id: "length",
                            label: "At least 8 characters",
                            met: registerPassword.length >= 8,
                          },
                          {
                            id: "number",
                            label: "Include a number",
                            met: /\d/.test(registerPassword),
                          },
                          {
                            id: "uppercase",
                            label: "Include an uppercase letter",
                            met: /[A-Z]/.test(registerPassword),
                          },
                        ].map((rule) => (
                          <li key={rule.id} className="flex items-center gap-2">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                                rule.met
                                  ? "bg-lime-300 text-[#143310] shadow-[0_0_8px_rgba(163,230,53,0.4)]"
                                  : "bg-white/12 text-white/20"
                              }`}
                            >
                              {rule.met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                            </span>
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Confirm Password */}
                    <div className={styles.fieldGroup}>
                      <label htmlFor="reg-confirm" className={styles.fieldLabel}>
                        Confirm password
                      </label>
                      <div className={styles.inputWrapper}>
                        <span
                          className={`${styles.inputIcon} ${confirmMismatch ? "text-rose-300" : ""}`}
                        >
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          id="reg-confirm"
                          name="confirm"
                          type={showRegisterConfirm ? "text" : "password"}
                          placeholder="Re-enter your password"
                          value={registerConfirm}
                          onChange={(e) => setRegisterConfirm(e.target.value)}
                          autoComplete="new-password"
                          className={`${styles.textInput} ${styles.passwordInput} ${
                            confirmMismatch ? "border-rose-400/60 focus:border-rose-300" : ""
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={showRegisterConfirm ? "Hide password" : "Show password"}
                          onClick={() => setShowRegisterConfirm((v) => !v)}
                          className={styles.eyeButton}
                        >
                          {showRegisterConfirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {confirmMismatch && (
                        <p className="mt-1 text-[11px] font-medium text-rose-200">
                          Passwords do not match.
                        </p>
                      )}
                    </div>

                    {/* Terms Agreement Checkbox */}
                    <label className="flex items-start gap-2.5 text-[11px] leading-[1.5] text-white/75 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 appearance-none rounded border border-white/25 bg-black/25 checked:border-lime-300 checked:bg-lime-400 checked:shadow-[0_0_10px_rgba(163,230,53,0.4)] focus:outline-none focus:ring-2 focus:ring-lime-300/30 cursor-pointer transition-all"
                      />
                      <span>
                        I agree to the{" "}
                        <Link
                          href="/terms"
                          className="font-medium text-lime-300 hover:text-lime-200 hover:underline"
                        >
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/privacy"
                          className="font-medium text-lime-300 hover:text-lime-200 hover:underline"
                        >
                          Privacy Policy
                        </Link>
                      </span>
                    </label>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={!canSubmitRegister}
                      className={`group ${styles.submitButton} mt-1`}
                    >
                      <span>
                        {registerPending
                          ? "Creating account…"
                          : !csrfToken
                            ? "Preparing secure form…"
                            : "Create account"}
                      </span>
                      <ArrowRight
                        className="h-5 w-5 transition-transform group-hover:translate-x-1"
                        strokeWidth={2}
                      />
                    </button>

                    {/* Social SSO Buttons */}
                    <div className="my-0.5 flex items-center gap-3 text-[11px] text-white/50">
                      <span className="h-px flex-1 bg-white/12" />
                      <span>or sign up with</span>
                      <span className="h-px flex-1 bg-white/12" />
                    </div>

                    <div className={styles.socialGrid}>
                      <a
                        href={
                          next
                            ? `/api/auth/google?next=${encodeURIComponent(next)}`
                            : "/api/auth/google"
                        }
                        className={styles.socialButton}
                      >
                        <GoogleMark />
                        <span>Google</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => alert("Apple Sign-In is configured via web OAuth.")}
                        className={styles.socialButton}
                      >
                        <AppleMark />
                        <span>Apple</span>
                      </button>
                    </div>

                    {/* Footer Switcher Link */}
                    <div className="pt-2 text-center text-[13px] text-white/70">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="font-semibold text-lime-300 hover:text-lime-200 hover:underline"
                      >
                        Sign in
                      </button>
                    </div>

                    {/* Mobile Security Trust Bar */}
                    <div className={styles.mobileTrustBar}>
                      <span className={styles.mobileTrustItem}>
                        <ShieldCheck className="h-3.5 w-3.5 text-lime-300" />
                        256-bit Encrypted
                      </span>
                      <span className="h-3 w-px bg-white/20" />
                      <span className={styles.mobileTrustItem}>
                        <Lock className="h-3.5 w-3.5 text-lime-300" />
                        HIPAA &amp; KDPA
                      </span>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
