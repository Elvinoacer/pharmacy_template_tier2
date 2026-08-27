import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { getTenant } from "@/app/lib/tenant";
import { createRefillRequest } from "@/app/lib/services/crm";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot
    if (body.website) {
      return NextResponse.json({ ok: true });
    }

    // A refill is pharmacy-owned data. Do not let a direct API call create an
    // unscoped/ambiguous request. The Prisma tenant layer also stamps the
    // resolved pharmacyId on the record, so the client never chooses it.
    const tenant = await getTenant();
    if (!tenant.pharmacyId || tenant.bypass) {
      return NextResponse.json(
        { error: "Choose a pharmacy before submitting a refill request" },
        { status: 409 },
      );
    }

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const medicine = String(body.medicine || body.medicineName || "").trim();
    const pickupDate = String(body.pickupDate || body.preferredDate || "").trim();

    if (!fullName || !phone || !medicine || !pickupDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getSessionUser();

    await createRefillRequest({
      customerId: session?.customerId ?? null,
      medicineName: medicine,
      rxReference: String(body.rxNumber || body.rxReference || "") || undefined,
      customerName: fullName,
      phone,
      email: String(body.email || session?.email || "") || undefined,
      pickupPreference: body.delivery === "yes" || body.pickupPreference === "delivery" ? "delivery" : "pickup",
      preferredDate: pickupDate,
      preferredTime: String(body.preferredTime || "") || undefined,
      notes: String(body.notes || "") || undefined,
      source: session?.customerId ? "portal" : "website",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[refill]", err);
    return NextResponse.json({ error: "Could not submit refill request" }, { status: 500 });
  }
}
