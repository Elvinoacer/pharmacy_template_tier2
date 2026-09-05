import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import {
  ArrowLeft, Library, ScanBarcode, Sparkles, FileSpreadsheet, Plug, Pencil, Lock,
} from "lucide-react";

export const metadata = { title: "Add Medication — Choose method" };

type MethodCard = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
};

const METHODS: MethodCard[] = [
  {
    href: "/admin/medications/library",
    icon: Library,
    title: "Search Shared Medication Library",
    description: "Search the universal clinical registry (MedicationMaster). Add to your pharmacy by filling only price, stock, supplier. Recommended.",
    badge: "Recommended",
  },
  {
    href: "/admin/medications/scan",
    icon: ScanBarcode,
    title: "Scan Barcode / QR Code",
    description: "Camera scan or manual entry. Looks up against MedicationMaster.barcode and falls back to AI import if not found.",
  },
  {
    href: "/admin/medications/import/ai",
    icon: Sparkles,
    title: "AI-Assisted Import",
    description: "Provider-agnostic. Copy our prompt, use your own AI (ChatGPT, Claude, Gemini, Grok, GLM, Kimi), paste back the structured JSON.",
  },
  {
    href: "/admin/medications/import/csv",
    icon: FileSpreadsheet,
    title: "Import from Excel / CSV",
    description: "Upload .xlsx or .csv, map columns, preview, import. Matches against existing MedicationMaster records first to avoid duplicates.",
  },
  {
    href: "/admin/medications/new",
    icon: Pencil,
    title: "Manual Entry",
    description: "Full 5-section form. The fallback — every other acquisition method funnels through the same validation layer.",
  },
  {
    href: "#",
    icon: Plug,
    title: "Sync from Pharmacy Software / POS",
    description: "Direct POS sync via /api/integrations/pos. Coming in a future release.",
    disabled: true,
  },
];

export default async function AddMedicationChooserPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AdminShell
      user={user}
      title="Add a medicine"
      subtitle="Choose a method to add medicines to your pharmacy catalogue."
    >
      <div className="mb-6">
        <Link
          href="/admin/medications"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Catalog
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-2">
          {METHODS.map((m, i) => {
            const Icon = m.icon;
            if (m.disabled) {
              return (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-6 opacity-70 dark:border-white/10 dark:bg-black/10"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 text-gray-400 dark:bg-white/5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400">
                      Coming soon
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">{m.title}</h3>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{m.description}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:bg-white/5">
                    <Lock className="h-3 w-3" /> Reserved
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={i}
                href={m.href}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/40 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 hover:ring-emerald-500/30 dark:border-white/10 dark:bg-black/20 dark:ring-white/10 dark:hover:ring-emerald-500/50"
              >
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10" />
                </div>
                <div className="relative">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                      <Icon className="h-5 w-5" />
                    </div>
                    {m.badge && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{m.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{m.description}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset)] px-3 py-1.5 text-xs font-semibold admin-text group-hover:bg-emerald-500/10 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    Start <ArrowLeft className="h-3 w-3 rotate-180 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">All methods share one validation layer</p>
          <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-400/80">
            Regardless of how you add a medication, the same Phase 4 validation runs (duplicate detection, barcode/SKU uniqueness, OTC/Rx consistency) and you see a review screen before final save. The shared library grows with every import — so the next pharmacy benefits.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
