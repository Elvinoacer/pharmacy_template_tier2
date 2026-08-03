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
    where: { id: user.customerId },
    select: { phone: true },
  });

  const highlight = sp.orderId || sp.placed;

  return (
    <PortalShell
      user={user}
      title="Orders & payments"
      subtitle="OTC purchases and refill payments."
      actions={
        <Link href="/portal/orders/new" className="btn-primary !py-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> New OTC order
        </Link>
      }
    >
      {sp.placed && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Order placed successfully. Pay with M-Pesa below or settle at the pharmacy counter.
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
          <ul className="space-y-3">
            {orders.map((o) => {
              const isHighlight = highlight === o.id;
              const pendingPay = o.status === "pending";
              return (
                <li
                  key={o.id}
                  className={`rounded-xl border p-4 ${
                    isHighlight
                      ? "border-[#0d6e5a] bg-[#f0faf6]"
                      : "border-[#e3ebe6] bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#0c1a14]">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            o.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : o.status === "waived"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {o.status}
                        </span>
                        <span className="rounded-full bg-[#f4f7f4] px-2 py-0.5 text-[10px] text-[#5a6b62]">
                          {o.source}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5a6b62]">{formatDateTime(o.createdAt)}</p>
                      {o.payments[0] && (
                        <p className="mt-0.5 text-[10px] text-[#8a9a92]">
                          Last payment: {o.payments[0].provider} · {o.payments[0].status}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0c1a14]">{formatPrice(Number(o.total))}</p>
                      {pendingPay && (
                        <div className="mt-2">
                          <MpesaPayButton
                            orderId={o.id}
                            defaultPhone={profile?.phone || ""}
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
}
