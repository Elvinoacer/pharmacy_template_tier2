"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/portal";

export default function PreferencesForm({
  action,
  prefs,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  prefs: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
    marketingConsent: boolean;
    reminderConsent: boolean;
    birthdayMessages: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  const rows: { name: keyof typeof prefs; label: string; hint: string }[] = [
    { name: "emailEnabled", label: "Email", hint: "Account and service emails" },
    { name: "smsEnabled", label: "SMS", hint: "Text messages" },
    { name: "whatsappEnabled", label: "WhatsApp", hint: "WhatsApp Business messages" },
    { name: "reminderConsent", label: "Reminders", hint: "Refill, pickup, and follow-up reminders" },
    { name: "marketingConsent", label: "Marketing", hint: "Campaigns and promotions (opt-in)" },
    { name: "birthdayMessages", label: "Birthday messages", hint: "Optional seasonal greetings" },
  ];

  return (
    <form action={formAction} className="space-y-3">
      {state?.success && <p className="text-sm text-teal-700">{state.success}</p>}
      {rows.map((r) => (
        <label
          key={r.name}
          className="flex items-start justify-between gap-4 rounded-2xl border border-teal-900/8 px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-[#0c1a14]">{r.label}</span>
            <span className="block text-xs text-[#5a6b62]">{r.hint}</span>
          </span>
          <input type="checkbox" name={r.name} defaultChecked={prefs[r.name]} className="mt-1 h-4 w-4" />
        </label>
      ))}
      <button type="submit" disabled={pending} className="btn-primary !py-2.5 text-sm disabled:opacity-60">
        {pending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
