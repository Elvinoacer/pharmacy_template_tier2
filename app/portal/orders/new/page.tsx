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
    ? await prisma.pharmacyInventory.findFirst({
        where: { id: sp.medicationId, active: true, overTheCounter: true },
        include: { medicationMaster: { select: { name: true } } },
      })
    : sp.slug
      ? await prisma.pharmacyInventory.findFirst({
          where: { slug: sp.slug, active: true, overTheCounter: true },
          include: { medicationMaster: { select: { name: true } } },
        })
      : null;

  const otcMeds = await prisma.pharmacyInventory.findMany({
    where: { active: true, overTheCounter: true, currentStock: { gt: 0 } },
    include: { medicationMaster: { select: { name: true, description: true } } },
    orderBy: { medicationMaster: { name: "asc" } },
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
        <Link href="/medicines" className="btn-ghost w-full justify-center !py-2 text-xs sm:w-auto">
          <ArrowLeft className="h-3.5 w-3.5" /> Catalogue
        </Link>
      }
    >
      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
        <aside className="order-2 min-w-0 lg:order-1 lg:col-span-1">
          <Panel>
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">OTC only</p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--muted)]">
                  Prescription medicines must be requested as a refill. Only over-the-counter
                  products can be ordered here.
                </p>
              </div>
            </div>
            {med && (
              <div className="mt-4 min-w-0 rounded-xl bg-[var(--card-elev)] p-3 text-sm">
                <p className="break-words font-semibold text-[var(--foreground)]">{med.medicationMaster.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                  {formatPrice(Number(med.price))} · {med.currentStock} in stock
                </p>
              </div>
            )}
          </Panel>
        </aside>

        <div className="order-1 min-w-0 lg:order-2 lg:col-span-2">
          <Panel title="Place order" description="Select a product, quantity, and optional coupon">
            <PortalOrderForm
              medications={otcMeds.map((m) => ({
                id: m.id,
                name: m.medicationMaster.name,
                price: Number(m.price),
                stockQty: m.currentStock,
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
