import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/app/lib/auth";
import { createEnquiry } from "@/app/lib/services/crm";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.company) {
      return NextResponse.json({ ok: true });
    }

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !phone || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getSessionUser();

    await createEnquiry({
      name,
      phone,
      email,
      subject,
      message,
      type: "contact",
      customerId: session?.customerId ?? undefined,
      source: "website",
    });

    // Force the admin enquiries page to re-render so the new enquiry appears.
    revalidatePath("/admin/enquiries");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json({ error: "Could not submit enquiry" }, { status: 500 });
  }
}
