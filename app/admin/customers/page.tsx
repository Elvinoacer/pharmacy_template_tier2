import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { listCustomers } from "@/app/lib/services/crm";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import {
  Users,
  Search,
  ArrowRight,
  Phone,
  Pill,
  FileText,
} from "lucide-react";

export const metadata = { title: "Customers" };

const TIER_COLOR: Record<string, string> = {
  bronze: "bg-amber-500/15 text-amber-300",
  silver: "bg-slate-300/15 text-slate-200",
  gold: "bg-yellow-400/15 text-yellow-300",
  platinum: "bg-cyan-400/15 text-cyan-300",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const customers = await listCustomers(sp.q);

  return (
    <AdminShell
      user={user}
      title="Customer CRM"
      subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"} on file`}
    >
      {/* Search bar */}
      <form className="mb-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ecfdf5]/40" />
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Search name, email, or phone…"
            className="w-full rounded-full border border-white/[0.08] bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#ecfdf5]/40 focus:border-[#2dd4bf]/60 focus:bg-white/[0.06] focus:outline-none"
          />
        </div>
      </form>

      <AdminPanel>
        {customers.length === 0 ? (
          <AdminEmptyState
            icon={Users}
            title="No customers found"
            description={sp.q ? "Try a different search term." : "New customers will appear here once they register."}
          />
        ) : (
          <div className="overflow-x-auto scroll-thin-dark">
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
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2dd4bf] to-[#0f766e] text-[10px] font-bold text-[#042f2e]">
                            {initials || "?"}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/customers/${c.id}`}
                              className="font-semibold text-white hover:text-[#2dd4bf] hover:underline"
                            >
                              {c.fullName}
                            </Link>
                            <p className="truncate text-xs text-[#ecfdf5]/45">{c.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#ecfdf5]/70">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-[#ecfdf5]/40">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {c.segments.slice(0, 3).map((s) => (
                            <span
                              key={s.segmentId}
                              className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#2dd4bf]"
                            >
                              {s.segment.name}
                            </span>
                          ))}
                          {c.segments.length === 0 && (
                            <span className="text-xs text-[#ecfdf5]/40">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {c.loyaltyAccount ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-white">
                              {c.loyaltyAccount.points}
                            </span>
                            <span className="text-[10px] text-[#ecfdf5]/45">pts</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TIER_COLOR[c.loyaltyAccount.tier] || "bg-slate-500/15 text-slate-300"}`}>
                              {c.loyaltyAccount.tier}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#ecfdf5]/40">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-3 text-xs text-[#ecfdf5]/60">
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
                          className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-[#2dd4bf] transition hover:bg-white/[0.1]"
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
      </AdminPanel>
    </AdminShell>
  );
}
