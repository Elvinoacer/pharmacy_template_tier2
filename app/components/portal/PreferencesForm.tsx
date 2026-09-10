"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/portal";
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Bell,
  Megaphone,
  Cake,
  Check,
  AlertCircle,
  Save,
} from "lucide-react";

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

  const rows: {
    name: keyof typeof prefs;
    label: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }[] = [
    {
      name: "emailEnabled",
      label: "Email",
      hint: "Account, refill and service emails",
      icon: Mail,
      accent: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    },
    {
      name: "smsEnabled",
      label: "SMS",
      hint: "Text messages to your phone",
      icon: MessageSquare,
      accent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    {
      name: "whatsappEnabled",
      label: "WhatsApp",
      hint: "WhatsApp Business messages",
      icon: MessageCircle,
      accent: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    },
    {
      name: "reminderConsent",
      label: "Refill & pickup reminders",
      hint: "Scheduled reminders so you never miss a dose",
      icon: Bell,
      accent: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    {
      name: "marketingConsent",
      label: "Marketing campaigns",
      hint: "Promotions, health tips and offers (opt-in)",
      icon: Megaphone,
      accent: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    },
    {
      name: "birthdayMessages",
      label: "Birthday greeting",
      hint: "Optional personalised annual message",
      icon: Cake,
      accent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    },
  ];

  return (
    <form action={formAction} className="min-w-0 space-y-3">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{state.success}</span>
        </div>
      )}

      <ul className="space-y-2.5">
        {rows.map((r) => {
          const Icon = r.icon;
          const checked = prefs[r.name];
          return (
            <li key={r.name} className="min-w-0">
              <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-[#e3ebe6] bg-white p-3 transition hover:border-[#0d6e5a]/30 dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-teal-400/30 sm:p-3.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${r.accent}`}>
                  <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-[#0c1a14] dark:text-slate-100">{r.label}</p>
                  <p className="mt-0.5 break-words text-[11px] leading-snug text-[#5a6b62] dark:text-slate-400 sm:text-xs">{r.hint}</p>
                </div>
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                  <input
                    type="checkbox"
                    name={r.name}
                    defaultChecked={checked}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#0d6e5a] peer-focus-visible:ring-2 peer-focus-visible:ring-[#2dd4bf] peer-focus-visible:ring-offset-2 dark:bg-slate-700 dark:peer-focus-visible:ring-offset-slate-950" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <button type="submit" disabled={pending} className="btn-primary w-full min-h-11 disabled:opacity-60">
        {pending ? (
          <>
            <span className="typing-dot" /> Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" /> Save preferences
          </>
        )}
      </button>
    </form>
  );
}
