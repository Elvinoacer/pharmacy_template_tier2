import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Feature flags" };
export const dynamic = "force-dynamic";

export default async function FeatureFlagsPage() {
  const flags = await prismaUnscoped.featureFlag.findMany({
    include: { overrides: { include: { pharmacy: { select: { name: true } } } } },
  }).catch(() => []);

  return (
    <PlatformPage title="Feature flags" description="Network-wide flags with per-tenant overrides.">
      <PlatformTable
        headers={["Key", "Default", "Overrides"]}
        empty="No flags defined yet."
        rows={flags.map((f) => [
          f.key,
          f.defaultOn ? "on" : "off",
          f.overrides.map((o) => `${o.pharmacy.name}:${o.enabled ? "on" : "off"}`).join(", ") || "—",
        ])}
      />
    </PlatformPage>
  );
}
