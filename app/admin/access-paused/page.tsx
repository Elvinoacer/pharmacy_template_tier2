import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Building2, CreditCard, LockKeyhole, LogOut, ShieldAlert } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { getSessionUser } from "@/app/lib/auth";
import { getPharmacyWorkspaceAccess } from "@/app/lib/platform/tenant-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pharmacy access paused" };

export default async function AccessPausedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.platformAdmin) redirect("/admin");
  if (!user.activePharmacyId) redirect("/admin/select");

  const access = await getPharmacyWorkspaceAccess(user.activePharmacyId);
  if (!access.blocksOperations) redirect("/admin");

  const membership = user.memberships.find(
    (candidate) => candidate.pharmacyId === user.activePharmacyId && candidate.status === "active",
  );
  const isOwner = membership?.role === "owner" || access.pharmacy?.ownerUserId === user.id;
  const billingPaused = access.mode === "billing_suspended";
  const canSwitch = user.memberships.filter((m) => m.status === "active").length > 1;

  const title = billingPaused ? "Workspace paused for billing" : "Workspace access is paused";
  const description = billingPaused
    ? "The 14-day payment grace period ended without a successful subscription charge. Your pharmacy data is preserved, but operational access and the public listing stay paused until billing is restored."
    : access.mode === "regulatory_hold"
      ? "This pharmacy is under a regulatory hold. Billing payment alone cannot restore access. The platform team must clear the hold first."
      : "This pharmacy is not currently available for day-to-day operations. Your account remains signed in, but operational tools are locked until the workspace is restored.";

  return (
    <main className="admin-workspace mesh-bg min-h-screen px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-3xl items-center sm:min-h-[calc(100dvh-5rem)]">
        <section className="admin-card w-full overflow-hidden rounded-[26px] border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-2xl sm:rounded-[32px]">
          <div className="border-b border-[var(--admin-border)] bg-[var(--admin-inset)] px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                {billingPaused ? <CreditCard className="h-5 w-5" aria-hidden /> : <ShieldAlert className="h-5 w-5" aria-hidden />}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">Protected workspace</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight admin-text sm:text-3xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 admin-muted">{description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-[1.15fr_.85fr] sm:p-8">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 admin-accent-text" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Pharmacy</p>
                    <p className="mt-1 font-semibold admin-text">{access.pharmacy?.name || "Selected pharmacy"}</p>
                    <p className="mt-1 text-xs admin-soft">Your account and pharmacy records have not been deleted.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 admin-accent-text" aria-hidden />
                  <div>
                    <p className="font-semibold admin-text">What is locked</p>
                    <p className="mt-1 text-sm leading-6 admin-muted">
                      Dashboard operations, inventory changes, dispensing, orders, customer management, campaigns, analytics and settings are unavailable while this workspace is paused.
                    </p>
                  </div>
                </div>
              </div>

              {billingPaused ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Restoration is automatic after payment</p>
                  <p className="mt-1 text-sm leading-6 admin-muted">
                    Once the outstanding subscription is successfully charged, Aether restores the billing-suspended workspace and republishes an already-launched pharmacy automatically.
                  </p>
                </div>
              ) : null}
            </div>

            <aside className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wide admin-muted">Next action</p>

              {billingPaused && isOwner ? (
                <>
                  <h2 className="mt-2 text-lg font-semibold admin-text">Restore your pharmacy</h2>
                  <p className="mt-2 text-sm leading-6 admin-muted">Update the saved card or retry the KES 500 subscription payment. You do not need to repeat onboarding.</p>
                  <Link href="/onboard/billing?state=suspended" className="btn-primary mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2">
                    Fix billing & restore
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </>
              ) : billingPaused ? (
                <>
                  <h2 className="mt-2 text-lg font-semibold admin-text">Ask the pharmacy owner</h2>
                  <p className="mt-2 text-sm leading-6 admin-muted">Only the pharmacy owner can manage the subscription card. Your access returns automatically when billing is restored.</p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-lg font-semibold admin-text">Access requires review</h2>
                  <p className="mt-2 text-sm leading-6 admin-muted">This pause is not a normal subscription-payment issue. Contact the platform team if you believe the hold is incorrect.</p>
                </>
              )}

              {canSwitch ? (
                <Link href="/admin/select" className="btn-ghost mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2">
                  <Building2 className="h-4 w-4" aria-hidden />
                  Switch pharmacy
                </Link>
              ) : null}

              <div className="mt-5 border-t border-[var(--admin-border)] pt-4">
                <div className="flex items-start gap-2 text-xs leading-5 admin-soft">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <p>Signing out does not affect the pharmacy data or the recovery process.</p>
                </div>
                <form action={logoutAction} className="mt-3">
                  <button type="submit" className="btn-ghost inline-flex min-h-11 w-full items-center justify-center gap-2">
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sign out
                  </button>
                </form>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
