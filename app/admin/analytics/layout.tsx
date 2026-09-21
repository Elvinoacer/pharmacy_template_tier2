import Link from "next/link";
import { getSessionUser } from "@/app/lib/auth";
import { isFeatureEnabled } from "@/app/lib/platform/entitlements";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.platformAdmin) return children;
  const enabled = user.activePharmacyId ? await isFeatureEnabled(user.activePharmacyId, "analytics") : false;
  if (enabled) return children;

  return (
    <section className="mx-auto max-w-xl space-y-3 p-6">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Advanced analytics is part of Premium</h1>
      <p className="text-sm leading-6 text-[var(--muted)]">
        Orders, reservations and bookings stay available on the free plan. Premium is KES 500/month and adds analytics, AI-assisted imports, POS synchronization and more than 5 medicine listings and 2 services.
      </p>
      <Link href="/admin/billing" className="btn-primary inline-flex">Upgrade to Premium</Link>
    </section>
  );
}
