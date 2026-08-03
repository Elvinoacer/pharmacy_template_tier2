import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel } from "@/app/components/portal/PortalWidgets";
import { PortalOrderForm } from "@/app/components/portal/PortalOrderForm";
import { formatPrice } from "@/app/lib/format";
import { ShoppingCart, ArrowLeft } from "lucide-react";

export const metadata = { title: "Order OTC medication" };

export default async function PortalNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ medicationId?: string; slug?: string }>;
}) {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login?next=/portal/orders/new");
  await requireOnboarded();
  const sp = await searchParams;

  const med = sp.medicationId
    ? await prisma.medication.findFirst({
        where: { id: sp.medicationId, active: true, overTheCounter: true },
      })
    : sp.slug
      ? await prisma.medication.findFirst({
          where: { slug: sp.slug, active: true, overTheCounter: true },
        })
      : null;

  const otcMeds = await prisma.medication.findMany({
    where: { active: true, overTheCounter: true, stockQty: { gt: 0 } },
    orderBy: { name: "asc" },
    take: 100,
  });

  const profile = await prisma.customerProfile.findUnique({
    where: { id: user.customerId },
    select: { phone: true },
  });

  return (
    <PortalShell
      user={user}
      title="Order OTC medication"
      subtitle="Purchase over-the-counter items online. Pay with M-Pesa or collect and pay in store."
      actions={
        <Link href="/medicines" className="btn-ghost !py-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Catalogue
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="lg:col-span-1">
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0c1a14]">OTC only</p>
                <p className="mt-0.5 text-xs text-[#5a6b62]">
                  Prescription medicines must be requested as a refill. Only over-the-counter
                  products can be ordered here.
                </p>
              </div>
            </div>
            {med && (
              <div className="mt-4 rounded-xl bg-[#f4f7f4] p-3 text-sm">
                <p className="font-semibold text-[#0c1a14]">{med.name}</p>
                <p className="mt-1 text-xs text-[#5a6b62]">
                  {formatPrice(Number(med.price))} · {med.stockQty} in stock
                </p>
              </div>
            )}
          </Panel>
        </aside>

        <div className="lg:col-span-2">
          <Panel title="Place order" description="Select a product, quantity, and optional coupon">
            <PortalOrderForm
              medications={otcMeds.map((m) => ({
                id: m.id,
                name: m.name,
                price: Number(m.price),
                stockQty: m.stockQty,
              }))}
              defaultMedicationId={med?.id || sp.medicationId || ""}
              defaultPhone={profile?.phone || ""}
            />
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
