import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const rows = await prismaUnscoped.pharmacyIntegration.findMany({
    include: { pharmacy: { select: { name: true, slug: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  }).catch(() => []);

  return (
    <PlatformPage title="Integration health" description="Per-tenant M-Pesa, SMS, WhatsApp and POS connectivity.">
      <PlatformTable
        headers={["Pharmacy", "Daraja", "Comms", "POS"]}
        empty="No integration rows yet."
        rows={rows.map((r) => [
          r.pharmacy.name,
          r.darajaShortcode ? (r.darajaLastError ? `error: ${r.darajaLastError}` : "configured") : "missing",
          r.commsLastError ? `error: ${r.commsLastError}` : r.commsLastSuccessAt ? "ok" : "idle",
          r.posLastError ? `error: ${r.posLastError}` : r.posLastSyncAt ? "synced" : "idle",
        ])}
      />
    </PlatformPage>
  );
}
