import { prismaUnscoped } from "@/app/lib/db";
import { redirect } from "next/navigation";
import { getSessionUser, requirePlatformAdmin } from "@/app/lib/auth";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { startMfaEnrollmentAction } from "@/app/actions/mfa";
import { revokeDeviceAction, revokeSessionAction } from "@/app/actions/platform";
import MfaEnrollForm from "@/app/platform/_components/MfaEnrollForm";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";

const sectionTitle = "mb-3 text-base font-semibold text-[#17231d] dark:text-white sm:text-lg";

export default async function SecurityPage() {
  const me = await getSessionUser();
  if (!me?.platformAdmin) redirect("/login?next=/platform");

  if (!me.twoFactorEnabled || !me.mfaVerifiedAt) {
    return (
      <PlatformPage
        title={me.twoFactorEnabled ? "Verify your sign-in" : "Secure your admin account"}
        description="Complete this step to open platform administration."
      >
        <div className="rounded-3xl border border-teal-200 bg-white p-4 shadow-sm dark:border-teal-200/20 dark:bg-white/[0.035] dark:shadow-none sm:p-5">
          <p className="break-all text-sm font-medium text-teal-800 dark:text-teal-100">{me.email}</p>
          <MfaEnrollForm startAction={startMfaEnrollmentAction} enabled={me.twoFactorEnabled} />
        </div>
      </PlatformPage>
    );
  }

  requirePlatformAdmin(me);
  const [sessions, devices, support, admins] = await Promise.all([
    prismaUnscoped.session
      .findMany({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        take: 40,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, platformAdmin: true } } },
      })
      .catch(() => []),
    prismaUnscoped.pushDevice
      .findMany({
        take: 40,
        orderBy: { lastSeenAt: "desc" },
        include: { user: { select: { email: true } } },
      })
      .catch(() => []),
    prismaUnscoped.supportSession
      .findMany({
        take: 20,
        orderBy: { startedAt: "desc" },
        include: {
          pharmacy: { select: { name: true } },
          platformAdmin: { select: { email: true } },
        },
      })
      .catch(() => []),
    prismaUnscoped.user
      .findMany({
        where: { platformAdmin: true },
        select: { email: true, twoFactorEnabled: true, platformRole: true },
      })
      .catch(() => []),
  ]);

  const activeDevices = devices.filter((device) => !device.revokedAt).length;
  const openSupport = support.filter((session) => !session.endedAt).length;
  const metrics = [
    ["Platform admins", admins.length],
    ["Active sessions", sessions.length],
    ["Active devices", activeDevices],
    ["Open support", openSupport],
  ] as const;

  return (
    <PlatformPage
      title="Security"
      description="Manage two-step verification, signed-in devices, and support access. High-impact controls are kept prominent while audit detail stays easy to scan."
    >
      <div className="space-y-8">
        <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-white to-teal-50/60 p-4 shadow-sm dark:border-white/10 dark:from-white/[0.05] dark:to-teal-400/[0.03] dark:shadow-none sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-200/70">
                Account protection
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#17231d] dark:text-white">Two-step verification</h2>
              <p className="mt-1 break-all text-sm text-[#68776e] dark:text-teal-100/65">
                {me.email} — your authenticator protects this account.
              </p>
            </div>
            <span className="mt-2 inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 sm:mt-0">
              MFA enabled
            </span>
          </div>
          <MfaEnrollForm startAction={startMfaEnrollmentAction} enabled verified />
        </section>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 sm:gap-3">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#dce7e1] bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#718078] dark:text-teal-100/50">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[#15231c] dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        <section>
          <h2 className={sectionTitle}>Platform admins</h2>
          <PlatformTable
            headers={["Email", "Role", "MFA"]}
            empty="No platform admins."
            rows={admins.map((a) => [
              <span key={`${a.email}-email`} className="break-all font-medium">{a.email}</span>,
              <span key={`${a.email}-role`} className="capitalize">{a.platformRole.replace(/_/g, " ")}</span>,
              <span
                key={`${a.email}-mfa`}
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  a.twoFactorEnabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200"
                }`}
              >
                {a.twoFactorEnabled ? "enabled" : "missing"}
              </span>,
            ])}
          />
        </section>

        <section>
          <h2 className={sectionTitle}>Active sessions</h2>
          <PlatformTable
            headers={["User", "IP", "Expires", "Action"]}
            empty="No sessions."
            rows={sessions.map((s) => [
              <span key={`${s.id}-user`} className="break-all font-medium">{s.user.email}</span>,
              s.ipAddress || "—",
              <time key={`${s.id}-expires`} dateTime={s.expiresAt.toISOString()} className="text-xs sm:text-sm">
                {s.expiresAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
              </time>,
              <form key={s.id} action={revokeSessionAction}>
                <input type="hidden" name="sessionId" value={s.id} />
                <button className="inline-flex min-h-10 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-[0.98] dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15">
                  Revoke
                </button>
              </form>,
            ])}
          />
        </section>

        <section>
          <h2 className={sectionTitle}>Devices</h2>
          <PlatformTable
            headers={["User", "Label", "Last seen", "Revoked", "Action"]}
            empty="No devices registered."
            rows={devices.map((d) => [
              <span key={`${d.id}-user`} className="break-all font-medium">{d.user.email}</span>,
              d.label || "—",
              <time key={`${d.id}-seen`} dateTime={d.lastSeenAt.toISOString()} className="text-xs sm:text-sm">
                {d.lastSeenAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
              </time>,
              d.revokedAt ? "yes" : "no",
              d.revokedAt ? (
                "—"
              ) : (
                <form key={d.id} action={revokeDeviceAction}>
                  <input type="hidden" name="deviceId" value={d.id} />
                  <button className="inline-flex min-h-10 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-[0.98] dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15">
                    Revoke
                  </button>
                </form>
              ),
            ])}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#17231d] dark:text-white sm:text-lg">Support sessions</h2>
            {openSupport > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                {openSupport} open
              </span>
            ) : null}
          </div>
          <PlatformTable
            headers={["Admin", "Pharmacy", "Mode", "Reason", "Ended"]}
            empty="No support sessions."
            rows={support.map((s) => [
              <span key={`${s.id}-admin`} className="break-all">{s.platformAdmin.email}</span>,
              s.pharmacy.name,
              s.mode.replace(/_/g, " "),
              s.reason,
              s.endedAt ? "yes" : "open",
            ])}
          />
        </section>
      </div>
    </PlatformPage>
  );
}
