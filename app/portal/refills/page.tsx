import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { refillStatusMeta } from "@/app/lib/types";
import { cancelRefillAction } from "@/app/actions/portal";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
import {
  Plus,
  Pill,
  Clock,
  MapPin,
  XCircle,
} from "lucide-react";

export const metadata = { title: "My refills" };

export default async function PortalRefillsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");

  const refills = await prisma.refillRequest.findMany({
    where: { customerId: user.customerId },
    orderBy: { createdAt: "desc" },
  });

  const active = refills.filter((r) => !["collected", "cancelled"].includes(r.status));
  const past = refills.filter((r) => ["collected", "cancelled"].includes(r.status));

  return (
    <PortalShell
      user={user}
      title="Refill requests"
      subtitle="Track and manage every refill you've submitted."
      actions={
        <Link href="/portal/refills/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New refill
        </Link>
      }
    >
      {/* Active requests */}
      <Panel
        title="Active"
        description={`${active.length} in progress`}
        className="mb-6"
      >
        {active.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No active refills"
            description="When you submit a refill, it'll show up here with live status updates."
            action={
              <Link href="/portal/refills/new" className="btn-primary !py-2 text-sm">
                <Plus className="h-4 w-4" /> Request a refill
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {active.map((r) => {
              const meta = refillStatusMeta(r.status);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e3ebe6] bg-white p-4 transition hover:border-[#0d6e5a]/30 hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                    <Pill className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#0c1a14]">{r.medicineName}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5a6b62]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <MapPin className="h-3 w-3" />
                        {r.pickupPreference}
                      </span>
                      {r.rxReference && <span>Rx {r.rxReference}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={meta.color}>{meta.label}</Badge>
                    <form action={cancelRefillAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="btn-icon text-rose-600 hover:bg-rose-50"
                        title="Cancel this refill"
                        aria-label="Cancel"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Past requests */}
      <Panel
        title="History"
        description={`${past.length} completed or cancelled`}
      >
        {past.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#5a6b62]">No history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-premium">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Submitted</th>
                  <th>Pickup</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((r) => {
                  const meta = refillStatusMeta(r.status);
                  return (
                    <tr key={r.id}>
                      <td>
                        <p className="font-semibold text-[#0c1a14]">{r.medicineName}</p>
                        <p className="text-xs text-[#5a6b62]">{r.rxReference || "—"}</p>
                      </td>
                      <td className="text-[#5a6b62]">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="capitalize text-[#5a6b62]">{r.pickupPreference}</td>
                      <td>
                        <Badge className={meta.color}>{meta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PortalShell>
  );
}
