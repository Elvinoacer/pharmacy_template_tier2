import { prismaUnscoped } from "@/app/lib/db";
import { redirect } from "next/navigation";
import { getSessionUser, requirePlatformAdmin } from "@/app/lib/auth";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { startMfaEnrollmentAction } from "@/app/actions/mfa";
import { revokeDeviceAction, revokeSessionAction } from "@/app/actions/platform";
import MfaEnrollForm from "@/app/platform/_components/MfaEnrollForm";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const me = await getSessionUser();
  if (!me?.platformAdmin) redirect("/login?next=/platform");
  if (!me.twoFactorEnabled || !me.mfaVerifiedAt) {
    return <PlatformPage title={me.twoFactorEnabled ? "Verify your sign-in" : "Secure your admin account"} description="Complete this step to open platform administration.">
      <div className="rounded-2xl border border-teal-200/20 p-5">
        <p className="text-sm text-teal-100">{me.email}</p>
        <MfaEnrollForm startAction={startMfaEnrollmentAction} enabled={me.twoFactorEnabled} />
      </div>
    </PlatformPage>;
  }
  requirePlatformAdmin(me);
  const [sessions, devices, support, admins] = await Promise.all([
    prismaUnscoped.session.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      take: 40,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, platformAdmin: true } } },
    }).catch(() => []),
    prismaUnscoped.pushDevice.findMany({ take: 40, orderBy: { lastSeenAt: "desc" }, include: { user: { select: { email: true } } } }).catch(() => []),
    prismaUnscoped.supportSession.findMany({ take: 20, orderBy: { startedAt: "desc" }, include: { pharmacy: { select: { name: true } }, platformAdmin: { select: { email: true } } } }).catch(() => []),
    prismaUnscoped.user.findMany({ where: { platformAdmin: true }, select: { email: true, twoFactorEnabled: true, platformRole: true } }).catch(() => []),
  ]);

  return (
    <PlatformPage title="Security" description="Manage two-step verification, signed-in devices, and support access.">
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold">Two-step verification</h2>
        <p className="mt-1 text-sm text-teal-100/70">
          {me.email} — your authenticator protects this account.
        </p>
        <MfaEnrollForm startAction={startMfaEnrollmentAction} enabled verified />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Platform admins</h2>
      <PlatformTable
        headers={["Email", "Role", "MFA"]}
        empty="No platform admins."
        rows={admins.map((a) => [a.email, a.platformRole, a.twoFactorEnabled ? "enabled" : "missing"])}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Active sessions</h2>
      <PlatformTable
        headers={["User", "IP", "Expires", ""]}
        empty="No sessions."
        rows={sessions.map((s) => [
          s.user.email,
          s.ipAddress || "—",
          s.expiresAt.toISOString(),
          <form key={s.id} action={revokeSessionAction}>
            <input type="hidden" name="sessionId" value={s.id} />
            <button className="text-xs font-semibold text-rose-200 hover:underline">Revoke</button>
          </form>,
        ])}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Devices</h2>
      <PlatformTable
        headers={["User", "Label", "Last seen", "Revoked", ""]}
        empty="No devices registered."
        rows={devices.map((d) => [
          d.user.email,
          d.label || "—",
          d.lastSeenAt.toISOString(),
          d.revokedAt ? "yes" : "no",
          d.revokedAt ? "—" : (
            <form key={d.id} action={revokeDeviceAction}>
              <input type="hidden" name="deviceId" value={d.id} />
              <button className="text-xs font-semibold text-rose-200 hover:underline">Revoke</button>
            </form>
          ),
        ])}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Support sessions</h2>
      <PlatformTable
        headers={["Admin", "Pharmacy", "Mode", "Reason", "Ended"]}
        empty="No support sessions."
        rows={support.map((s) => [s.platformAdmin.email, s.pharmacy.name, s.mode, s.reason, s.endedAt ? "yes" : "open"])}
      />
    </PlatformPage>
  );
}
