import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { listCustomers } from "@/app/lib/services/crm";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import {
  Users,
  Search,
  ArrowRight,
  Phone,
  Pill,
  FileText,
  X,
} from "lucide-react";

export const metadata = { title: "Customers" };

const PAGE_SIZE = 25;

const TIER_COLOR: Record<string, string> = {
  bronze: "bg-amber-500/15 text-amber-700",
  silver: "bg-slate-300/15 text-slate-200",
  gold: "bg-yellow-400/15 text-yellow-300",
  platinum: "bg-cyan-400/15 text-cyan-700",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  // Count first so we can clamp the page, then load the page slice.
  const countResult = await listCustomers(sp.q, { take: 1, skip: 0 });
  const total = countResult.total;
  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const { customers } = await listCustomers(sp.q, {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  const queryParams: Record<string, string | undefined> = { q: sp.q };

  return (
    <AdminShell
      user={user}
      title="Customer CRM"
      subtitle={`${total} customer${total === 1 ? "" : "s"} on file`}
    >
      {/* Search bar with explicit submit + clear buttons */}
      <form className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 admin-soft" />
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Search name, email, or phone…"
            className="w-full rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] py-2.5 pl-10 pr-10 text-sm admin-text placeholder:admin-soft focus:border-[var(--admin-accent)] focus:bg-[var(--admin-inset-2)] focus:outline-none"
          />
          {sp.q && (
            <Link
              href="/admin/customers"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-110"
        >
          <Search className="h-3.5 w-3.5" /> Search
        </button>
        {sp.q && (
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset-2)] px-3 py-2 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-inset)] hover:text-[var(--admin-text)]"
          >
            <X className="h-3 w-3" /> Clear
          </Link>
        )}
      </form>

      <AdminPanel>
        {customers.length === 0 ? (
          <AdminEmptyState
            icon={Users}
            title="No customers found"
            description={sp.q ? "Try a different search term." : "New customers will appear here once they register."}
          />
        ) : (
          <div className="overflow-x-auto scroll-admin">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Segments</th>
                  <th>Loyalty</th>
                  <th>Activity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const initials = c.fullName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join("");
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-[10px] font-bold text-[var(--admin-btn-fg)]">
                            {initials || "?"}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/customers/${c.id}`}
                              className="font-semibold admin-text hover:admin-accent-text hover:underline"
                            >
                              {c.fullName}
                            </Link>
                            <p className="truncate text-xs admin-soft">{c.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-xs admin-muted">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </span>
                        ) : (
                          <span className="text-xs admin-soft">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {c.segments.slice(0, 3).map((s) => (
                            <span
                              key={s.segmentId}
                              className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-[10px] admin-accent-text"
                            >
                              {s.segment.name}
                            </span>
                          ))}
                          {c.segments.length === 0 && (
                            <span className="text-xs admin-soft">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {c.loyaltyAccount ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold admin-text">
                              {c.loyaltyAccount.points}
                            </span>
                            <span className="text-[10px] admin-soft">pts</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TIER_COLOR[c.loyaltyAccount.tier] || "bg-slate-500/15 text-slate-600"}`}>
                              {c.loyaltyAccount.tier}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs admin-soft">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-3 text-xs admin-text/60">
                          <span className="inline-flex items-center gap-1" title="Refills">
                            <Pill className="h-3 w-3" /> {c._count.refillRequests}
                          </span>
                          <span className="inline-flex items-center gap-1" title="Prescriptions">
                            <FileText className="h-3 w-3" /> {c._count.prescriptions}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-inset)] px-2.5 py-1 text-xs font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
                        >
                          Open <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/customers"
          queryParams={queryParams}
          variant="admin"
        />
      </AdminPanel>
    </AdminShell>
  );
}
