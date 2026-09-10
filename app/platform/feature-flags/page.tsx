import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
  PlatformTable,
} from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Feature flags" };
export const dynamic = "force-dynamic";

function StatePill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ${
        enabled
          ? "bg-emerald-500/12 text-emerald-700 ring-1 ring-inset ring-emerald-500/20"
          : "bg-[var(--admin-inset-2)] text-[var(--admin-text-muted)] ring-1 ring-inset ring-[var(--admin-border)]"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

export default async function FeatureFlagsPage() {
  const flags = await prismaUnscoped.featureFlag
    .findMany({
      include: { overrides: { include: { pharmacy: { select: { name: true } } } } },
      orderBy: { key: "asc" },
    })
    .catch(() => []);

  const defaultEnabled = flags.filter((flag) => flag.defaultOn).length;
  const overrideCount = flags.reduce((total, flag) => total + flag.overrides.length, 0);

  return (
    <PlatformPage
      eyebrow="Release controls"
      title="Feature flags"
      description="Control network defaults and quickly see where individual pharmacies diverge from the platform configuration."
    >
      <div className="mb-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        <PlatformStat label="Total flags" value={flags.length} detail="Network capabilities" />
        <PlatformStat
          label="Default on"
          value={defaultEnabled}
          detail={`${Math.max(flags.length - defaultEnabled, 0)} disabled by default`}
          tone="success"
        />
        <div className="col-span-2 lg:col-span-1">
          <PlatformStat label="Tenant overrides" value={overrideCount} detail="Explicit pharmacy exceptions" tone="warning" />
        </div>
      </div>

      <PlatformSection
        title="Flag registry"
        description="Defaults apply network-wide unless a pharmacy-specific override is present."
      >
        <PlatformTable
          headers={["Flag", "Network default", "Pharmacy overrides"]}
          empty="No feature flags have been defined yet."
          rows={flags.map((flag) => [
            <span key={`${flag.id}-key`} className="font-mono text-xs font-semibold text-[var(--admin-text)] sm:text-sm">
              {flag.key}
            </span>,
            <StatePill key={`${flag.id}-default`} enabled={flag.defaultOn} />,
            flag.overrides.length ? (
              <div key={`${flag.id}-overrides`} className="flex flex-wrap justify-end gap-1.5 md:justify-start">
                {flag.overrides.map((override) => (
                  <span
                    key={override.id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[var(--admin-card-2)] px-2 py-1 text-[11px] ring-1 ring-inset ring-[var(--admin-border)]"
                  >
                    <span className="max-w-40 truncate text-[var(--admin-text-muted)]">{override.pharmacy.name}</span>
                    <span className={override.enabled ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                      {override.enabled ? "on" : "off"}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span key={`${flag.id}-none`} className="text-[var(--admin-text-soft)]">Inherited everywhere</span>
            ),
          ])}
        />
      </PlatformSection>
    </PlatformPage>
  );
}
