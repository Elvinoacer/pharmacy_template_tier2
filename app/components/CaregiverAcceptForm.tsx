"use client";

import { useActionState } from "react";
import { acceptCaregiverInviteAction, type CaregiverActionState } from "@/app/actions/caregiver";
import { AlertCircle, Check, KeyRound, User } from "lucide-react";

export function CaregiverAcceptForm({
  token,
  defaultName,
  email,
}: {
  token: string;
  defaultName: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(
    acceptCaregiverInviteAction,
    {} as CaregiverActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#5a6b62]">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full rounded-xl border border-[#e3ebe6] bg-[#f4f7f4] px-3 py-2.5 text-sm text-[#5a6b62]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#5a6b62]">Your name</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
          <input
            name="fullName"
            defaultValue={defaultName}
            required
            className="w-full rounded-xl border border-[#e3ebe6] bg-white py-2.5 pl-9 pr-3 text-sm text-[#0c1a14] focus:border-[#0d6e5a] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#5a6b62]">Phone (optional)</label>
        <input
          name="phone"
          type="tel"
          placeholder="+254 7XX XXX XXX"
          className="w-full rounded-xl border border-[#e3ebe6] bg-white px-3 py-2.5 text-sm text-[#0c1a14] focus:border-[#0d6e5a] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-[#5a6b62]">Create a password</label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full rounded-xl border border-[#e3ebe6] bg-white py-2.5 pl-9 pr-3 text-sm text-[#0c1a14] focus:border-[#0d6e5a] focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#0d6e5a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#084c3f] disabled:opacity-60"
      >
        {pending ? "Setting up…" : "Accept & create account"}
      </button>
    </form>
  );
}
