import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { createEnquiry } from "@/app/lib/services/crm";
import {
  findPharmacyBySlug,
  isActiveListed,
  withPharmacy,
} from "@/app/lib/tenant";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.fax) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const area = String(body.area || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !phone || !area || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pharmacy =
      typeof body.pharmacySlug === "string"
        ? await findPharmacyBySlug(body.pharmacySlug)
        : null;
    if (!pharmacy || !isActiveListed(pharmacy)) {
      return NextResponse.json(
        { error: "Please select an active pharmacy branch for delivery." },
        { status: 400 },
      );
    }

    await withPharmacy(pharmacy.id, async () => {
      const session = await getSessionUser();
      await createEnquiry({
        name,
        phone,
        email: String(body.email || "") || undefined,
        type: "delivery",
        subject: `Delivery enquiry — ${area}`,
        message: `Area: ${area}\n\n${message}`,
        customerId: session?.customerId ?? undefined,
        source: "website",
      });
    }, pharmacy.slug);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[delivery]", err);
    return NextResponse.json({ error: "Could not submit delivery enquiry" }, { status: 500 });
  }
}
