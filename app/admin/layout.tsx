import "./admin.css";
import "./admin-route-ux.css";
import "../workspace-compat.css";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";
import { exitImpersonationAction } from "@/app/actions/platform";
import { canAccessAdminPath } from "@/app/lib/platform/admin-access";
import { getPharmacyWorkspaceAccess } from "@/app/lib/platform/tenant-access";
import { AlertTriangle } from "lucide-react";
import { AdminRouteUxBoundary } from "./AdminRouteUxBoundary";

export const dynamic = "force-dynamic";

function isNextControlFlowError(err: unknown): boolean {
  if (isRedirectError(err)) return true;
  const digest = (err as { digest?: string } | null)?.digest;
  return digest === "DYNAMIC_SERVER_USAGE";
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof getSessionUser>>;
  try {
    user = await getSessionUser();
  } catch (err) {
    if (isNextControlFlowError(err)) throw err;
    console.error("[admin/layout] Failed to resolve session user:", err);
    redirect("/login?next=/admin");
  }
  if (!user) redirect("/login?next=/admin");
  if (user.platformAdmin && (!user.twoFactorEnabled || !user.mfaVerifiedAt)) redirect("/platform/security?mfa=required");

  if (user.memberships.length === 0 && !user.platformAdmin) {
    if (user.role === "caregiver") redirect("/caregiver");
    if (user.role === "customer") redirect("/portal");
    redirect("/onboard");
  }

  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") || "/admin";
  if (!canAccessAdminPath(user, pathname)) {
    redirect("/admin");
  }

  // Account suspension is a workspace boundary. Keep authentication intact so
  // the owner can recover billing, but never render the operational admin shell
  // for a paused tenant. Staff get a dedicated explanation instead of a broken
  // dashboard; users with several pharmacies can still switch workspaces.
  if (!user.platformAdmin && user.activePharmacyId) {
    const access = await getPharmacyWorkspaceAccess(user.activePharmacyId);
    const isRecoverySurface = pathname.startsWith("/admin/access-paused");
    const isTenantPicker = pathname.startsWith("/admin/select");

    if (access.blocksOperations && !isRecoverySurface && !isTenantPicker) {
      const membership = user.memberships.find(
        (candidate) => candidate.pharmacyId === user.activePharmacyId && candidate.status === "active",
      );
      const isOwner = membership?.role === "owner" || access.pharmacy?.ownerUserId === user.id;

      if (access.mode === "billing_suspended" && isOwner) {
        redirect("/onboard/billing?state=suspended");
      }
      redirect("/admin/access-paused");
    }

    // A newly verified, operable pharmacy stays inside guided setup until the
    // owner finishes it. Paused tenants are handled by the recovery guard above.
    if (!access.blocksOperations && !pathname.startsWith("/admin/setup")) {
      const activePharmacy = access.pharmacy;
      if (
        activePharmacy?.verifiedAt &&
        ["approved", "active"].includes(activePharmacy.status) &&
        !activePharmacy.setupCompletedAt
      ) {
        redirect("/admin/setup");
      }
    }
  }

  // Impersonation banner — platform admin viewing a tenant via support view.
  let impersonatedName: string | null = null;
  try {
    const jar = await cookies();
    const marker = jar.get("afyvia_impersonation")?.value;
    if (marker && user.platformAdmin) {
      const row = await prismaUnscoped.pharmacy.findUnique({
        where: { id: marker },
        select: { name: true },
      });
      impersonatedName = row?.name ?? null;
    }
  } catch {
    // ignore
  }

  return (
    <>
      {impersonatedName && (
        <div
          className="flex flex-col items-center justify-between gap-3 border-b border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm text-amber-100 sm:flex-row"
          role="status"
        >
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong>Support view:</strong> you are working inside <strong>{impersonatedName}</strong>
              . Mutations require an act-as-tenant session.
            </span>
          </p>
          <div className="flex items-center gap-3">
            <Link href="/platform/pharmacies" className="text-xs underline hover:text-white">
              Tenant console
            </Link>
            <form action={exitImpersonationAction}>
              <button
                type="submit"
                className="rounded-full bg-amber-300/20 px-3 py-1 text-xs font-semibold hover:bg-amber-300/30"
              >
                Exit support view
              </button>
            </form>
          </div>
        </div>
      )}
      <AdminRouteUxBoundary>{children}</AdminRouteUxBoundary>
    </>
  );
}
