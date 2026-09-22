"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  FileText,
  Megaphone,
  Package,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";

type UsageEntry = {
  used: number;
  limit: number | null;
};

export type AdminPlanStatus = {
  pharmacy: {
    id: string;
    name: string;
    status: string;
    setupCompleted: boolean;
    verified: boolean;
  };
  plan: "free" | "premium";
  premium: boolean;
  isOwner: boolean;
  subscription: {
    status: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    trialEndsAt: string | null;
    cancelAt: string | null;
    paymentAttention: boolean;
  };
  price: {
    premiumMonthlyKes: number;
  };
  usage: {
    medicines: UsageEntry;
    services: UsageEntry;
    prescriptionReferrals: UsageEntry;
    campaigns: UsageEntry;
  };
};

type PlanContextValue = {
  status: AdminPlanStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const PlanContext = createContext<PlanContextValue>({
  status: null,
  loading: false,
  error: null,
  refresh: () => undefined,
});

function formatDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function usagePercent(entry: UsageEntry) {
  if (entry.limit == null || entry.limit <= 0) return 0;
  return Math.min(100, Math.round((entry.used / entry.limit) * 100));
}

function usageTone(entry: UsageEntry) {
  if (entry.limit == null) return "normal";
  const percent = usagePercent(entry);
  if (percent >= 100) return "limit";
  if (percent >= 80) return "near";
  return "normal";
}

function usageCopy(entry: UsageEntry) {
  if (entry.limit == null) return "Unlimited";
  return `${entry.used} / ${entry.limit}`;
}

export function AdminPlanStatusProvider({
  enabled,
  activePharmacyId,
  children,
}: {
  enabled: boolean;
  activePharmacyId: string | null;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<AdminPlanStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled || !activePharmacyId) {
      setStatus(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/admin/plan-status", {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Plan status is temporarily unavailable.");
        }
        return (await response.json()) as AdminPlanStatus;
      })
      .then((payload) => {
        setStatus(payload);
        setLoading(false);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        console.error("[plan-status] failed to load", cause);
        setStatus(null);
        setLoading(false);
        setError("Plan status is temporarily unavailable.");
      });

    return () => controller.abort();
  }, [enabled, activePharmacyId, version]);

  const value = useMemo<PlanContextValue>(
    () => ({
      status,
      loading,
      error,
      refresh: () => setVersion((current) => current + 1),
    }),
    [status, loading, error],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function useAdminPlanStatus() {
  return useContext(PlanContext);
}

const usageRows = [
  {
    key: "medicines" as const,
    label: "Public medicines",
    shortLabel: "medicines",
    icon: Package,
  },
  {
    key: "services" as const,
    label: "Active services",
    shortLabel: "services",
    icon: Stethoscope,
  },
  {
    key: "prescriptionReferrals" as const,
    label: "Afyvia referrals this month",
    shortLabel: "referrals",
    icon: FileText,
  },
  {
    key: "campaigns" as const,
    label: "Campaign launches this month",
    shortLabel: "campaigns",
    icon: Megaphone,
  },
];

function PlanUsageMeter({
  label,
  entry,
  compact = false,
}: {
  label: string;
  entry: UsageEntry;
  compact?: boolean;
}) {
  const tone = usageTone(entry);
  const pct = usagePercent(entry);
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="font-medium text-[var(--admin-text-muted)]">{label}</span>
        <span
          className={
            tone === "limit"
              ? "font-bold text-rose-700 dark:text-rose-300"
              : tone === "near"
                ? "font-bold text-amber-700 dark:text-amber-300"
                : "font-semibold text-[var(--admin-text)]"
          }
        >
          {usageCopy(entry)}
        </span>
      </div>
      {entry.limit != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-inset)]">
          <div
            className={
              tone === "limit"
                ? "h-full rounded-full bg-rose-500"
                : tone === "near"
                  ? "h-full rounded-full bg-amber-500"
                  : "h-full rounded-full bg-[var(--admin-accent)]"
            }
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FreePlanBenefits() {
  return (
    <div className="grid gap-1.5 text-[11px] text-[var(--admin-text-muted)]">
      {[
        "Core pharmacy workspace, prescriptions, patients and orders",
        "Stock, batches, low-stock and expiry tracking",
        "Basic public storefront and online requests",
      ].map((item) => (
        <p key={item} className="flex items-start gap-1.5">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <span>{item}</span>
        </p>
      ))}
    </div>
  );
}

function PremiumBenefits() {
  return (
    <div className="grid gap-1.5 text-[11px] text-[var(--admin-text-muted)]">
      {[
        "Unlimited medicine listings, services and Afyvia referrals",
        "AI-assisted imports, automation and advanced analytics",
        "Inventory intelligence, richer storefront controls and POS sync",
      ].map((item) => (
        <p key={item} className="flex items-start gap-1.5">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
          <span>{item}</span>
        </p>
      ))}
    </div>
  );
}

export function AdminPlanStatusButton() {
  const { status, loading } = useAdminPlanStatus();

  if (loading) {
    return (
      <div className="hidden h-9 w-24 animate-pulse rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] sm:block" />
    );
  }
  if (!status) return null;

  const attention = status.subscription.paymentAttention;
  const periodEnd = formatDate(status.subscription.periodEnd);

  return (
    <details className="group relative hidden sm:block">
      <summary
        className={
          attention
            ? "flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-500/15 dark:text-amber-200 [&::-webkit-details-marker]:hidden"
            : status.premium
              ? "flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/15 dark:text-emerald-200 [&::-webkit-details-marker]:hidden"
              : "flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)] [&::-webkit-details-marker]:hidden"
        }
        aria-label="View current pharmacy plan"
      >
        {attention ? (
          <AlertTriangle size={14} aria-hidden="true" />
        ) : status.premium ? (
          <BadgeCheck size={14} aria-hidden="true" />
        ) : (
          <ShieldCheck size={14} aria-hidden="true" />
        )}
        <span>
          {attention
            ? "Premium · payment due"
            : status.premium
              ? "Premium"
              : "Free plan"}
        </span>
        <ChevronDown
          size={13}
          className="transition group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="absolute right-0 top-11 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl shadow-black/15">
        <div className="border-b border-[var(--admin-border)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--admin-accent-text)]">
                Current plan
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--admin-text)]">
                {status.premium ? "Afyvia Premium" : "Afyvia Free"}
              </h2>
            </div>
            <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-[10px] font-semibold text-[var(--admin-text-muted)]">
              {status.premium ? "Active" : "KES 0/month"}
            </span>
          </div>

          {attention ? (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-900 dark:text-amber-100">
              <strong>Premium payment needs attention.</strong> Settle billing to restore Premium capacity. Core Free-plan operations remain available.
            </div>
          ) : status.premium ? (
            <p className="mt-2 text-xs leading-5 text-[var(--admin-text-muted)]">
              Premium capacity is active
              {periodEnd ? ` through ${periodEnd}` : ""}.
              {status.subscription.cancelAt
                ? " Renewal is scheduled to stop at period end."
                : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-[var(--admin-text-muted)]">
              Your pharmacy is operating on Free. Core pharmacy work continues normally; Premium expands capacity, automation and intelligence.
            </p>
          )}
        </div>

        {!status.premium && (
          <div className="space-y-3 border-b border-[var(--admin-border)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">
              Free usage
            </p>
            {usageRows.map((row) => (
              <PlanUsageMeter
                key={row.key}
                label={row.label}
                entry={status.usage[row.key]}
                compact
              />
            ))}
          </div>
        )}

        <div className="space-y-3 p-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">
              {status.premium ? "Premium includes" : "Free keeps available"}
            </p>
            {status.premium ? <PremiumBenefits /> : <FreePlanBenefits />}
          </div>

          {!status.premium && (
            <div className="rounded-xl bg-[var(--admin-inset)] p-3">
              <p className="text-xs font-semibold text-[var(--admin-text)]">
                Premium · KES {status.price.premiumMonthlyKes}/month
              </p>
              <p className="mt-1 text-[11px] leading-4 text-[var(--admin-text-muted)]">
                Unlimited growth capacity plus automation, intelligence and advanced storefront tools.
              </p>
            </div>
          )}

          <Link
            href="/admin/billing"
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-3 text-xs font-semibold text-white transition hover:brightness-105"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {status.premium
              ? "Manage plan & billing"
              : status.isOwner
                ? `Explore Premium · KES ${status.price.premiumMonthlyKes}/month`
                : "View plan details"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {!status.premium && !status.isOwner && (
            <p className="text-center text-[10px] leading-4 text-[var(--admin-text-soft)]">
              Only the pharmacy owner can activate Premium.
            </p>
          )}
        </div>
      </div>
    </details>
  );
}

