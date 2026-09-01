export type FallbackDeliveryPayload = {
  channel: string;
  body: string;
  subject?: string | null;
  recipient?: Record<string, unknown>;
  purpose?: "transactional" | "marketing" | "reminder";
  fallback?: string[];
  attempted?: string[];
};

export const CHANNEL_FALLBACK: Record<string, string[]> = {
  whatsapp: ["whatsapp", "sms", "email"],
  sms: ["sms", "whatsapp", "email"],
  email: ["email", "sms"],
  push: ["push", "sms", "email"],
  critical: ["push", "sms", "whatsapp", "email"],
};

export type StoredDeliveryPayload = FallbackDeliveryPayload;

export function fallbackChain(preferred: string, stored?: string[] | null): string[] {
  if (stored && stored.length > 0) return stored;
  return CHANNEL_FALLBACK[preferred] ?? [preferred];
}

export function remainingChannels(chain: string[], attempted: string[]): string[] {
  const done = new Set(attempted);
  return chain.filter((c) => !done.has(c));
}

export function asPayload(raw: unknown): StoredDeliveryPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<StoredDeliveryPayload>;
  if (!p.channel || !p.body) return null;
  return {
    channel: p.channel,
    body: p.body,
    subject: p.subject ?? null,
    recipient: p.recipient ?? {},
    purpose: p.purpose ?? "transactional",
    fallback: Array.isArray(p.fallback) ? p.fallback.map(String) : undefined,
    attempted: Array.isArray(p.attempted) ? p.attempted.map(String) : undefined,
  };
}
