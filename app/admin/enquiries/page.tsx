import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { EnquiryUpdateForm } from "@/app/components/admin/EnquiryUpdateForm";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { Mail, Clock, Inbox, User, Search, X } from "lucide-react";
import { formatDateTime } from "@/app/lib/time";
import type { Prisma } from "@/app/generated/prisma/client";

export const metadata = { title: "Enquiries" };

const PAGE_SIZE = 25;

const STATUS_COLOR: Record<string, string> = {
  new: "bg-rose-500/15 text-rose-600",
  in_progress: "bg-amber-500/15 text-amber-700",
  resolved: "bg-emerald-500/15 text-emerald-700",
  closed: "bg-slate-500/15 text-slate-600",
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
      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["new", "in_progress", "resolved", "closed"] as const).map((s) => (
          <div key={s} className="admin-stat p-4">
            <p className="text-xs font-semibold uppercase tracking-wide admin-muted">
              {s.replace("_", " ")}
            </p>
            <p className="mt-1 text-2xl font-bold admin-text">{counts[s]}</p>
          </div>
        ))}
      </div>

      <AdminPanel>
        <form className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="q"
              defaultValue={sp.q || ""}
              placeholder="Search name, email, subject, message…"
              className="w-full rounded-full border border-[var(--admin-border)] bg-[var(--admin-inset)] py-2 pl-9 pr-3 text-xs admin-text placeholder:admin-soft focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>
          <button type="submit" className="btn-admin-sm">
            <Search className="h-3 w-3" /> Search
          </button>
          {sp.q && (
            <Link href="/admin/enquiries" className="btn-admin-sm !bg-[var(--admin-inset-2)]">
              <X className="h-3 w-3" /> Clear
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
              <div
                key={e.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition hover:border-[var(--admin-border-2)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TYPE_ICON[e.type] || "💬"}</span>
                      <p className="font-semibold admin-text">{e.name}</p>
                      {e.customer && (
                        <span className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-0.5 text-xs font-medium admin-accent-text">
                          <User className="mr-0.5 inline h-2.5 w-2.5" />
                          Registered
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLOR[e.status]}`}>
                        {e.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs admin-muted">
                      <span className="capitalize">{e.type.replace("_", " ")}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> {e.email || "no email"}
                      </span>
                      {e.phone && (
                        <>
                          <span>·</span>
                          <span>{e.phone}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDateTime(e.createdAt)}
                      </span>
                    </p>
                    {e.subject && (
                      <p className="mt-2 text-sm font-medium admin-text">{e.subject}</p>
                    )}
                    <p className="mt-1 text-sm admin-text">{e.message}</p>
                    {e.staffNotes && (
                      <p className="mt-2 rounded-lg bg-[var(--admin-inset)] px-3 py-1.5 text-xs admin-muted">
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
              </div>
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
