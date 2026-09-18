"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Edit2,
  Loader2,
  Mail,
  RefreshCw,
  Send,
} from "lucide-react";
import { changeOwnerEmailAction, type OnboardState } from "@/app/actions/onboard";
import { resendOwnerVerificationEmailAction, type VerificationActionState } from "@/app/actions/pharmacy-verification";
import type { PharmacyOnboardingSnapshot } from "@/app/lib/services/pharmacy-onboarding-journey";
import styles from "@/app/components/onboard/OnboardSurface.module.css";
import polish from "@/app/components/onboard/OnboardFormPolish.module.css";

const RESEND_COOLDOWN_SECONDS = 60;

export function EmailVerificationStep({
  snapshot,
}: {
  snapshot: PharmacyOnboardingSnapshot;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const ownerEmail = snapshot.user?.email || "";
  const [verifiedSuccess, setVerifiedSuccess] = useState(Boolean(snapshot.user?.emailVerified));
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [checking, setChecking] = useState(false);

  const [resendState, resendAction, resendPending] = useActionState(
    resendOwnerVerificationEmailAction,
    {} as VerificationActionState,
  );
  const [changeState, changeAction, changePending] = useActionState(
    changeOwnerEmailAction,
    {} as OnboardState,
  );

  // Cooldown timer for resending
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Reset cooldown on resend success
  useEffect(() => {
    if (resendState.success) {
      const id = requestAnimationFrame(() => {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [resendState.success]);

  // Reset change email form on success
  useEffect(() => {
    if (changeState.success) {
      const id = requestAnimationFrame(() => {
        setShowChangeEmail(false);
        setNewEmail("");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [changeState.success]);

  // Polling for email verification status (detects clicks in other tabs/windows)
  useEffect(() => {
    if (verifiedSuccess) return;

    let active = true;

    const checkVerification = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        setChecking(true);
        const res = await fetch("/api/onboard/email-status", { cache: "no-store" });
        if (!active) return;
        const data = await res.json().catch(() => null);
        if (data?.verified) {
          setVerifiedSuccess(true);
          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        // Silently ignore network hiccups during polling
      } finally {
        if (active) setChecking(false);
      }
    };

    const interval = window.setInterval(checkVerification, 2800);
    const onFocus = () => void checkVerification();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [verifiedSuccess, router]);

  const handleManualCheck = () => {
    setChecking(true);
    fetch("/api/onboard/email-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.verified) {
          setVerifiedSuccess(true);
          router.refresh();
        }
      })
      .finally(() => setChecking(false));
  };

  return (
    <div className={`${styles.form} ${polish.wizardShell}`}>
      <div className={polish.topline}>
        <span className={polish.stepPill}>Step 2 · Verify Owner Email</span>
        <span className={polish.securePill}>
          <Mail className="h-3.5 w-3.5" aria-hidden /> Security Check
        </span>
      </div>

      <header className={`${styles.formHead} ${polish.heading}`}>
        <h2>Check your inbox</h2>
        <p>
          We sent a verification button to <strong>{ownerEmail}</strong>. It can open in this tab, a new tab, another browser, or another device.
        </p>
      </header>

      {/* Verified banner */}
      {verifiedSuccess ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center transition-all animate-in fade-in"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
            Email verified ✓
          </h3>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-200">
            Advancing your application to premises and contact details...
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="btn-primary inline-flex items-center gap-2 justify-center px-6"
            >
              Continue to pharmacy details <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className={polish.contentStack}>
          {/* Waiting card */}
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300">
                <Clock3 className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Waiting for verification
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                  Open the verification email sent to <strong>{ownerEmail}</strong> and tap “Verify email address”. Verification is tied to your account, not this tab. This page checks automatically and will advance when you return—even if you verified in another browser or on another device.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualCheck}
                    disabled={checking}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
                    {checking ? "Checking..." : "I've verified my email"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Feedback messages */}
          {resendState.error ? (
            <p className={`${styles.alert} ${styles.alertError}`} role="alert">
              {resendState.error}
            </p>
          ) : null}
          {resendState.success ? (
            <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {resendState.success}
            </p>
          ) : null}
          {changeState.error ? (
            <p className={`${styles.alert} ${styles.alertError}`} role="alert">
              {changeState.error}
            </p>
          ) : null}
          {changeState.success ? (
            <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {changeState.success}
            </p>
          ) : null}

          {/* Secondary Actions: Resend & Change email */}
          <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] p-4">
            <p className="text-xs font-semibold text-[var(--muted)] mb-3">
              Didn’t receive the email? Check your spam/junk folder or use the options below:
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <form action={resendAction}>
                <button
                  type="submit"
                  disabled={cooldown > 0 || resendPending}
                  className="btn-ghost text-xs inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-[var(--line-2)] disabled:opacity-50"
                >
                  {resendPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend verification email"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowChangeEmail(!showChangeEmail)}
                className="btn-ghost text-xs inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-[var(--line-2)]"
              >
                <Edit2 className="h-3.5 w-3.5" />
                {showChangeEmail ? "Cancel change" : "Change email address"}
              </button>
            </div>

            {showChangeEmail ? (
              <form action={changeAction} className="mt-4 pt-3 border-t border-[var(--line-2)]">
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  New work email address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    name="newEmail"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="new-email@pharmacy.co.ke"
                    className="input-admin flex-1 min-h-10 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={changePending || !newEmail.trim()}
                    className="btn-primary min-h-10 px-4 text-xs font-semibold shrink-0"
                  >
                    {changePending ? "Updating…" : "Update & send link"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
