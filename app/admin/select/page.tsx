import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { switchPharmacyAction } from "@/app/actions/tenant-admin";
import { prismaUnscoped } from "@/app/lib/db";

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
    <div className="mesh-bg flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
          Which pharmacy?
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {user.platformAdmin
            ? "Choose a pharmacy to view its records and manage its daily work."
            : "Choose the pharmacy you want to work with."}
        </p>
        <ul className="mt-6 space-y-2">
          {options.map((m) => (
            <li key={m.pharmacyId}>
              <form action={switchPharmacyAction}>
                <input type="hidden" name="pharmacyId" value={m.pharmacyId} />
                <button className="flex w-full items-center justify-between rounded-2xl border border-teal-900/10 px-4 py-3 text-left hover:bg-teal-50">
                  <span>
                    <span className="block font-semibold text-[var(--foreground)]">{m.name}</span>
                    <span className="text-xs uppercase text-[var(--muted)]">{m.role}</span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
