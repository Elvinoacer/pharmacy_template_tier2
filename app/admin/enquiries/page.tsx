import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { EnquiryUpdateForm } from "@/app/components/admin/EnquiryUpdateForm";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { Mail, Clock, Inbox, User, Search, X, Phone } from "lucide-react";
import { formatDateTime } from "@/app/lib/time";
import type { Prisma } from "@/app/generated/prisma/client";

export const metadata = { title: "Enquiries" };

const PAGE_SIZE = 25;

const STATUS_COLOR: Record<string, string> = {
  new: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  in_progress: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

const TYPE_ICON: Record<string, string> = {
  general: "💬",
  product_availability: "📦",
  delivery: "🚚",
  contact: "📧",
  careers: "💼",
  other: "❓",
};

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const where: Prisma.EnquiryWhereInput = sp.q
    ? {
        OR: [
          { name: { contains: sp.q, mode: "insensitive" } },
          { email: { contains: sp.q, mode: "insensitive" } },
          { phone: { contains: sp.q, mode: "insensitive" } },
          { subject: { contains: sp.q, mode: "insensitive" } },
          { message: { contains: sp.q, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, statusGroups] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.groupBy({ by: ["status"], _count: true }),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const enquiries = await prisma.enquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    include: { customer: { select: { fullName: true } } },
  });

  const counts = {
    new: statusGroups.find((g) => g.status === "new")?._count ?? 0,
    in_progress: statusGroups.find((g) => g.status === "in_progress")?._count ?? 0,
    resolved: statusGroups.find((g) => g.status === "resolved")?._count ?? 0,
    closed: statusGroups.find((g) => g.status === "closed")?._count ?? 0,
  };

  const queryParams: Record<string, string | undefined> = { q: sp.q };

  return (
    <AdminShell
      user={user}
      title="Patient enquiries"
      subtitle={`${total} enquir${total === 1 ? "y" : "ies"} from website, portal, and AI`}
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["new", "in_progress", "resolved", "closed"] as const).map((s) => (
          <div key={s} className="admin-stat min-h-24 p-4 transition-[border-color,box-shadow] duration-200 hover:shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] admin-muted">
              {s.replace("_", " ")}
            </p>
            <p className="mt-1 text-2xl font-bold admin-text">{counts[s]}</p>
          </div>
        ))}
      </div>

      <AdminPanel>
        <form className="mb-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="q"
              defaultValue={sp.q || ""}
              placeholder="Search name, email, subject, message…"
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] py-2.5 pl-9 pr-3 text-sm admin-text placeholder:admin-soft transition focus:border-[var(--admin-accent)] focus:bg-[var(--admin-card)] focus:outline-none"
            />
          </div>
          <button type="submit" className="btn-admin-sm w-full justify-center sm:w-auto">
            <Search className="h-3.5 w-3.5" /> Search
          </button>
          {sp.q && (
            <Link href="/admin/enquiries" className="btn-admin-sm w-full justify-center !bg-[var(--admin-inset-2)] sm:w-auto">
              <X className="h-3.5 w-3.5" /> Clear
            </Link>
          )}
        </form>

        {enquiries.length === 0 ? (
          <AdminEmptyState
            icon={Inbox}
            title="No enquiries yet"
            description={sp.q ? "Try a different search term." : "Customer enquiries from the website contact form will land here."}
          />
        ) : (
          <div className="space-y-3">
            {enquiries.map((e) => (
              <article
                key={e.id}
                className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,box-shadow,background-color] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-card)] hover:shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-card)] text-lg shadow-sm" aria-hidden="true">
                        {TYPE_ICON[e.type] || "💬"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold admin-text">{e.name}</p>
                        <p className="text-xs capitalize admin-muted">{e.type.replace("_", " ")}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_COLOR[e.status]}`}>
                        {e.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-1.5 text-xs admin-muted sm:grid-cols-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{e.email || "No email"}</span>
                      </span>
                      {e.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {e.phone}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 sm:col-span-2">
                        <Clock className="h-3.5 w-3.5 shrink-0" /> {formatDateTime(e.createdAt)}
                      </span>
                    </div>

                    {e.customer && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[11px] font-medium admin-accent-text">
                        <User className="h-3 w-3" /> Registered customer
                      </div>
                    )}

                    {e.subject && (
                      <p className="mt-4 text-sm font-semibold admin-text">{e.subject}</p>
                    )}
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 admin-text">{e.message}</p>
                    {e.staffNotes && (
                      <p className="mt-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-2 text-xs leading-5 admin-muted">
                        <strong className="admin-accent-text">Staff notes:</strong> {e.staffNotes}
                      </p>
                    )}
                  </div>
                </div>
                <EnquiryUpdateForm
                  id={e.id}
                  status={e.status}
                  staffNotes={e.staffNotes || ""}
                />
              </article>
            ))}
          </div>
        )}
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/admin/enquiries"
          queryParams={queryParams}
          variant="admin"
        />
      </AdminPanel>
    </AdminShell>
  );
}
