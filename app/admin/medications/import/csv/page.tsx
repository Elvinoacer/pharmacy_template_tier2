import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { CsvImportFlow } from "./CsvImportFlow";

export const metadata = { title: "Import from Excel / CSV — Medication" };

export default async function CsvImportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="Import from Excel / CSV"
      subtitle="Upload .csv (or .xlsx — save as CSV first), map columns, preview, import. Matches existing MedicationMaster records first."
    >
      <div className="mb-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to acquisition chooser
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <FileSpreadsheet className="h-4 w-4" /> How this works
          </p>
          <ol className="mt-2 space-y-1 text-xs text-amber-700/80 dark:text-amber-400/80 list-decimal list-inside">
            <li>Upload a .csv file (for .xlsx, use Excel&apos;s &ldquo;Save As CSV&rdquo; first).</li>
            <li>Map your source columns to system fields (name, generic, price, stock, etc.).</li>
            <li>Preview the first 10 rows mapped.</li>
            <li>Import — each row is matched against existing MedicationMaster records first (by generic + strength + form), so duplicates aren&apos;t created. Unmatched rows create new masters flagged for enrichment.</li>
            <li>Clinical fields missing from your import are fine — those records are flagged &ldquo;needs enrichment&rdquo; and editable later.</li>
          </ol>
        </div>

        <CsvImportFlow />
      </div>
    </AdminShell>
  );
}
