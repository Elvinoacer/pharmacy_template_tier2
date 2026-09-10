import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import { ArrowLeft, ScanBarcode, Camera, Search, PackageCheck } from "lucide-react";
import { BarcodeScanFlow } from "./BarcodeScanFlow";

export const metadata = { title: "Scan Barcode — Medication" };

export default async function ScanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="Scan a medicine"
      subtitle="Scan a pack or enter its barcode to find a matching medicine."
    >
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <Link
          href="/admin/medications/add"
          className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-3.5 text-sm font-medium admin-muted transition hover:border-[var(--admin-accent)] hover:admin-accent-text"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to acquisition chooser
        </Link>

        <section className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-[var(--admin-card)] to-[var(--admin-card)] shadow-sm dark:from-indigo-400/10 sm:rounded-3xl">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
              <ScanBarcode className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Fast barcode workflow</h2>
              <p className="mt-1 text-xs leading-relaxed text-indigo-800/75 dark:text-indigo-200/70">
                Camera scanning is fastest on supported browsers. Keyboard and USB scanner input remain available on every device.
              </p>
            </div>
          </div>
          <div className="grid gap-px border-t border-indigo-500/15 bg-indigo-500/10 sm:grid-cols-3">
            {[
              { icon: Camera, label: "1. Scan", text: "Point the rear camera at the pack barcode." },
              { icon: Search, label: "2. Match", text: "We check the shared medication library." },
              { icon: PackageCheck, label: "3. Add", text: "Review the match, then add it to inventory." },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="bg-[var(--admin-card)] px-4 py-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold admin-text">
                    <Icon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" /> {step.label}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed admin-soft">{step.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <BarcodeScanFlow />
      </div>
    </AdminShell>
  );
}
