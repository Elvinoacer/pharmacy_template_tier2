"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmMfaAction, verifyStepUpAction, type MfaState } from "@/app/actions/mfa";
import LocalQrCode from "@/app/platform/_components/LocalQrCode";

export default function MfaEnrollForm({
  startAction,
  enabled = false,
  verified = false,
  continueHref = "/platform",
  continueLabel = "Continue to platform overview",
}: {
  startAction: () => Promise<MfaState>;
  enabled?: boolean;
  verified?: boolean;
  continueHref?: string;
  continueLabel?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<MfaState>({});
  const [pending, setPending] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);
  const [complete, setComplete] = useState(false);

  async function run(action: () => Promise<MfaState>, finishing = false) {
    setPending(true);
    try {
      const result = await action();
      setState((previous) => ({ ...previous, error: undefined, success: undefined, ...result }));
      if (finishing && result.success) {
        setComplete(true);
        router.refresh();
      }
    } catch {
      setState((previous) => ({
        ...previous,
        error: "Could not complete this step. Please try again.",
      }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 max-w-2xl space-y-4 text-sm">
      <p className="leading-6 text-[#4f6056] dark:text-teal-50/80">
        {enabled
          ? verified
            ? "Two-step verification is enabled. Enter a fresh code before a sensitive action."
            : "Enter the code from your authenticator to finish signing in on this device."
          : "Protect your admin account in three steps. You’ll need an authenticator app on your phone."}
      </p>

      {!enabled && !state.secret && !complete ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(startAction)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200 sm:w-auto"
        >
          {pending ? "Preparing QR code…" : "Set up authenticator"}
        </button>
      ) : null}

      {!complete && (enabled || state.secret) ? (
        <div className="space-y-5 rounded-2xl border border-[#dce7e1] bg-[#fbfdfb] p-4 dark:border-teal-200/20 dark:bg-black/15 sm:p-5">
          {!enabled ? (
            <>
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-700 dark:text-teal-200/65">Step 1</p>
                <h3 className="mt-1 font-semibold text-[#17231d] dark:text-white">Scan the QR code</h3>
                <p className="mt-1 leading-6 text-[#627168] dark:text-teal-50/75">
                  Open your authenticator app, choose add account, then scan this code. The QR is generated locally in your browser; the setup secret is not sent to a QR service.
                </p>

                {state.otpauth ? (
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="w-fit rounded-2xl border border-[#dce7e1] bg-white p-2 shadow-sm dark:border-white/10">
                      <LocalQrCode value={state.otpauth} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-xs leading-5 text-[#627168] dark:text-teal-50/70">
                        Google Authenticator, Microsoft Authenticator, 1Password and other TOTP apps can scan this code.
                      </p>
                      <a
                        className="inline-flex min-h-10 items-center rounded-lg text-xs font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-200"
                        href={state.otpauth}
                      >
                        Open in authenticator on this device
                      </a>
                    </div>
                  </div>
                ) : null}

                <details className="mt-4 rounded-xl border border-[#dce7e1] bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.025]">
                  <summary className="cursor-pointer font-semibold text-[#304139] dark:text-teal-50/90">
                    Can’t scan the QR code?
                  </summary>
                  <p className="mt-3 leading-6 text-[#627168] dark:text-teal-50/75">
                    Choose “Enter a setup key” in your authenticator, select time-based codes, then enter this key manually.
                  </p>
                  <code className="mt-3 block select-all break-all rounded-xl border border-[#dce7e1] bg-white p-3 text-sm font-semibold tracking-wider text-[#17231d] shadow-inner dark:border-white/10 dark:bg-black/30 dark:text-white sm:text-base">
                    {state.secret}
                  </code>
                </details>
              </section>

              <section className="border-t border-[#e5ece7] pt-5 dark:border-white/10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-700 dark:text-teal-200/65">Step 2</p>
                <h3 className="mt-1 font-semibold text-[#17231d] dark:text-white">Save your recovery codes</h3>
                <p className="mt-1 leading-6 text-[#627168] dark:text-teal-50/75">
                  Keep these somewhere private. Each code works once if you lose access to your phone.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-[#dce7e1] bg-white p-3 font-mono text-xs text-[#26352d] dark:border-white/10 dark:bg-black/30 dark:text-teal-50 sm:grid-cols-2 sm:text-sm">
                  {state.recoveryCodes?.map((code) => (
                    <span key={code} className="break-all rounded-lg bg-[#f5f8f6] px-2 py-1.5 dark:bg-white/5">
                      {code}
                    </span>
                  ))}
                </div>
                <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm font-medium text-[#304139] dark:text-teal-50/90">
                  <input
                    type="checkbox"
                    checked={savedCodes}
                    onChange={(event) => setSavedCodes(event.target.checked)}
                    className="h-4 w-4 accent-teal-700"
                  />
                  I saved my recovery codes
                </label>
              </section>
            </>
          ) : null}

          <form
            className={`${!enabled ? "border-t border-[#e5ece7] pt-5 dark:border-white/10" : ""} space-y-3`}
            action={(formData) =>
              run(() => (enabled ? verifyStepUpAction({}, formData) : confirmMfaAction({}, formData)), true)
            }
          >
            <div>
              {!enabled ? (
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-700 dark:text-teal-200/65">Step 3</p>
              ) : null}
              <label htmlFor="mfa-code" className="mt-1 block font-semibold text-[#17231d] dark:text-white">
                {enabled ? "Authenticator or recovery code" : "Enter the six-digit code"}
              </label>
            </div>
            <input
              id="mfa-code"
              name="code"
              autoComplete="one-time-code"
              inputMode={enabled ? "text" : "numeric"}
              required
              pattern={enabled ? "[0-9a-fA-F ]{6,12}" : "[0-9 ]{6,8}"}
              maxLength={12}
              placeholder={enabled ? "Code from your app" : "123456"}
              className="min-h-11 w-full rounded-xl border border-[#cfdcd4] bg-white px-3 text-base text-[#17231d] outline-none transition placeholder:text-[#929d97] focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-teal-200/30 dark:bg-black/30 dark:text-white dark:placeholder:text-teal-100/35 dark:focus:border-teal-300/50 dark:focus:ring-teal-300/10 sm:max-w-xs"
            />
            <button
              disabled={pending || (!enabled && !savedCodes)}
              className="block min-h-11 w-full rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-300 dark:text-teal-950 dark:hover:bg-teal-200 sm:w-auto"
            >
              {pending ? "Checking code…" : enabled ? "Verify and continue" : "Enable two-step verification"}
            </button>
          </form>
        </div>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-300/30 dark:bg-rose-300/10 dark:text-rose-100"
        >
          {state.error}
        </p>
      ) : null}

      {complete ? (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-teal-200/30 dark:bg-teal-300/5 dark:text-teal-50"
        >
          <p>{state.success}</p>
          <Link
            href={continueHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white dark:bg-teal-300 dark:text-teal-950 sm:w-auto"
          >
            {continueLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
