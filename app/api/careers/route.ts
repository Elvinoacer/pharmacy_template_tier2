import { NextResponse } from "next/server";
import { createEnquiry } from "@/app/lib/services/crm";
import {
  findPharmacyBySlug,
  isActiveListed,
  withPharmacy,
} from "@/app/lib/tenant";
import { recordCareerApplication } from "@/app/lib/services/platform-careers";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.company) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const role = String(body.role || "").trim();
    const message = body.message ? String(body.message).trim() : undefined;
    const experience = body.experience ? String(body.experience).trim() : undefined;
    const cvFileName = body.cvFileName ? String(body.cvFileName).trim() : undefined;
    const pharmacySlug = body.pharmacySlug ? String(body.pharmacySlug).trim() : undefined;

    if (!name || !email || !phone || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pharmacy =
      pharmacySlug
        ? await findPharmacyBySlug(pharmacySlug)
        : null;
    if (pharmacySlug && (!pharmacy || !isActiveListed(pharmacy))) {
      return NextResponse.json(
        { error: "This pharmacy is unavailable." },
        { status: 409 },
      );
    }

    // Always record application in platform database
    await recordCareerApplication({
      role,
      name,
      email,
      phone,
      message,
      experience,
      cvFileName,
      pharmacySlug: pharmacy?.slug ?? undefined,
    });

    // If assigned to a pharmacy, also record as a pharmacy CRM enquiry
    if (pharmacy) {
      await withPharmacy(
        pharmacy.id,
        () =>
          createEnquiry({
            name,
            email,
            phone,
            type: "careers",
            subject: `Career application — ${role}`,
            message: [
              `Role: ${role}`,
              message ? `Cover note: ${message}` : null,
              experience ? `Experience: ${experience}` : null,
              cvFileName ? `CV: ${cvFileName}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            source: "website",
          }),
        pharmacy.slug
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[careers]", err);
    return NextResponse.json({ error: "Could not submit application" }, { status: 500 });
  }
}
