"use client";

import { useId, useMemo, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { evaluatePassword, type PasswordCheckResult } from "@/app/lib/password";

type Props = {
  label: string;
  name: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  /** Show live requirement checklist (register / reset). */
  showRequirements?: boolean;
  /** When set, live-compares this field's value against the original password. */
  matchValue?: string;
  onValueChange?: (value: string, check: PasswordCheckResult) => void;
  className?: string;
};

function strengthMeta(score: number, hasInput: boolean) {
  if (!hasInput) {
    return { label: "Enter a password", bar: "bg-teal-900/10", text: "text-[var(--muted)]" };
  }
  if (score < 0.4) {
    return { label: "Weak", bar: "bg-rose-500", text: "text-rose-700" };
  }
  if (score < 0.8) {
    return { label: "Fair", bar: "bg-amber-500", text: "text-amber-700" };
  }
  if (score < 1) {
    return { label: "Good", bar: "bg-sky-500", text: "text-sky-700" };
  }
  return { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-700" };
}

export default function PasswordField({
  label,
  name,
  required,
  autoComplete = "current-password",
  placeholder,
  showRequirements = false,
  matchValue,
  onValueChange,
  className,
}: Props) {
  const id = useId();
  const listId = `${id}-reqs`;
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);

  const check = useMemo(() => evaluatePassword(value), [value]);
  const strength = strengthMeta(check.score, value.length > 0);
  const mismatch =
    typeof matchValue === "string" && matchValue.length > 0 && value.length > 0 && value !== matchValue;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
        {label}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          aria-describedby={showRequirements ? listId : undefined}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            onValueChange?.(next, evaluatePassword(next));
          }}
          className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] text-[var(--foreground)] px-4 py-3 pr-12 text-sm outline-none ring-[var(--brand)]/20 transition focus:ring-2"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--foreground)]"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showRequirements && (
        <div id={listId} className="mt-3 space-y-2.5" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-teal-900/8">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.bar}`}
                style={{ width: `${Math.max(value ? 12 : 0, check.score * 100)}%` }}
              />
            </div>
            <span className={`text-[11px] font-semibold tabular-nums ${strength.text}`}>
              {strength.label}
              {value ? ` · ${check.passed}/${check.total}` : ""}
            </span>
          </div>

          <ul className="grid gap-1.5 sm:grid-cols-2">
            {check.rules.map((rule) => (
              <li
                key={rule.id}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition ${
                  rule.met
                    ? "bg-emerald-50 text-emerald-800"
                    : value
                      ? "bg-rose-50/70 text-rose-700"
                      : "bg-[var(--surface-sunken)] text-[var(--muted)]"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    rule.met ? "bg-emerald-500 text-white" : "bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]"
                  }`}
                >
                  {rule.met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" />}
                </span>
                <span className="font-medium">{rule.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {typeof matchValue === "string" && matchValue.length > 0 && value.length > 0 && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
            mismatch ? "text-rose-700" : "text-emerald-700"
          }`}
          aria-live="polite"
        >
          {mismatch ? (
            <>
              <X className="h-3.5 w-3.5" />
              Passwords do not match
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Passwords match
            </>
          )}
        </p>
      )}
    </div>
  );
}
