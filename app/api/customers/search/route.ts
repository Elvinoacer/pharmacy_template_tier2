import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isStaff } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  q: z.string().trim().optional(),
  id: z.string().uuid().optional(),
  /// Comma-separated master IDs — resolve labels for AlternativeMedicationPicker.
  ids: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /// Optional resource selector — when `resource=medications`, this endpoint
  /// returns medications instead of customers. Used by MedicationPicker.
  resource: z.enum(["customers", "medications"]).default("customers"),
  /// When true (medications only), search/return MedicationMaster rows and
  /// use master IDs — used for alternative-medication linking.
  masters: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
  /// Optional master id to exclude from results (don't offer self as alternative).
  excludeMasterId: z.string().uuid().optional(),
});

type InventoryMedRow = {
  id: string;
  masterId: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  dosage: string | null;
  description: string | null;
};

function mapInventoryRow(m: {
  id: string;
  slug: string;
  sku: string | null;
  price: unknown;
  currentStock: number;
  lowStockThreshold: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  medicationMaster: {
    id: string;
    name: string;
    category: string;
    dosage: string | null;
    description: string | null;
  };
}): InventoryMedRow {
  return {
    id: m.id,
    masterId: m.medicationMaster.id,
    name: m.medicationMaster.name,
    slug: m.slug,
    sku: m.sku,
    category: m.medicationMaster.category,
    price: Number(m.price),
    stockQty: m.currentStock,
    lowStockThreshold: m.lowStockThreshold,
    overTheCounter: m.overTheCounter,
    prescriptionRequired: m.prescriptionRequired,
    dosage: m.medicationMaster.dosage,
    description: m.medicationMaster.description,
  };
}

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
      ids: url.searchParams.get("ids") || undefined,
      limit: url.searchParams.get("limit") || "20",
      resource: url.searchParams.get("resource") || "customers",
      masters: url.searchParams.get("masters") || undefined,
      excludeMasterId: url.searchParams.get("excludeMasterId") || undefined,
    });
  } catch {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  // ── Medication search ─────────────────────────────────────────
  // Used by MedicationPicker (prescription form) and AlternativeMedicationPicker.
  // Must run before the customer id-lookup so resource=medications&id=… works.
  if (parsed.resource === "medications") {
    if (!isStaff(user.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const masterInclude = {
      medicationMaster: {
        select: {
          id: true,
          name: true,
          category: true,
          dosage: true,
          description: true,
        },
      },
    } as const;

    // Bulk resolve master IDs → names (edit form defaults for alternatives).
    if (parsed.ids) {
      const masterIds = parsed.ids
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50);
      if (masterIds.length === 0) {
        return NextResponse.json({ medications: [] });
      }
      const masters = await prisma.medicationMaster.findMany({
        where: { id: { in: masterIds } },
        select: {
          id: true,
          name: true,
          category: true,
          genericName: true,
          brandName: true,
          strengthDisplay: true,
        },
      });
      // Preserve request order so chips match the saved list.
      const byId = new Map(masters.map((m) => [m.id, m]));
      return NextResponse.json({
        medications: masterIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((m) => ({
            id: m!.id,
            masterId: m!.id,
            name: m!.name,
            category: m!.category,
            genericName: m!.genericName,
            brandName: m!.brandName,
            strengthDisplay: m!.strengthDisplay,
          })),
      });
    }

    // Single id lookup — inventory id (default) or master id (masters=1).
    if (parsed.id) {
      if (parsed.masters) {
        const master = await prisma.medicationMaster.findUnique({
          where: { id: parsed.id },
          select: {
            id: true,
            name: true,
            category: true,
            genericName: true,
            brandName: true,
            strengthDisplay: true,
            dosage: true,
            description: true,
          },
        });
        if (!master) return NextResponse.json({ medication: null });
        return NextResponse.json({
          medication: {
            id: master.id,
            masterId: master.id,
            name: master.name,
            category: master.category,
            genericName: master.genericName,
            brandName: master.brandName,
            strengthDisplay: master.strengthDisplay,
            dosage: master.dosage,
            description: master.description,
          },
        });
      }

      const m = await prisma.pharmacyInventory.findUnique({
        where: { id: parsed.id },
        include: masterInclude,
      });
      if (!m) return NextResponse.json({ medication: null });
      return NextResponse.json({ medication: mapInventoryRow(m) });
    }

    // Master-level search for alternative linking (name / generic / brand / category).
    if (parsed.masters) {
      const q = parsed.q?.trim() ?? "";
      const where =
        q.length < 1
          ? {
              ...(parsed.excludeMasterId ? { id: { not: parsed.excludeMasterId } } : {}),
            }
          : {
              ...(parsed.excludeMasterId ? { id: { not: parsed.excludeMasterId } } : {}),
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { genericName: { contains: q, mode: "insensitive" as const } },
                { brandName: { contains: q, mode: "insensitive" as const } },
                { category: { contains: q, mode: "insensitive" as const } },
                { barcode: { contains: q, mode: "insensitive" as const } },
              ],
            };

      const rows = await prisma.medicationMaster.findMany({
        where,
        select: {
          id: true,
          name: true,
          category: true,
          genericName: true,
          brandName: true,
          strengthDisplay: true,
          dosage: true,
          description: true,
        },
        orderBy: { name: "asc" },
        take: parsed.limit,
      });

      const sorted =
        q.length < 1
          ? rows
          : rows.sort((a, b) => {
              const aStarts = a.name.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
              const bStarts = b.name.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
              if (aStarts !== bStarts) return aStarts - bStarts;
              return a.name.localeCompare(b.name);
            });

      return NextResponse.json({
        medications: sorted.map((m) => ({
          id: m.id,
          masterId: m.id,
          name: m.name,
          category: m.category,
          genericName: m.genericName,
          brandName: m.brandName,
          strengthDisplay: m.strengthDisplay,
          dosage: m.dosage,
          description: m.description,
        })),
      });
    }

    const q = parsed.q?.trim() ?? "";
    // Empty query: return initial alphabetical page so the dropdown is useful on open.
    const where =
      q.length < 1
        ? { active: true }
        : {
            active: true,
            OR: [
              { sku: { contains: q, mode: "insensitive" as const } },
              {
                medicationMaster: {
                  OR: [
                    { name: { contains: q, mode: "insensitive" as const } },
                    { description: { contains: q, mode: "insensitive" as const } },
                    { category: { contains: q, mode: "insensitive" as const } },
                  ],
                },
              },
            ],
          };

    const rows = await prisma.pharmacyInventory.findMany({
      where,
      include: masterInclude,
      orderBy: { medicationMaster: { name: "asc" } },
      take: parsed.limit,
    });

    const sorted =
      q.length < 1
        ? rows
        : rows.sort((a, b) => {
            const an = a.medicationMaster.name;
            const bn = b.medicationMaster.name;
            const aStarts = an.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
            const bStarts = bn.toLowerCase().startsWith(q.toLowerCase()) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            return an.localeCompare(bn);
          });

    return NextResponse.json({
      medications: sorted.map(mapInventoryRow),
    });
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
        loyaltyAccounts: { take: 1, select: { points: true } },
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
        points: profile.loyaltyAccounts?.[0]?.points ?? undefined,
      },
    });
  }

  if (!isStaff(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const q = parsed.q?.trim() ?? "";
  // Empty query: initial alphabetical page so the picker is useful on open.
  const where = q.length < 1
    ? {
        role: "customer" as const,
        status: "active" as const,
        profile: { isNot: null },
      }
    : {
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
          loyaltyAccounts: { take: 1, select: { points: true } },
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
        points: r.profile!.loyaltyAccounts?.[0]?.points ?? undefined,
      })),
  });
}
