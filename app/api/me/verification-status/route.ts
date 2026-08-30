import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";

/**
 * Returns pharmacies owned by the current user that are in a "decision"
 * status (approved / rejected / needs_info) so the public chrome can show
 * a one-time verification modal. Client marks each decision as seen via
 * localStorage; this endpoint only supplies the current server state.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    const pharmacies = await prismaUnscoped.pharmacy.findMany({
      where: {
        ownerUserId: user.id,
        status: { in: ["approved", "rejected", "needs_info"] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        verifiedAt: true,
        verificationNotes: true,
        rejectionReason: true,
        submittedAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    const data = pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status as "approved" | "rejected" | "needs_info",
      notes:
        p.status === "rejected"
          ? p.rejectionReason
          : p.verificationNotes,
      decidedAt: (p.verifiedAt ?? p.updatedAt).toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[verification-status]", err);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
