/**
 * Shared password policy for registration, reset, and live UI feedback.
 * Demo seed password `Password123!` satisfies every rule.
 */

export type PasswordRuleId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "minLength",
    label: "At least 8 characters",
    test: (p) => p.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "One number",
    test: (p) => /\d/.test(p),
  },
  {
    id: "special",
    label: "One special character (!@#$…)",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export type PasswordCheckResult = {
  ok: boolean;
  passed: number;
  total: number;
  score: number; // 0–1
  rules: Array<{ id: PasswordRuleId; label: string; met: boolean }>;
  message?: string;
};

export function evaluatePassword(password: string): PasswordCheckResult {
  const rules = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
  const passed = rules.filter((r) => r.met).length;
  const total = rules.length;
  const ok = passed === total;
  return {
    ok,
    passed,
    total,
    score: total === 0 ? 0 : passed / total,
    rules,
    message: ok
      ? undefined
      : `Password must include: ${rules
          .filter((r) => !r.met)
          .map((r) => r.label.toLowerCase())
          .join(", ")}.`,
  };
}

export function validatePassword(password: string): string | null {
  const result = evaluatePassword(password);
  return result.ok ? null : result.message ?? "Password does not meet requirements.";
}
