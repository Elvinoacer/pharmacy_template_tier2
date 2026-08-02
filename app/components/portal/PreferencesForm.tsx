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
      accent: "bg-blue-100 text-blue-700",
    },
    {
      name: "smsEnabled",
      label: "SMS",
      hint: "Text messages to your phone",
      icon: MessageSquare,
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      name: "whatsappEnabled",
      label: "WhatsApp",
      hint: "WhatsApp Business messages",
      icon: MessageCircle,
      accent: "bg-green-100 text-green-700",
    },
    {
      name: "reminderConsent",
      label: "Refill & pickup reminders",
      hint: "Scheduled reminders so you never miss a dose",
      icon: Bell,
      accent: "bg-amber-100 text-amber-700",
    },
    {
      name: "marketingConsent",
      label: "Marketing campaigns",
      hint: "Promotions, health tips and offers (opt-in)",
      icon: Megaphone,
      accent: "bg-fuchsia-100 text-fuchsia-700",
    },
    {
      name: "birthdayMessages",
      label: "Birthday greeting",
      hint: "Optional personalised annual message",
      icon: Cake,
      accent: "bg-rose-100 text-rose-700",
    },
  ];

  return (
    <form action={formAction} className="space-y-3">
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

      <ul className="space-y-2.5">
        {rows.map((r) => {
          const Icon = r.icon;
          const checked = prefs[r.name];
          return (
            <li key={r.name}>
              <label
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e3ebe6] bg-white p-3 transition hover:border-[#0d6e5a]/30"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0c1a14]">{r.label}</p>
                  <p className="text-xs text-[#5a6b62]">{r.hint}</p>
                </div>
                {/* Toggle switch */}
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                  <input
                    type="checkbox"
                    name={r.name}
                    defaultChecked={checked}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#0d6e5a] peer-focus-visible:ring-2 peer-focus-visible:ring-[#2dd4bf] peer-focus-visible:ring-offset-2" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full disabled:opacity-60"
      >
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
