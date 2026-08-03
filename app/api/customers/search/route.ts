import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  q: z.string().trim().optional(),
  id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Search customers by name, email, or phone — used by the CustomerPicker
 * component to power a robust dropdown for staff selecting a customer.
 *
 * Security: only staff (or a customer looking themselves up by id) can call.
 * Customers are filtered to role=customer so staff/admins never appear in the list.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let parsed: z.infer<typeof Query>;
  try {
    const url = new URL(req.url);
    parsed = Query.parse({
      q: url.searchParams.get("q") || undefined,
      id: url.searchParams.get("id") || undefined,
      limit: url.searchParams.get("limit") || "20",
    });
  } catch {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  // Lookup by id — used by CustomerPicker to resolve the display name of a
  // pre-selected value. Allowed for both staff and the customer themselves.
  if (parsed.id) {
    const profile = await prisma.customerProfile.findUnique({
      where: { id: parsed.id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        user: { select: { email: true } },
        loyaltyAccount: { select: { points: true } },
      },
    });
    if (!profile) return NextResponse.json({ customer: null });
    if (!isStaff(user.role) && user.customerId !== parsed.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      customer: {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.user.email,
        phone: profile.phone,
        points: profile.loyaltyAccount?.points ?? undefined,
      },
    });
  }

  if (!isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const q = parsed.q?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ customers: [] });
  }

  // Filter: only customers (not staff/admins/etc).
  const where = {
    role: "customer" as const,
    status: "active" as const,
    OR: [
      { profile: { fullName: { contains: q, mode: "insensitive" as const } } },
      { email: { contains: q, mode: "insensitive" as const } },
      { profile: { phone: { contains: q, mode: "insensitive" as const } } },
    ],
  };

  const rows = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          loyaltyAccount: { select: { points: true } },
        },
      },
    },
    orderBy: { profile: { fullName: "asc" } },
    take: parsed.limit,
  });

  // Sort by first-letter match quality (starts-with first).
  const sorted = rows.sort((a, b) => {
    const an = a.profile?.fullName ?? "";
    const bn = b.profile?.fullName ?? "";
    const aStarts = an.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
    const bStarts = bn.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return an.localeCompare(bn);
  });

  return NextResponse.json({
    customers: sorted
      .filter((r) => r.profile)
      .map((r) => ({
        id: r.profile!.id,
        fullName: r.profile!.fullName,
        email: r.email,
        phone: r.profile!.phone,
        points: r.profile!.loyaltyAccount?.points ?? undefined,
      })),
  });
}
