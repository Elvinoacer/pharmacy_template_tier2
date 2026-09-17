import { NextResponse } from "next/server";
import { createEnquiry } from "@/app/lib/services/crm";
import {
  findPharmacyBySlug,
  isActiveListed,
  withPharmacy,
} from "@/app/lib/tenant";
import { recordCareerApplication } from "@/app/lib/services/platform-careers";
import { storeCareerResume } from "@/app/lib/services/career-storage";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let name = "";
    let email = "";
    let phone = "";
    let role = "";
    let message: string | undefined;
    let experience: string | undefined;
    let cvFileName: string | undefined;
    let cvUrl: string | undefined;
    let pharmacySlug: string | undefined;
    let company: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      company = form.get("company")?.toString();
      if (company) {
        return NextResponse.json({ ok: true });
      }

      name = String(form.get("name") || "").trim();
      email = String(form.get("email") || "").trim();
      phone = String(form.get("phone") || "").trim();
      role = String(form.get("role") || "").trim();
      message = form.get("message") ? String(form.get("message")).trim() : undefined;
      experience = form.get("experience") ? String(form.get("experience")).trim() : undefined;
      pharmacySlug = form.get("pharmacySlug") ? String(form.get("pharmacySlug")).trim() : undefined;

      const file = form.get("cv");
      if (file instanceof File && file.size > 0) {
        const stored = await storeCareerResume(file);
        cvFileName = stored.cvFileName;
        cvUrl = stored.cvUrl;
      }
    } else {
      const body = await request.json();
      company = body.company;
      if (company) {
        return NextResponse.json({ ok: true });
      }

      name = String(body.name || "").trim();
      email = String(body.email || "").trim();
      phone = String(body.phone || "").trim();
      role = String(body.role || "").trim();
      message = body.message ? String(body.message).trim() : undefined;
      experience = body.experience ? String(body.experience).trim() : undefined;
      cvFileName = body.cvFileName ? String(body.cvFileName).trim() : undefined;
      cvUrl = body.cvUrl ? String(body.cvUrl).trim() : undefined;
      pharmacySlug = body.pharmacySlug ? String(body.pharmacySlug).trim() : undefined;
    }

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
      cvUrl,
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
              cvFileName ? `CV File: ${cvFileName}` : null,
              cvUrl ? `CV Download: ${cvUrl}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            source: "website",
          }),
        pharmacy.slug
      );
    }

    return NextResponse.json({ ok: true, cvUrl });
  } catch (err) {
    console.error("[careers]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not submit application" },
      { status: 500 }
    );
  }
}
