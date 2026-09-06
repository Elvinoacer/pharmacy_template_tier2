"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmMfaAction, verifyStepUpAction, type MfaState } from "@/app/actions/mfa";

export default function MfaEnrollForm({ startAction, enabled = false, verified = false }: {
  startAction: () => Promise<MfaState>;
  enabled?: boolean;
  verified?: boolean;
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
      // Keep the setup key and recovery codes visible if a code needs retrying.
      setState(previous => ({ ...previous, error: undefined, success: undefined, ...result }));
      if (finishing && result.success) {
        setComplete(true);
        router.refresh();
      }
    } catch {
      setState(previous => ({ ...previous, error: "Could not complete this step. Please try again." }));
    } finally {
      setPending(false);
    }
  }

  return <div className="mt-4 max-w-2xl space-y-4 text-sm">
    <p className="text-teal-50/85">{enabled
      ? verified ? "Two-step verification is enabled. Enter a fresh code before a sensitive action." : "Enter the code from your authenticator to finish signing in on this device."
      : "Protect your admin account in three steps. You’ll need an authenticator app on your phone."}</p>
    {!enabled && !state.secret && !complete && <button type="button" disabled={pending} onClick={() => run(startAction)} className="min-h-11 rounded-xl bg-teal-300 px-4 py-2 font-semibold text-teal-950 disabled:opacity-50">{pending ? "Preparing setup…" : "Set up authenticator"}</button>}
    {!complete && (enabled || state.secret) && <div className="space-y-5 rounded-xl border border-teal-200/20 p-4 sm:p-5">
      {!enabled && <>
        <div><h3 className="font-semibold">1. Add Aether to your authenticator</h3><p className="mt-1 text-teal-50/80">Choose “Enter a setup key”, select time-based codes, and copy this key:</p><code className="mt-3 block break-all rounded-lg bg-black/30 p-3 text-base tracking-wider text-white">{state.secret}</code>{state.otpauth && <a className="mt-2 inline-block underline" href={state.otpauth}>Open in authenticator on this device</a>}</div>
        <div><h3 className="font-semibold">2. Save your recovery codes</h3><p className="mt-1 text-teal-50/80">Keep these somewhere private. Each code works once if you lose access to your phone.</p><div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-black/30 p-3 font-mono">{state.recoveryCodes?.map(code => <span key={code}>{code}</span>)}</div><label className="mt-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={savedCodes} onChange={event => setSavedCodes(event.target.checked)} className="h-4 w-4" />I saved my recovery codes</label></div>
      </>}
      <form className="space-y-3" action={fd => run(() => enabled ? verifyStepUpAction({}, fd) : confirmMfaAction({}, fd), true)}>
        <label htmlFor="mfa-code" className="block font-semibold">{enabled ? "Authenticator or recovery code" : "3. Enter the six-digit code"}</label>
        <input id="mfa-code" name="code" autoComplete="one-time-code" inputMode={enabled ? "text" : "numeric"} required pattern={enabled ? "[0-9a-fA-F ]{6,12}" : "[0-9 ]{6,8}"} maxLength={12} placeholder={enabled ? "Code from your app" : "123456"} className="min-h-11 w-full rounded-xl border border-teal-200/30 bg-black/30 px-3 text-base text-white sm:max-w-xs" />
        <button disabled={pending || (!enabled && !savedCodes)} className="block min-h-11 rounded-xl bg-teal-300 px-4 py-2 font-semibold text-teal-950 disabled:opacity-50">{pending ? "Checking code…" : enabled ? "Verify and continue" : "Enable two-step verification"}</button>
      </form>
    </div>}
    {state.error && <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-rose-100">{state.error}</p>}
    {complete && <div role="status" className="space-y-3 rounded-xl border border-teal-200/30 p-4"><p>{state.success}</p><Link href="/platform" className="inline-flex min-h-11 items-center rounded-xl bg-teal-300 px-4 font-semibold text-teal-950">Continue to platform overview</Link></div>}
  </div>;
}
