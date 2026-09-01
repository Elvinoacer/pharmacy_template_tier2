"use client";

import { useState } from "react";
import { confirmMfaAction, type MfaState } from "@/app/actions/mfa";

export default function MfaEnrollForm({
  startAction,
}: {
  startAction: () => Promise<MfaState>;
}) {
  const [state, setState] = useState<MfaState>({});
  const [pending, setPending] = useState(false);

  return (
    <div className="mt-4 space-y-3 text-sm">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setState(await startAction());
          setPending(false);
        }}
        className="rounded-xl bg-teal-300/20 px-4 py-2 font-semibold text-teal-50 hover:bg-teal-300/30"
      >
        {pending ? "Generating…" : "Start MFA enrollment"}
      </button>
      {state.secret ? (
        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-xs text-teal-100/70">Secret</p>
          <p className="font-mono text-sm">{state.secret}</p>
          {state.otpauth ? <p className="mt-2 break-all text-xs text-teal-100/60">{state.otpauth}</p> : null}
          {state.recoveryCodes?.length ? (
            <p className="mt-2 text-xs">Recovery codes: {state.recoveryCodes.join("  ")}</p>
          ) : null}
          <form
            className="mt-3 flex gap-2"
            action={async (fd) => setState(await confirmMfaAction(state, fd))}
          >
            <input name="code" inputMode="numeric" placeholder="123456" className="h-10 rounded-xl border border-white/20 bg-black/30 px-3 text-sm" />
            <button className="h-10 rounded-xl bg-white/10 px-4 font-semibold">Confirm</button>
          </form>
        </div>
      ) : null}
      {state.error ? <p className="text-rose-200">{state.error}</p> : null}
      {state.success ? <p className="text-emerald-200">{state.success}</p> : null}
    </div>
  );
}
