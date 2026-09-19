import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { AdminShell } from "@/app/components/admin/AdminShell";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Library,
  Lock,
  Pencil,
  Plug,
  ScanBarcode,
  Sparkles,
  Zap,
} from "lucide-react";

export const metadata = { title: "Add Medication — Choose method" };

type MethodCard = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  helper?: string;
  priority?: number;
  disabled?: boolean;
};

const METHODS: MethodCard[] = [
  {
    href: "/admin/medications/library",
    icon: Library,
    title: "Search shared library",
    description:
      "Find an existing clinical record and add only your pharmacy-specific price, stock, shelf and supplier details.",
    badge: "Recommended",
    helper: "Fastest and lowest-risk option",
    priority: 1,
  },
  {
    href: "/admin/medications/scan",
    icon: ScanBarcode,
    title: "Scan barcode / QR",
    description:
      "Scan with the camera or enter a code manually. Existing shared records are reused automatically when possible.",
    helper: "Best while receiving stock",
    priority: 2,
  },
  {
    href: "/admin/medications/import/ai",
    icon: Sparkles,
    title: "AI-assisted import",
    description:
      "Use your preferred AI provider to structure medicine information, then review the JSON before importing it.",
    helper: "Useful for unfamiliar packs",
    priority: 3,
  },
  {
    href: "/admin/medications/import/csv",
    icon: FileSpreadsheet,
    title: "Import Excel / CSV",
    description:
      "Upload a spreadsheet, map columns, preview matches and import in bulk without creating duplicate master records.",
    helper: "Best for catalogue migrations",
    priority: 4,
  },
  {
    href: "/admin/medications/new",
    icon: Zap,
    title: "Quick manual entry",
    description:
      "Add the essentials in one short form: name, strength, price, stock, access and a pack image.",
    badge: "Fastest manual path",
    helper: "About 30 seconds",
    priority: 5,
  },
  {
    href: "/admin/medications/new?mode=full",
    icon: Pencil,
    title: "Full manual entry",
    description:
      "Use the complete medicine form when you need clinical notes, relationships, storage guidance or every catalogue field.",
    helper: "Most detailed option",
    priority: 6,
  },
  {
    href: "#",
    icon: Plug,
    title: "Sync from pharmacy software / POS",
    description: "Direct POS catalogue sync is reserved for a future integration release.",
    helper: "Automation path",
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
      subtitle="Choose the fastest safe acquisition path for the medicine you are adding."
    >
      <div className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admin/medications"
            className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 text-sm font-semibold admin-muted transition hover:border-[var(--admin-border-2)] hover:text-[var(--admin-text)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to catalogue
          </Link>
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Zap className="h-3.5 w-3.5" />
            Start with the shared library whenever possible
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {METHODS.map((m) => {
            const Icon = m.icon;

            if (m.disabled) {
              return (
                <div
                  key={m.title}
                  aria-disabled="true"
                  className="relative flex min-h-[190px] flex-col rounded-2xl border border-dashed border-[var(--admin-border-2)] bg-[var(--admin-inset)] p-4 opacity-70 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] admin-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset-2)] px-2.5 py-1 text-[11px] font-bold admin-muted">
                      <Lock className="h-3 w-3" /> Coming soon
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold admin-text">{m.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 admin-muted">{m.description}</p>
                  <p className="mt-auto pt-4 text-xs font-semibold admin-soft">{m.helper}</p>
                </div>
              );
            }

            return (
              <Link
                key={m.title}
                href={m.href}
                className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 sm:p-5"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    {m.priority && (
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] admin-soft">
                        Option {m.priority}
                      </span>
                    )}
                  </div>
                  {m.badge && (
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                      {m.badge}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-bold admin-text">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-6 admin-muted">{m.description}</p>

                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <span className="text-xs font-semibold admin-soft">{m.helper}</span>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-inset)] admin-text transition group-hover:bg-emerald-500 group-hover:text-white">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-sky-800 dark:text-sky-200">Every method ends with the same validation gate</p>
              <p className="mt-1 text-sm leading-6 text-sky-800/80 dark:text-sky-200/80">
                Duplicate detection, barcode and SKU uniqueness, and OTC/Rx consistency are checked before final save. You still review the record before it enters the catalogue.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
