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
  Mail,
  Layers,
} from "lucide-react";

export const metadata = { title: "Customers" };

const PAGE_SIZE = 25;

const TIER_COLOR: Record<string, string> = {
  bronze: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  silver: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  gold: "bg-yellow-400/15 text-yellow-800 dark:text-yellow-300",
  platinum: "bg-cyan-400/15 text-cyan-800 dark:text-cyan-300",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

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
      title="Patients & customers"
      subtitle={`${total} customer${total === 1 ? "" : "s"} on file`}
    >
      <div className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 shadow-sm sm:p-4">
        <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 admin-soft" />
            <input
              name="q"
              defaultValue={sp.q || ""}
              placeholder="Search name, email, or phone…"
              className="min-h-11 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] py-2.5 pl-10 pr-12 text-base admin-text placeholder:admin-soft transition focus:border-[var(--admin-accent)] focus:bg-[var(--admin-card)] focus:outline-none sm:text-sm"
            />
            {sp.q && (
              <Link
                href="/admin/customers"
                className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-110 sm:w-auto"
          >
            <Search className="h-3.5 w-3.5" /> Search
          </button>
          {sp.q && (
            <Link
              href="/admin/customers"
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-inset-2)] px-3 py-2 text-sm font-semibold admin-muted transition hover:bg-[var(--admin-inset)] hover:text-[var(--admin-text)] sm:w-auto"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Link>
          )}
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-border)] pt-3 text-sm admin-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 admin-accent-text" />
            {sp.q ? `${total} matching records` : `${total} total records`}
          </span>
          <span>Tap a customer to open their clinical and commerce workspace.</span>
        </div>
      </div>

      <AdminPanel>
        {customers.length === 0 ? (
          <AdminEmptyState
            icon={Users}
            title="No customers found"
            description={sp.q ? "Try a different search term." : "New customers will appear here once they register."}
          />
        ) : (
          <>
            <div className="grid gap-3 sm:hidden">
              {customers.map((c) => {
                const initials = c.fullName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("");

                return (
                  <article
                    key={c.id}
                    className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-card)] hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-sm font-bold text-[var(--admin-btn-fg)]">
                        {initials || "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="flex min-h-11 items-center break-words text-sm font-semibold admin-text hover:admin-accent-text"
                        >
                          {c.fullName}
                        </Link>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm admin-muted">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="break-all">{c.user.email}</span>
                        </p>
                        {c.phone && (
                          <p className="mt-1 flex items-center gap-1.5 text-sm admin-muted">
                            <Phone className="h-3 w-3 shrink-0" /> {c.phone}
                          </p>
                        )}
                      </div>
                      {c.loyaltyAccount && (
                        <span className={`shrink-0 rounded-full px-2 py-1 text-sm font-bold uppercase tracking-wide ${TIER_COLOR[c.loyaltyAccount.tier] || "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                          {c.loyaltyAccount.tier}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-[var(--admin-card)] p-2.5 text-center">
                        <Pill className="mx-auto h-3.5 w-3.5 admin-accent-text" />
                        <p className="mt-1 text-sm font-bold admin-text">{c._count.refillRequests}</p>
                        <p className="text-sm uppercase tracking-wide admin-soft">Refills</p>
                      </div>
                      <div className="rounded-xl bg-[var(--admin-card)] p-2.5 text-center">
                        <FileText className="mx-auto h-3.5 w-3.5 admin-accent-text" />
                        <p className="mt-1 text-sm font-bold admin-text">{c._count.prescriptions}</p>
                        <p className="text-sm uppercase tracking-wide admin-soft">Rx</p>
                      </div>
                      <div className="rounded-xl bg-[var(--admin-card)] p-2.5 text-center">
                        <span className="text-sm font-bold admin-accent-text">{c.loyaltyAccount?.points ?? 0}</span>
                        <p className="mt-1 text-sm uppercase tracking-wide admin-soft">Points</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-start gap-2">
                      <Layers className="mt-1 h-3.5 w-3.5 shrink-0 admin-soft" />
                      <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                        {c.segments.slice(0, 3).map((s) => (
                          <span key={s.segmentId} className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-1 text-sm font-medium admin-accent-text">
                            {s.segment.name}
                          </span>
                        ))}
                        {c.segments.length === 0 && <span className="text-sm admin-soft">No segments</span>}
                      </div>
                    </div>

                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-3 py-2 text-sm font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-110"
                    >
                      Open customer <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                );
              })}
            </div>

            <div tabIndex={0} role="region" aria-label="Scrollable customer records" className="admin-table-region hidden overflow-x-auto scroll-admin sm:block">
              <table className="table-admin min-w-[56rem]">
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
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-2)] text-sm font-bold text-[var(--admin-btn-fg)]">
                              {initials || "?"}
                            </span>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/customers/${c.id}`}
                                className="inline-flex min-h-11 items-center font-semibold admin-text hover:admin-accent-text hover:underline"
                              >
                                {c.fullName}
                              </Link>
                              <p className="break-all text-sm admin-soft">{c.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {c.phone ? (
                            <span className="inline-flex items-center gap-1.5 text-sm admin-muted">
                              <Phone className="h-3 w-3" /> {c.phone}
                            </span>
                          ) : (
                            <span className="text-sm admin-soft">—</span>
                          )}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {c.segments.slice(0, 3).map((s) => (
                              <span
                                key={s.segmentId}
                                className="rounded-full bg-[var(--admin-inset-2)] px-2 py-0.5 text-sm admin-accent-text"
                              >
                                {s.segment.name}
                              </span>
                            ))}
                            {c.segments.length === 0 && (
                              <span className="text-sm admin-soft">—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {c.loyaltyAccount ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold admin-text">
                                {c.loyaltyAccount.points}
                              </span>
                              <span className="text-sm admin-soft">pts</span>
                              <span className={`rounded-full px-2 py-0.5 text-sm font-semibold uppercase ${TIER_COLOR[c.loyaltyAccount.tier] || "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                                {c.loyaltyAccount.tier}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm admin-soft">—</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-3 text-sm admin-muted">
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
                            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--admin-inset)] px-3 py-2 text-sm font-semibold admin-accent-text transition hover:bg-[var(--admin-inset-2)]"
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
          </>
        )}
        <div className="[&_a]:min-h-11 [&_a]:min-w-11 [&_a]:text-sm [&_span]:min-h-11 [&_span]:min-w-11 [&_span]:text-sm">
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            basePath="/admin/customers"
            queryParams={queryParams}
            variant="admin"
          />
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
