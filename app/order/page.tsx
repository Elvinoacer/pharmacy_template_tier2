import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/app/components/PageHero";
import { GuestOrderForm } from "@/app/components/GuestOrderForm";
import { prisma } from "@/app/lib/db";
import { pharmacy } from "@/app/lib/data";
import { formatPrice } from "@/app/lib/format";
import { getSessionUser } from "@/app/lib/auth";
import { ShoppingBag, ShieldCheck, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Order OTC medication",
  description: `Reserve over-the-counter products from ${pharmacy.name} online — no account required. We'll confirm by phone.`,
  alternates: { canonical: "/order" },
};

export const dynamic = "force-dynamic";

export default async function GuestOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ medicationId?: string; slug?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionUser().catch(() => null);

  const preselected = sp.medicationId
    ? await prisma.pharmacyInventory.findFirst({
        where: {
          id: sp.medicationId,
          active: true,
          overTheCounter: true,
          publicListing: true,
        },
        include: { medicationMaster: { select: { name: true } } },
      })
    : sp.slug
      ? await prisma.pharmacyInventory.findFirst({
          where: {
            slug: sp.slug,
            active: true,
            overTheCounter: true,
            publicListing: true,
          },
          include: { medicationMaster: { select: { name: true } } },
        })
      : null;

  const otcMeds = await prisma.pharmacyInventory.findMany({
    where: {
      active: true,
      overTheCounter: true,
      publicListing: true,
      currentStock: { gt: 0 },
    },
    include: { medicationMaster: { select: { name: true } } },
    orderBy: { medicationMaster: { name: "asc" } },
    take: 100,
  });

  // Ensure preselected (even if 0 stock) appears in the list for messaging.
  const list = [...otcMeds];
  if (preselected && !list.some((m) => m.id === preselected.id)) {
    list.unshift(preselected);
  }

  return (
    <div>
      <PageHero
        eyebrow="OTC order"
        title="Reserve over-the-counter products"
        description="No account required. We hold stock, confirm by phone, and you pay on collection or delivery."
        crumbs={[{ label: "Order OTC" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <div>
                <h2
                  className="text-xl font-semibold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Place a guest order
                </h2>
                <p className="mt-1 text-sm text-[#5a6b62]">
                  OTC only — prescription medicines need a portal refill or in-store Rx.
                  {session?.customerId ? (
                    <>
                      {" "}
                      You&apos;re signed in — for M-Pesa pay use{" "}
                      <Link
                        href={`/portal/orders/new${preselected ? `?medicationId=${preselected.id}` : ""}`}
                        className="font-semibold text-teal-800 underline"
                      >
                        portal checkout
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            {preselected && (
              <div className="mb-5 rounded-xl bg-[#f4f7f4] p-3 text-sm">
                <p className="font-semibold text-[#0c1a14]">{preselected.medicationMaster.name}</p>
                <p className="mt-1 text-xs text-[#5a6b62]">
                  {formatPrice(Number(preselected.price))} · {preselected.currentStock} in stock
                </p>
              </div>
            )}

            <GuestOrderForm
              medications={list.map((m) => ({
                id: m.id,
                name: m.medicationMaster.name,
                price: Number(m.price),
                stockQty: m.currentStock,
                slug: m.slug,
              }))}
              defaultMedicationId={preselected?.id || sp.medicationId || ""}
            />
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h3
                className="flex items-center gap-2 text-lg font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                <ShieldCheck className="h-5 w-5 text-teal-700" /> How it works
              </h3>
              <ol className="mt-4 space-y-3 text-sm text-[#5a6b62]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    1
                  </span>
                  Choose an OTC product and quantity — we reserve live stock.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    2
                  </span>
                  Leave your name and phone. Staff get an instant alert.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                    3
                  </span>
                  We confirm availability, then you collect or receive delivery and pay.
                </li>
              </ol>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h3
                className="flex items-center gap-2 text-lg font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                <Clock className="h-5 w-5 text-teal-700" /> Prefer the full portal?
              </h3>
              <p className="mt-2 text-sm text-[#5a6b62]">
                Accounts unlock M-Pesa checkout, refill history, loyalty points, and adherence reminders.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/login" className="btn-primary !py-2 text-sm">
                  Sign in
                </Link>
                <Link href="/register" className="btn-ghost !py-2 text-sm">
                  Register
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