export function AdminPlanStatusMobileCard() {
  const { status, loading } = useAdminPlanStatus();

  if (loading) {
    return <div className="h-16 animate-pulse rounded-xl bg-[var(--admin-inset)]" />;
  }
  if (!status) return null;

  const prominentRows = usageRows.slice(0, 2);

  return (
    <Link
      href="/admin/billing"
      className={
        status.subscription.paymentAttention
          ? "block rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
          : status.premium
            ? "block rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3"
            : "block rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {status.subscription.paymentAttention ? (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          ) : status.premium ? (
            <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-[var(--admin-accent)]" />
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-soft)]">
              Plan
            </p>
            <p className="text-sm font-bold text-[var(--admin-text)]">
              {status.subscription.paymentAttention
                ? "Premium · payment due"
                : status.premium
                  ? "Premium active"
                  : "Free"}
            </p>
          </div>
        </div>
        <ChevronDown className="-rotate-90 h-4 w-4 text-[var(--admin-text-soft)]" />
      </div>

      {!status.premium && (
        <p className="mt-2 text-[11px] text-[var(--admin-text-muted)]">
          {prominentRows
            .map((row) => `${usageCopy(status.usage[row.key])} ${row.shortLabel}`)
            .join(" · ")}
        </p>
      )}
    </Link>
  );
}

