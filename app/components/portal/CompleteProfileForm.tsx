"use client";

import { useActionState } from "react";
import { completeOnboardingAction, type ActionState } from "@/app/actions/portal";

export default function CompleteProfileForm({ fullName, phone, next }: { fullName: string; phone: string | null; next: string }) {
  const [state, action, pending] = useActionState(completeOnboardingAction, {} as ActionState);
  return <form action={action} className="mt-6 space-y-5">
    <input type="hidden" name="next" value={next} />
    {state.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p>}
    <div><label htmlFor="fullName" className="mb-2 block text-sm font-semibold">Your name <span className="text-[#5a6b62]">(required)</span></label><input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" required maxLength={120} className="min-h-12 w-full rounded-xl border border-[#cfe4da] bg-white px-3 text-base outline-offset-2 focus:outline-[#0d6e5a]" /></div>
    <div><label htmlFor="phone" className="mb-2 block text-sm font-semibold">Phone number <span className="text-[#5a6b62]">(optional)</span></label><input id="phone" name="phone" defaultValue={phone || ""} type="tel" autoComplete="tel" maxLength={30} aria-describedby="phone-help" placeholder="e.g. 0712 345 678" className="min-h-12 w-full rounded-xl border border-[#cfe4da] bg-white px-3 text-base outline-offset-2 focus:outline-[#0d6e5a]" /><p id="phone-help" className="mt-2 text-sm text-[#5a6b62]">Add a number your pharmacy can use to contact you about your care.</p></div>
    <button disabled={pending} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0d6e5a] px-5 font-semibold text-white hover:bg-[#084c3f] disabled:opacity-60">{pending ? "Saving your profile…" : "Save and continue"}</button>
  </form>;
}
