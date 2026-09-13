import { withPlatformBypass } from "@/app/lib/tenant-context";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, EmptyState } from "@/app/components/portal/PortalWidgets";
import { formatDateTime } from "@/app/lib/time";
import { formatPrice } from "@/app/lib/format";
import { MpesaPayButton } from "@/app/components/portal/MpesaPayButton";
import { ShoppingCart, Plus } from "lucide-react";

export const metadata = { title: "My orders" };

export default async function PortalOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string; orderId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();
  return withPlatformBypass(async () => {
  const sp = await searchParams;

  const orders = await prisma.order.findMany({
    where: { customerId: user.customerId },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const profile = await prisma.customerProfile.findUnique({
    where: { id: user.customerId! },
    select: { phone: true },
  });

  const highlight = sp.orderId || sp.placed;

  return (
    <PortalShell
      user={user}
      title="Orders & payments"
      subtitle="OTC purchases and refill payments."
      actions={
        <Link href="/medicines" className="btn-primary w-full justify-center !py-2 text-xs sm:w-auto">
          <Plus className="h-3.5 w-3.5" /> New OTC order
        </Link>
      }
    >
      {sp.placed && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm leading-relaxed text-emerald-800 sm:px-4">
          Order reserved — stock is held. Pay with M-Pesa below or at the counter; staff will
          dispatch when you collect.
        </div>
      )}

      <Panel title="Your orders" description={`${orders.length} recent`}>
        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="Order OTC products online or pay for approved refills here."
          />
        ) : (
          <ul className="space-y-2.5 sm:space-y-3">
            {orders.map((o) => {
              const isHighlight = highlight === o.id;
              const pendingPay = o.status === "pending";
              const isDispatched = Boolean(o.dispatchedAt) || o.status === "fulfilled";
              return (
                <li
                  key={o.id}
                  className={`min-w-0 rounded-xl border p-3 sm:p-4 ${
                    isHighlight
                      ? "border-[var(--brand)] bg-[var(--brand-tint)]"
                      : "border-[var(--line)] bg-[var(--card)]"
                  }`}
                >
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words text-sm font-semibold text-[var(--foreground)] sm:text-base">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            o.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : o.status === "fulfilled"
                                ? "bg-blue-100 text-blue-700"
                              : o.status === "waived"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {o.status}
                        </span>
                        {isDispatched ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            dispatched
                          </span>
                        ) : o.status === "paid" ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            ready for collection
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[var(--card-elev)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                          {o.source}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(o.createdAt)}</p>
                      {o.payments[0] && (
                        <p className="mt-0.5 break-words text-[10px] leading-relaxed text-[var(--muted-2)]">
                          Last payment: {o.payments[0].provider} · {o.payments[0].status}
                        </p>
                      )}
                    </div>
                    <div className="flex w-full items-center justify-between gap-3 border-t border-[var(--line)] pt-3 sm:w-auto sm:block sm:border-0 sm:pt-0 sm:text-right">
                      <p className="shrink-0 font-bold text-[var(--foreground)]">{formatPrice(Number(o.total))}</p>
                      {pendingPay && (
                        <div className="min-w-0 sm:mt-2">
                          <MpesaPayButton
                            orderId={o.id}
                            defaultPhone={o.guestPhone || profile?.phone || ""}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </PortalShell>
  );
  });
}
