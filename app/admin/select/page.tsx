import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { switchPharmacyAction } from "@/app/actions/tenant-admin";
import { prismaUnscoped } from "@/app/lib/db";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose pharmacy" };

export default async function SelectPharmacyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/select");
  if (user.memberships.length === 0 && !user.platformAdmin) {
    redirect("/onboard");
  }

  const extra =
    user.platformAdmin && user.memberships.length === 0
      ? await prismaUnscoped.pharmacy.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, status: true },
        })
      : [];

  const options =
    user.memberships.length > 0
      ? user.memberships.map((m) => ({
          pharmacyId: m.pharmacyId,
          name: m.name,
          role: m.role,
        }))
      : extra.map((p) => ({
          pharmacyId: p.id,
          name: p.name,
          role: p.status,
        }));

  return (
    <main className="admin-workspace mesh-bg min-h-screen px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-2xl items-center sm:min-h-[calc(100dvh-5rem)]">
        <section className="admin-card w-full overflow-hidden rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-xl sm:rounded-[30px]">
          <div className="border-b border-[var(--admin-border)] bg-[var(--admin-inset)] px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-accent-soft)] admin-accent-text">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] admin-accent-text">Workspace access</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight admin-text sm:text-3xl">Choose a pharmacy</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 admin-muted">
                  {user.platformAdmin
                    ? "Choose the pharmacy whose records and daily operations you want to manage."
                    : "Choose the pharmacy you want to work in. You can switch again later from the admin workspace."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-xs font-semibold admin-muted">
                {options.length} {options.length === 1 ? "workspace" : "workspaces"} available
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold admin-soft">
                <ShieldCheck className="h-3.5 w-3.5" /> Access controlled
              </span>
            </div>

            <ul className="space-y-2.5">
              {options.map((m) => (
                <li key={m.pharmacyId}>
                  <form action={switchPharmacyAction}>
                    <input type="hidden" name="pharmacyId" value={m.pharmacyId} />
                    <button className="group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] focus-visible:outline-none sm:px-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] admin-accent-text">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold admin-text sm:text-base">{m.name}</span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide admin-muted">
                          <CheckCircle2 className="h-3 w-3" /> {m.role.replaceAll("_", " ")}
                        </span>
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--admin-text-soft)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--admin-accent-text)]">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <p className="mt-5 px-1 text-xs leading-5 admin-soft">
              Selecting a workspace changes the active pharmacy context before opening the admin dashboard.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
