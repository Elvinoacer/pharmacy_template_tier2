import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, FileText, ShieldCheck } from "lucide-react";
import { prisma } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { verifyRefillTrackingToken } from "@/app/lib/refill-tracking";
import { refillStatusMeta } from "@/app/lib/types";

export const metadata: Metadata = {
  title: "Refill status",
  robots: { index: false, follow: false },
};

function reference(id: string) {
  return `RF-${id.replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

export default async function RefillStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const claims = verifyRefillTrackingToken(token);

  if (!claims) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-20 bg-transparent">
        <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-8 shadow-sm backdrop-blur-xl">
          <ShieldCheck className="h-9 w-9 text-slate-500" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--foreground)]">This tracking link is invalid or expired</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            For privacy, guest refill tracking links expire automatically. Contact the pharmacy or sign in to view refills linked to your account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary btn-primary-sm">Sign in</Link>
            <Link href="/pharmacies" className="btn-ghost btn-ghost-sm">Find a pharmacy</Link>
          </div>
        </div>
      </main>
    );
  }

  const result = await withPharmacy(claims.pharmacyId, async () => {
    const [refill, pharmacy] = await Promise.all([
      prisma.refillRequest.findFirst({
        where: { id: claims.refillId, pharmacyId: claims.pharmacyId },
        select: {
          id: true,
          medicineName: true,
          status: true,
          pickupPreference: true,
          preferredDate: true,
          createdAt: true,
          statusUpdatedAt: true,
        },
      }),
      prisma.pharmacy.findUnique({
        where: { id: claims.pharmacyId },
        select: { name: true, slug: true },
      }),
    ]);
    return { refill, pharmacy };
  });

  if (!result.refill) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-20 bg-transparent">
        <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-8 shadow-sm backdrop-blur-xl">
          <FileText className="h-9 w-9 text-slate-500" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--foreground)]">Refill request unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            This request may have been removed under the pharmacy&apos;s retention policy. Contact the pharmacy if you still need help.
          </p>
        </div>
      </main>
    );
  }

  const refill = result.refill;
  const meta = refillStatusMeta(refill.status);
  const pharmacyHref = result.pharmacy?.slug ? `/p/${result.pharmacy.slug}` : "/pharmacies";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:py-20 bg-transparent">
      <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700">{reference(refill.id)}</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">Refill status</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{result.pharmacy?.name || "Your pharmacy"}</p>
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--care-border)] bg-[var(--card-elev)]/80 p-4 backdrop-blur-md">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Medicine</dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{refill.medicineName}</dd>
          </div>
          <div className="rounded-2xl border border-[var(--care-border)] bg-[var(--card-elev)]/80 p-4 backdrop-blur-md">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Status</dt>
            <dd className="mt-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>{meta.label}</span></dd>
          </div>
          <div className="rounded-2xl border border-[var(--care-border)] bg-[var(--card-elev)]/80 p-4 backdrop-blur-md">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Collection</dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">{refill.pickupPreference === "delivery" ? "Delivery" : "Pickup"}{refill.preferredDate ? ` · ${refill.preferredDate.toLocaleDateString("en-KE")}` : ""}</dd>
          </div>
          <div className="rounded-2xl border border-[var(--care-border)] bg-[var(--card-elev)]/80 p-4 backdrop-blur-md">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Last updated</dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">{refill.statusUpdatedAt.toLocaleString("en-KE")}</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
          This link only reveals the minimum information needed to track this refill and expires automatically. It does not provide access to your wider health record.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={pharmacyHref} className="btn-primary btn-primary-sm">Pharmacy home</Link>
          <Link href="/login" className="btn-ghost btn-ghost-sm">Sign in for full history</Link>
        </div>
      </div>
    </main>
  );
}