export function AdminPlanWelcomeBanner() {
  const { status } = useAdminPlanStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!status || status.premium || !status.pharmacy.setupCompleted) {
      setVisible(false);
      return;
    }

    const key = `afyvia-plan-intro:${status.pharmacy.id}:v1`;
    try {
      setVisible(window.localStorage.getItem(key) !== "dismissed");
    } catch {
      setVisible(true);
    }
  }, [status]);

  if (!status || status.premium || !visible) return null;

  const dismiss = () => {
    const key = `afyvia-plan-intro:${status.pharmacy.id}:v1`;
    try {
      window.localStorage.setItem(key, "dismissed");
    } catch {
      // A private browsing/storage restriction should not block dismissal.
    }
    setVisible(false);
  };

  return (
    <section
      aria-label="Current pharmacy plan"
      className="mb-5 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.03] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                Your pharmacy plan
              </p>
              <h2 className="mt-1 text-base font-bold text-[var(--admin-text)] sm:text-lg">
                You’re operating on Afyvia Free
              </h2>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss plan introduction"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--admin-text-soft)] transition hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--admin-text-muted)] sm:text-sm">
            Core pharmacy operations stay available on Free. Your current growth allowance is 5 public medicines, 2 active services, 10 direct Afyvia prescription referrals per month and 1 campaign launch per month.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {usageRows.map((row) => (
              <span
                key={row.key}
                className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1 text-[10px] font-semibold text-[var(--admin-text-muted)]"
              >
                {row.label}: {usageCopy(status.usage[row.key])}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href="/admin/billing"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-3 text-xs font-semibold text-white"
            >
              View plan & limits <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {status.isOwner && (
              <Link
                href="/admin/billing"
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[var(--admin-accent-text)] hover:underline"
              >
                Explore Premium · KES {status.price.premiumMonthlyKes}/month
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
