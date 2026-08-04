import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, ScanBarcode } from "lucide-react";
import { BarcodeScanFlow } from "./BarcodeScanFlow";

export const metadata = { title: "Scan Barcode — Medication" };

export default async function ScanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="Scan Barcode / QR Code"
      subtitle="Camera scan (Chromium browsers) or manual entry for hardware scanners. Looks up MedicationMaster.barcode."
    >
      <div className="mb-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to acquisition chooser
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
            <ScanBarcode className="h-4 w-4" /> How this works
          </p>
          <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-400/80">
            Click &ldquo;Start camera&rdquo; to scan with your device camera (Chromium browsers), or type/paste a barcode into the manual field (works with USB hardware scanners that act as keyboards). Found = add to pharmacy. Not found = we&apos;ll offer AI Import.
          </p>
        </div>

        <BarcodeScanFlow />
      </div>
    </AdminShell>
  );
}
