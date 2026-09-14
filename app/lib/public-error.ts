const FRIENDLY_ERROR_CODES: Record<string, string> = {
  STEP_UP_REQUIRED: "Please verify your identity again to continue.",
  MFA_REQUIRED: "Please complete two-factor authentication to continue.",
  PHARMACY_BILLING_SUSPENDED: "This pharmacy workspace is paused because billing needs attention.",
  PHARMACY_WORKSPACE_PAUSED: "This pharmacy workspace is currently paused. Restore access before continuing.",
  TENANT_REQUIRED: "Choose a pharmacy workspace and try again.",
  UNAUTHORIZED: "Please sign in and try again.",
  FORBIDDEN: "You do not have permission to do that.",
};

const INTERNAL_ERROR_PATTERN = /(?:\bP\d{4}\b|Prisma|SQLSTATE|postgres|database|constraint|foreign key|unique constraint|relation .* does not exist|column .* does not exist|ECONN(?:REFUSED|RESET|ABORTED)|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EPIPE|NEXT_REDIRECT|NEXT_NOT_FOUND|node_modules|\/app\/|\\app\\|TypeError|ReferenceError|SyntaxError|ZodError|Cannot read properties|undefined is not|null is not|AUTH_SECRET|DATABASE_URL|SECRET_KEY|API_KEY|process\.env|\.env(?:\.local)?|access[_ -]?token|refresh[_ -]?token|private[_ -]?key|stack trace|\bat .+\(.+\:\d+\:\d+\)|\bHTTP\s*\d{3}\b|status(?:\s+code)?\s*[:=]?\s*\d{3}\b|Daraja|Groq|Cloudflare|Firebase|Twilio|Resend|SendGrid|Amazon\s+S3|AWS|\bS3\b|\bR2\b|Google\s+OAuth|OAuth\s+(?:client|secret|configuration)|gateway[_ -]?response|provider[_ -]?(?:error|rejected|failed)|request[_ -]?(?:id|failed)|checkout_request|authorization_code|subscription_code|webhook[_ -]?(?:secret|signature)|\b[A-Z][A-Z0-9_]{2,}_(?:KEY|SECRET|TOKEN|PASSWORD|PASSKEY|CLIENT_ID|CLIENT_SECRET|URL)\b)/i;

const CODE_LIKE_PATTERN = /^[A-Z][A-Z0-9_:-]{2,80}$/;
const MACHINE_TOKEN_PATTERN = /^(?:[a-z0-9]+[_:-]){1,}[a-z0-9_-]+$/i;

function textFromUnknown(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value instanceof Error) return value.message.trim() || null;
  if (value && typeof value === "object") {
    const candidate = value as { message?: unknown; error?: unknown; code?: unknown };
    if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message.trim();
    if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error.trim();
    if (typeof candidate.code === "string" && candidate.code.trim()) return candidate.code.trim();
  }
  return null;
}

export function publicErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw = textFromUnknown(error);
  if (!raw) return fallback;

  const friendly = FRIENDLY_ERROR_CODES[raw];
  if (friendly) return friendly;

  if (
    raw.length > 240 ||
    INTERNAL_ERROR_PATTERN.test(raw) ||
    CODE_LIKE_PATTERN.test(raw) ||
    MACHINE_TOKEN_PATTERN.test(raw)
  ) {
    return fallback;
  }

  return raw;
}

export function publicApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as { message?: unknown; error?: unknown; code?: unknown };
  return publicErrorMessage(data.message ?? data.error ?? data.code, fallback);
}
