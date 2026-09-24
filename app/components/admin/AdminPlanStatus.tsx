"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { PremiumGate } from "./PremiumGate";
import { usePathname } from "next/navigation";
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
  planState: { billingStatus: string; pharmacyReady: boolean; blockedReason: string | null };
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
  canManageBilling: boolean;
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

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setVersion(current => current + 1);
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [enabled]);

  const value = useMemo<PlanContextValue>(
    () => ({
      status,
      loading,
      error,
      refresh: () => setVersion((current) => current + 1),
    }),
    [status, loading, error],
  );

  return <PlanContext.Provider value={value}>{children}<PremiumGate global feature="Premium capacity" /></PlanContext.Provider>;
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
  const planMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (planMenu.current?.open && !planMenu.current.contains(event.target as Node)) {
        planMenu.current.open = false;
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (loading) {
    return (
      <div className="hidden h-9 w-24 animate-pulse rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] sm:block" />
    );
  }
  if (!status) return null;

  const attention = status.subscription.paymentAttention;
  const periodEnd = formatDate(status.subscription.periodEnd);

  return (
    <details
      ref={planMenu}
      className="group relative hidden sm:block"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className={
          attention
            ? "flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-500/15 dark:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-panel)] [&::-webkit-details-marker]:hidden"
            : status.premium
              ? "flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/15 dark:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-panel)] [&::-webkit-details-marker]:hidden"
              : "flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-panel)] [&::-webkit-details-marker]:hidden"
        }
        aria-label="View current pharmacy plan"
        aria-haspopup="dialog"
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

      <div
        role="dialog"
        aria-label="Pharmacy plan details"
        className="absolute right-0 top-full z-50 mt-2 flex max-h-[calc(100svh-8rem)] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl shadow-black/15"
      >
        <div className="shrink-0 border-b border-[var(--admin-border)] p-3.5">
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
              {attention ? "Payment due" : status.premium ? "Active" : "KES 0/month"}
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
              {status.planState.billingStatus === "premium_pending_activation" ? "Premium paid — finish pharmacy setup to activate Premium features." : "Your pharmacy is operating on Free. Core pharmacy work continues normally; Premium expands capacity, automation and intelligence."}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
          {!status.premium && (
            <div className="space-y-2.5 border-b border-[var(--admin-border)] p-3.5">
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

          <div className="space-y-3 p-3.5">
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
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--admin-border)] bg-[var(--admin-card)] p-3 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
          <Link
            href="/admin/billing"
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-3 text-xs font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-card)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {attention
              ? "Review billing"
              : status.premium
                ? "Manage plan & billing"
                : status.canManageBilling
                  ? `Explore Premium · KES ${status.price.premiumMonthlyKes}/month`
                  : "View plan details"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {!status.premium && !status.canManageBilling && (
            <p className="mt-2 text-center text-[10px] leading-4 text-[var(--admin-text-soft)]">
              Only a user with billing permission can activate Premium.
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

export function AdminPlanDashboardCard() {
  const { status, loading } = useAdminPlanStatus();
  const pathname = usePathname();
  const [introPending, setIntroPending] = useState(false);

  useEffect(() => {
    if (!status || status.premium || status.subscription.paymentAttention || !status.pharmacy.setupCompleted) {
      setIntroPending(false);
      return;
    }
    const key = `afyvia-plan-intro:${status.pharmacy.id}:v1`;
    try {
      setIntroPending(window.localStorage.getItem(key) !== "dismissed");
    } catch {
      setIntroPending(true);
    }
  }, [status]);

  if (pathname !== "/admin" || introPending) return null;

  if (loading) {
    return (
      <div className="mb-5 h-28 animate-pulse rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)]" />
    );
  }
  if (!status) return null;

  const periodEnd = formatDate(status.subscription.periodEnd);

  return (
    <section className="mb-5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={
              status.subscription.paymentAttention
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : status.premium
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-inset)] text-[var(--admin-accent-text)]"
            }
          >
            {status.subscription.paymentAttention ? (
              <AlertTriangle className="h-5 w-5" />
            ) : status.premium ? (
              <BadgeCheck className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--admin-text-soft)]">
              Pharmacy plan
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[var(--admin-text)]">
                {status.subscription.paymentAttention
                  ? "Premium payment needs attention"
                  : status.premium
                    ? "Afyvia Premium"
                    : "Afyvia Free"}
              </h2>
              <span className="rounded-full bg-[var(--admin-inset)] px-2 py-0.5 text-[10px] font-semibold text-[var(--admin-text-muted)]">
                {status.subscription.paymentAttention
                  ? "Payment due"
                  : status.premium
                    ? "Active"
                    : "KES 0/month"}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--admin-text-muted)]">
              {status.subscription.paymentAttention
                ? "Premium capacity is paused. Core Free-plan operations remain available."
                : status.premium
                  ? `Premium capacity and advanced tools are active${periodEnd ? ` through ${periodEnd}` : ""}.`
                  : "Core pharmacy work is included. Upgrade only when you need more listings, referrals, automation or intelligence."}
            </p>
          </div>
        </div>

        {!status.premium ? (
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[470px]">
            {usageRows.map((row) => {
              const entry = status.usage[row.key];
              const tone = usageTone(entry);
              return (
                <div
                  key={row.key}
                  className={
                    tone === "limit"
                      ? "rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2"
                      : tone === "near"
                        ? "rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2"
                        : "rounded-xl bg-[var(--admin-inset)] px-3 py-2"
                  }
                >
                  <p className="text-[10px] text-[var(--admin-text-soft)]">
                    {row.shortLabel}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-[var(--admin-text)]">
                    {usageCopy(entry)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-[var(--admin-text-muted)]">
            <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1">Unlimited listings</span>
            <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1">Automation active</span>
            <span className="rounded-full bg-[var(--admin-inset)] px-2.5 py-1">Advanced tools active</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href="/admin/billing"
          className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[var(--admin-accent-text)] hover:underline"
        >
          {status.subscription.paymentAttention
            ? "Review billing"
            : status.premium
              ? "Manage plan & billing"
              : "View plan & limits"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

export function AdminPlanContextNotice() {
  const { status } = useAdminPlanStatus();
  const pathname = usePathname();

  if (!status) return null;

  if (status.subscription.paymentAttention) {
    return (
      <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-[var(--admin-text)]">
              Premium payment needs attention
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">
              Premium capacity is paused. Your core Afyvia Free workspace remains available, and your Premium-era data is preserved.
            </p>
          </div>
        </div>
        {status.canManageBilling ? (
          <PremiumGate
            feature="Restore Afyvia Premium"
            description="Settle the outstanding Premium invoice to restore your paused Premium capacity and tools."
            label="Reactivate Premium"
            directCheckout={pathname === "/admin/billing"}
          />
        ) : (
          <Link
            href="/admin/billing"
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"
          >
            View billing <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </section>
    );
  }

  if (status.premium) {
    const days = status.subscription.periodEnd
      ? Math.ceil(
          (new Date(status.subscription.periodEnd).getTime() - Date.now()) /
            86400000,
        )
      : null;
    if (days == null || days > 7) return null;

    const urgent = days <= 3;
    return (
      <section
        role="status"
        className={
          urgent
            ? "mb-4 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] p-3 text-sm"
            : "mb-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)]/60 p-3 text-sm"
        }
      >
        <strong>{days} day{days === 1 ? "" : "s"} left on Premium.</strong>{" "}
        {urgent
          ? "Premium capacity will fall back to Free limits when this paid period ends. "
          : "Review renewal and what would change if the paid period ended. "}
        <Link href="/admin/billing" className="font-semibold underline">
          Review plan impact
        </Link>
        .
      </section>
    );
  }

  if (status.planState.billingStatus === "premium_pending_activation") {
    return (
      <p className="mb-4 rounded-xl border p-3 text-sm">
        Premium paid — finish pharmacy setup to activate Premium features.{" "}
        <Link href="/admin/setup" className="font-semibold underline">
          Finish setup
        </Link>
      </p>
    );
  }

  if (
    status.planState.billingStatus === "premium_expired" ||
    status.planState.billingStatus === "cancelled"
  ) {
    return (
      <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-[var(--admin-text)]">
              Premium ended — Afyvia Free is active
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">
              Core pharmacy work continues. Premium-only automation and capacity are paused, and Premium-era records are preserved for restoration.
            </p>
          </div>
        </div>
        {status.canManageBilling ? (
          <PremiumGate
            feature="Reactivate Afyvia Premium"
            description="Restore paused Premium capacity, automation and advanced tools without recreating your records."
            label="Reactivate Premium"
            directCheckout={pathname === "/admin/billing"}
          />
        ) : (
          <Link
            href="/admin/billing"
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 text-xs font-semibold text-[var(--admin-accent-text)]"
          >
            View plan details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </section>
    );
  }

  let key: keyof AdminPlanStatus["usage"] | null = null;
  let noun = "";
  let unaffected = "";

  if (pathname.startsWith("/admin/medications")) {
    key = "medicines";
    noun = "public medicine listings";
    unaffected = "Manual medicine management and stock tracking stay available.";
  } else if (pathname.startsWith("/admin/services")) {
    key = "services";
    noun = "active services";
    unaffected = "Existing bookings stay operational. Overflow services remain saved but cannot accept new public bookings.";
  } else if (pathname.startsWith("/admin/prescriptions")) {
    key = "prescriptionReferrals";
    noun = "direct Afyvia prescription referrals this month";
    unaffected = "Existing patients, staff-entered prescriptions and dispensing are not blocked. Once the allowance is exhausted, new marketplace referrals are offered another available pharmacy until next month or Premium reactivation.";
  } else if (pathname.startsWith("/admin/campaigns")) {
    key = "campaigns";
    noun = "campaign launches this month";
    unaffected = "You can continue preparing drafts even after the monthly Free launch is used.";
  }

  if (!key) return null;

  const entry = status.usage[key];
  if (entry.limit == null) return null;

  const remaining = Math.max(0, entry.limit - entry.used);
  const atLimit = remaining === 0;

  return (
    <section
      className={
        atLimit
          ? "mb-5 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between"
          : "mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)]/60 p-4 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--admin-card)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Free plan
          </span>
          <span className="text-xs font-bold text-[var(--admin-text)]">
            {entry.used} / {entry.limit} {noun}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-[var(--admin-text-muted)]">
          {atLimit
            ? `Your Free allowance for ${noun} is currently in use. ${unaffected}`
            : `You have ${remaining} Free ${remaining === 1 ? "slot" : "slots"} remaining for ${noun}. ${unaffected}`}
        </p>
      </div>

      <Link
        href="/admin/billing"
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 text-xs font-semibold text-[var(--admin-accent-text)] transition hover:bg-[var(--admin-hover)]"
      >
        {status.canManageBilling ? "See Premium capacity" : "View plan details"}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

export function AdminPlanWelcomeBanner() {
  const { status } = useAdminPlanStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      !status ||
      status.premium ||
      status.subscription.paymentAttention ||
      !status.pharmacy.setupCompleted
    ) {
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

  if (
    !status ||
    status.premium ||
    status.subscription.paymentAttention ||
    !visible
  ) return null;

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
            {status.canManageBilling && (
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
