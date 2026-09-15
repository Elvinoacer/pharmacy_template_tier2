import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { PlatformPage } from "@/app/platform/_components/PlatformPage";
import { PlatformImportFlow } from "./PlatformImportFlow";
import { ArrowLeft, Pill } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Import Canonical Medications — Platform Admin",
};

export default async function PlatformMedicationImportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/platform/medications/import");
  if (!user.platformAdmin) redirect("/admin");

  const actions = (
    <div className="flex items-center gap-2">
      <Link
        href="/platform/medications"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Registry</span>
      </Link>
    </div>
  );

  return (
    <PlatformPage
      eyebrow="Platform Shared Library"
      title="Import Canonical Medications"
      description="Bulk onboard standardized medications into the platform shared master library via CSV. Medications imported here create clinical canonical records only and are NEVER assigned to any pharmacy inventory or made publicly visible."
      actions={actions}
    >
      <PlatformImportFlow />
    </PlatformPage>
  );
}
